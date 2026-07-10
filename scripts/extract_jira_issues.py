#!/usr/bin/env python3
"""
Extract Jira issue metrics for projects that do not use GitHub issues.

This script fetches Jira issues via the public Jira REST API, normalizes them,
aggregates them into the dashboard issues.json schema, and writes the result
into the project's data directory.

Usage: python3 extract_jira_issues.py <project_name>
Example: python3 extract_jira_issues.py "Apache Artemis"
"""

import json
import statistics
import sys
import yaml
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, TypedDict

import requests


class MonthBucket(TypedDict):
    issue_count: int
    closed_issue_count: int
    resolution_times: List[float]


class YearBucket(TypedDict):
    issue_count: int
    closed_issue_count: int


# Keys are config 'name' values — must match extract_github_data.py _project_dir()
DIR_NAME_MAP = {
    "Strimzi": "strimzi",
    "Apache Camel": "apache-camel",
    "Apache Artemis": "apache-artemis",
    "Apicurio Registry": "apicurio",
    "3scale": "3scale",
    "Keycloak": "keycloak",
    "StreamsHub": "streamshub",
    # legacy repo-name keys for backward compatibility
    "strimzi-kafka-operator": "strimzi",
    "camel": "apache-camel",
    "artemis": "apache-artemis",
    "apicurio-registry": "apicurio",
    "3scale-operator": "3scale",
    "console": "streamshub",
}


def project_dir_name(project_name: str) -> str:
    return DIR_NAME_MAP.get(project_name, project_name.lower().replace(" ", "-"))


def load_config() -> Dict[str, Any]:
    config_file = Path(__file__).parent / "config.yaml"
    with open(config_file, "r") as f:
        return yaml.safe_load(f)


