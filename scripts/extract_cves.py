#!/usr/bin/env python3
"""
CVE Data Extraction Script

Fetches CVE data for each project:
- Projects with GitHub security advisories in their own repo: uses the GitHub
  Security Advisories REST API.
- Projects without repo advisories: falls back to the GitHub Advisory Database
  via OSV.dev (https://osv.dev/), which is fully public and rate-limit-free.

Output: data/<project-dir>/cve.json

Usage:
    python3 extract_cves.py              # update all projects
    python3 extract_cves.py Keycloak     # update a single project by name
"""
import json
import sys
import time
import collections
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_DIR = Path(__file__).parent.parent / "data"
CURRENT_YEAR = str(datetime.now().year)

GH_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "oss-dashboard-cve",
}

# Per-project OSV package overrides.
# Keys are the project "name" field (lowercase) from projects.json.
# Projects NOT listed here default to "github_repo" strategy using their owner/repo.
OSV_OVERRIDES: Dict[str, List] = {
    "apache camel": [
        ("org.apache.camel:camel-core", "Maven"),
        ("org.apache.camel:camel-http", "Maven"),
        ("org.apache.camel:camel-sql", "Maven"),
        ("org.apache.camel:camel-ldap", "Maven"),
        ("org.apache.camel:camel-xstream", "Maven"),
        ("org.apache.camel:camel-netty", "Maven"),
    ],
    "apache artemis": [
        ("org.apache.activemq:artemis-core-client", "Maven"),
        ("org.apache.activemq:artemis-server", "Maven"),
        ("org.apache.activemq:activemq-all", "Maven"),
        ("org.apache.activemq:activemq-broker", "Maven"),
        ("org.apache.activemq:activemq-client", "Maven"),
    ],
    "apicurio registry": [
        ("io.apicurio:apicurio-registry-rest-client", "Maven"),
        ("io.apicurio:apicurio-registry", "Maven"),
    ],
    "3scale": [
        ("github.com/3scale/3scale-operator", "Go"),
    ],
}


def _load_projects_from_json() -> List[Dict]:
    """Load projects from data/projects.json and map to CVE extraction config."""
    projects_file = DATA_DIR / "projects.json"
    if not projects_file.exists():
        print(f"❌ projects.json not found at {projects_file}")
        return []

    with open(projects_file) as f:
        root = json.load(f)

    result = []
    for p in root.get("projects", []):
        if not p.get("enabled", True):
            continue
        name = p.get("name", "")
        owner = p.get("owner", "")
        repo = p.get("repo", "")
        project_id = p.get("id", repo)

        if not owner or not repo:
            continue

        # Directory name: derive the same way DataService.getProjectDirectoryName does
        dir_name = _project_dir(project_id, name)

        osv_packages = OSV_OVERRIDES.get(name.lower())
        result.append({
            "name": name,
            "dir": dir_name,
            "strategy": "github_repo",
            "owner": owner,
            "repo": repo,
            "packages": osv_packages,
        })

    return result


def _project_dir(project_id: str, name: str) -> str:
    """Mirror DataService.deriveDataDir logic."""
    mapping = {
        "strimzi-kafka-operator": "strimzi",
        "camel":                  "apache-camel",
        "artemis":                "apache-artemis",
        "apicurio-studio":        "apicurio",
        "apicurio-registry":      "apicurio",
        "console":                "streamshub",
    }
    return mapping.get(project_id, project_id.lower().replace("_", "-"))


# ── helpers ──────────────────────────────────────────────────────────────────

def _gh_fetch_all(url: str) -> List[Dict]:
    results = []
    page = 1
    while True:
        req = urllib.request.Request(url + f"&page={page}", headers=GH_HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
                if not data:
                    break
                results.extend(data)
                if len(data) < 100:
                    break
                page += 1
        except urllib.error.HTTPError as e:
            print(f"  GitHub API HTTP {e.code} — stopping pagination")
            break
        except Exception as e:
            print(f"  GitHub API error: {e}")
            break
        time.sleep(1.2)
    return results


def _osv_query(package: str, ecosystem: str) -> List[Dict]:
    url = "https://api.osv.dev/v1/query"
    payload = json.dumps({"package": {"name": package, "ecosystem": ecosystem}}).encode()
    req = urllib.request.Request(
        url, data=payload, method="POST",
        headers={"Content-Type": "application/json", "User-Agent": "oss-dashboard"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read()).get("vulns", [])
    except Exception as e:
        print(f"  OSV error [{ecosystem}:{package}]: {e}")
        return []


def _normalize_github(advisories: List[Dict]) -> List[Dict]:
    return [
        {
            "id": a.get("cve_id") or a.get("ghsa_id", ""),
            "severity": a.get("severity", "unknown"),
            "summary": a.get("summary", ""),
            "published": (a.get("published_at") or "")[:10],
        }
        for a in advisories
        if a.get("published_at")
    ]


def _normalize_osv(vulns: List[Dict]) -> List[Dict]:
    out = []
    for v in vulns:
        pub = (v.get("published") or v.get("modified") or "")[:10]
        if not pub:
            continue
        cve_id = next((a for a in v.get("aliases", []) if a.startswith("CVE-")), None) or v["id"]
        severity = v.get("database_specific", {}).get("severity", "unknown").lower()
        out.append({
            "id": cve_id,
            "severity": severity,
            "summary": v.get("summary", ""),
            "published": pub,
        })
    return out


def _build_cve_json(entries: List[Dict], source: str) -> Dict[str, Any]:
    """Deduplicate, bucket by month/year, and return the cve.json structure."""
    seen_ids: set = set()
    by_month: Dict[str, List] = collections.defaultdict(list)

    for e in entries:
        eid = e.get("id", "")
        pub = e.get("published", "")[:10]
        if not eid or not pub or eid in seen_ids:
            continue
        seen_ids.add(eid)
        by_month[pub[:7]].append({
            "id": eid,
            "severity": e.get("severity", "unknown"),
            "summary": (e.get("summary") or "")[:120],
            "published": pub,
        })

    months = [
        {"month": m, "count": len(cves), "cves": cves}
        for m, cves in sorted(by_month.items())
    ]

    by_year: Dict[str, int] = collections.defaultdict(int)
    for m in months:
        by_year[m["month"][:4]] += m["count"]

    years = [
        {"year": yr, "count": cnt, "is_current": yr == CURRENT_YEAR}
        for yr, cnt in sorted(by_year.items())
    ]

    return {
        "source": source,
        "total_cves": sum(m["count"] for m in months),
        "months": months,
        "years": years,
        "extracted_at": datetime.now().isoformat(),
    }


def _write(dir_name: str, data: Dict[str, Any]) -> None:
    path = DATA_DIR / dir_name / "cve.json"
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  ✅ {dir_name}/cve.json — {data['total_cves']} CVEs")


# ── per-project extraction ───────────────────────────────────────────────────

def extract_github_repo(project: Dict) -> Dict[str, Any]:
    owner, repo = project["owner"], project["repo"]
    print(f"  Fetching GitHub security advisories for {owner}/{repo}...")
    url = (
        f"https://api.github.com/repos/{owner}/{repo}"
        f"/security-advisories?per_page=100&state=published"
    )
    advisories = _gh_fetch_all(url)
    print(f"  Found {len(advisories)} advisories")
    entries = _normalize_github(advisories)
    if entries:
        return _build_cve_json(entries, "github_security_advisories")

    packages = project.get("packages")
    if not packages:
        packages = [(f"github.com/{owner}/{repo}", "Go")]

    print("  No repo advisories found; falling back to OSV...")
    return extract_osv({
        "name": project["name"],
        "packages": packages,
    })


def extract_osv(project: Dict) -> Dict[str, Any]:
    all_entries: List[Dict] = []
    seen_ids: set = set()
    for package, ecosystem in project["packages"]:
        print(f"  Querying OSV [{ecosystem}:{package}]...")
        vulns = _osv_query(package, ecosystem)
        normalized = _normalize_osv(vulns)
        new = [e for e in normalized if e["id"] not in seen_ids]
        seen_ids.update(e["id"] for e in new)
        all_entries.extend(new)
        if new:
            print(f"    +{len(new)} unique vulns")
        time.sleep(0.4)
    return _build_cve_json(all_entries, "github_advisory_database")


# ── main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    filter_name: Optional[str] = sys.argv[1].lower() if len(sys.argv) > 1 else None

    projects = _load_projects_from_json()
    if not projects:
        print("❌ No projects loaded from projects.json")
        sys.exit(1)

    if filter_name:
        projects = [p for p in projects if filter_name in p["name"].lower()]
        if not projects:
            print(f"❌ No project matching '{sys.argv[1]}'")
            sys.exit(1)

    print(f"Extracting CVE data for {len(projects)} project(s)...\n")

    for project in projects:
        print(f"[{project['name']}]")
        try:
            data = extract_github_repo(project)
            _write(project["dir"], data)
        except Exception as e:
            print(f"  ❌ Error: {e}")
        print()

    print("Done.")


if __name__ == "__main__":
    main()

# Made with Bob