def find_project(project_identifier: str, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Find a project by name (case-insensitive) from config.yaml."""
    for project in config.get("projects", []):
        if project["name"].lower() == project_identifier.lower():
            return project
    return None


def parse_jira_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None

    normalized = value.strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"

    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        pass

    for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            return datetime.strptime(normalized, fmt)
        except ValueError:
            continue

    return None


def month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1)
    if month == 12:
        next_month = datetime(year + 1, 1, 1)
    else:
        next_month = datetime(year, month + 1, 1)
    end = next_month - timedelta(seconds=1)
    return start, end


def get_last_12_month_labels() -> List[str]:
    now = datetime.now()
    labels = []
    year = now.year
    month = now.month

    for _ in range(12):
        labels.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            month = 12
            year -= 1

    labels.reverse()
    return labels


def aggregate_issue_metrics(normalized_issues: List[Dict[str, Any]]) -> Dict[str, Any]:
    month_data: defaultdict[str, MonthBucket] = defaultdict(
        lambda: {"issue_count": 0, "closed_issue_count": 0, "resolution_times": []}
    )
    year_data: defaultdict[int, YearBucket] = defaultdict(
        lambda: {"issue_count": 0, "closed_issue_count": 0}
    )

    total_open = 0
    total_closed = 0
    earliest_issue_year = None
    all_resolution_times: List[float] = []

    for issue in normalized_issues:
        created_at = issue["created_at"]
        closed_at = issue.get("closed_at")
        created_month = created_at.strftime("%Y-%m")
        created_year = created_at.year

        if earliest_issue_year is None or created_year < earliest_issue_year:
            earliest_issue_year = created_year

        month_data[created_month]["issue_count"] += 1
        year_data[created_year]["issue_count"] += 1

        if closed_at:
            total_closed += 1
            month_data[created_month]["closed_issue_count"] += 1
            year_data[created_year]["closed_issue_count"] += 1
            resolution_days = round((closed_at - created_at).total_seconds() / 86400, 2)
            month_data[created_month]["resolution_times"].append(resolution_days)
            all_resolution_times.append(resolution_days)
        else:
            total_open += 1

    months = []
    for month_label in get_last_12_month_labels():
        year, month = month_label.split("-")
        start_date, end_date = month_bounds(int(year), int(month))
        bucket = month_data[month_label]
        month_info = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "issue_count": bucket["issue_count"],
            "closed_issue_count": bucket["closed_issue_count"],
            "month": month_label,
        }
        if bucket["resolution_times"]:
            month_info["median_resolution_time_days"] = round(statistics.median(bucket["resolution_times"]), 2)
        months.append(month_info)

    years = []
    if earliest_issue_year is not None:
        current_year = datetime.now().year
        for year in range(earliest_issue_year, current_year + 1):
            years.append(
                {
                    "year": year,
                    "issue_count": year_data[year]["issue_count"],
                    "closed_issue_count": year_data[year]["closed_issue_count"],
                }
            )

    median_resolution = None
    if all_resolution_times:
        median_resolution = round(statistics.median(all_resolution_times), 2)

    return {
        "total_open": total_open,
        "total_closed": total_closed,
        "total_issues": total_open + total_closed,
        "median_resolution_time_days": median_resolution,
        "months": months,
        "years": years,
        "extracted_at": datetime.now().isoformat(),
    }


def _fetch_jira_issues_v2(session: requests.Session, base: str, project_key: str) -> List[Dict[str, Any]]:
    """Fetch using the classic offset-based REST API v2 (Apache Jira, self-hosted)."""
    issues: List[Dict[str, Any]] = []
    start_at = 0
    max_results = 100
    jql = f"project = {project_key} ORDER BY created ASC"

    while True:
        response = session.get(
            f"{base}/rest/api/2/search",
            params={
                "jql": jql,
                "startAt": start_at,
                "maxResults": max_results,
                "fields": "created,resolutiondate,status",
            },
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()

        batch = payload.get("issues", [])
        issues.extend(batch)

        total = payload.get("total", len(issues))
        print(f"  ✓ Retrieved {len(issues)}/{total} issues")

        start_at += len(batch)
        if not batch or start_at >= total:
            break

    return issues


def _fetch_jira_issues_v3(session: requests.Session, base: str, project_key: str) -> List[Dict[str, Any]]:
    """Fetch using the cursor-based REST API v3 (Atlassian Cloud / issues.redhat.com)."""
    issues: List[Dict[str, Any]] = []
    jql = f"project = {project_key} ORDER BY created ASC"
    next_page_token: Optional[str] = None
    max_results = 100

    while True:
        params: Dict[str, Any] = {
            "jql": jql,
            "maxResults": max_results,
            "fields": "created,resolutiondate,status",
        }
        if next_page_token:
            params["nextPageToken"] = next_page_token

        response = session.get(
            f"{base}/rest/api/3/search/jql",
            params=params,
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()

        batch = payload.get("issues", [])
        issues.extend(batch)
        print(f"  ✓ Retrieved {len(issues)} issues so far")

        if payload.get("isLast", True) or not batch:
            break
        next_page_token = payload.get("nextPageToken")
        if not next_page_token:
            break

    return issues


def fetch_jira_issues(base_url: str, project_key: str) -> List[Dict[str, Any]]:
    base = base_url.rstrip("/")
    session = requests.Session()
    jql = f"project = {project_key} ORDER BY created ASC"

    print(f"📥 Fetching Jira issues for project {project_key} from {base_url}...")

    # Probe v2 first; if it returns 410 (removed) fall back to v3.
    probe = session.get(
        f"{base}/rest/api/2/search",
        params={"jql": jql, "maxResults": 1, "fields": "created"},
        timeout=30,
    )
    if probe.status_code == 410:
        print("  ℹ️  REST API v2 has been removed on this instance; switching to v3...")
        return _fetch_jira_issues_v3(session, base, project_key)

    probe.raise_for_status()
    return _fetch_jira_issues_v2(session, base, project_key)


def normalize_jira_issues(raw_issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized = []

    for issue in raw_issues:
        fields = issue.get("fields", {})
        created_at = parse_jira_datetime(fields.get("created"))
        if not created_at:
            continue

        closed_at = parse_jira_datetime(fields.get("resolutiondate"))
        normalized.append(
            {
                "key": issue.get("key"),
                "created_at": created_at.replace(tzinfo=None) if created_at.tzinfo else created_at,
                "closed_at": closed_at.replace(tzinfo=None) if closed_at and closed_at.tzinfo else closed_at,
                "state": "closed" if closed_at else "open",
            }
        )

    return normalized


def save_issue_data(project_name: str, issue_data: Dict[str, Any]) -> Path:
    data_dir = Path(__file__).parent.parent / "data"
    project_dir = data_dir / project_dir_name(project_name)
    project_dir.mkdir(parents=True, exist_ok=True)
    output_file = project_dir / "issues.json"

    with open(output_file, "w") as f:
        json.dump(issue_data, f, indent=2)

    return output_file


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 extract_jira_issues.py <project_name>")
        print('Example: python3 extract_jira_issues.py "Apache Artemis"')
        sys.exit(1)

    project_identifier = sys.argv[1]
    config = load_config()
    project = find_project(project_identifier, config)

    if not project:
        print(f"❌ Project '{project_identifier}' not found in config.yaml")
        print("\nAvailable projects:")
        for p in config.get("projects", []):
            print(f"  - {p['name']}")
        sys.exit(1)

    if project.get("issue_source") != "jira":
        print(f"❌ Project '{project['name']}' is not configured for Jira issue extraction")
        print(f"   Set 'issue_source: jira' and 'jira_project_key' in config.yaml")
        sys.exit(1)

    jira_project_key = project.get("jira_project_key")
    jira_base_url = project.get("jira_base_url", "https://issues.apache.org/jira")

    if not jira_project_key:
        print(f"❌ Project '{project['name']}' is missing jira_project_key in config.yaml")
        sys.exit(1)

    raw_issues = fetch_jira_issues(jira_base_url, jira_project_key)
    normalized_issues = normalize_jira_issues(raw_issues)
    issue_data = aggregate_issue_metrics(normalized_issues)
    output_file = save_issue_data(project["name"], issue_data)

    print(f"\n✅ Saved Jira issue data to {output_file}")
    print(
        f"📈 Total: {issue_data['total_issues']} issues "
        f"({issue_data['total_open']} open, {issue_data['total_closed']} closed)"
    )
    if issue_data["median_resolution_time_days"] is not None:
        print(f"⏱️  Median resolution time: {issue_data['median_resolution_time_days']} days")


if __name__ == "__main__":
    main()

# Made with Bob
