#!/usr/bin/env python3
"""
Backfill releases.json for projects that use git tags instead of GitHub Releases.
Run once after upgrading extract_github_data.py with the tag fallback.

Works without a GitHub token (uses unauthenticated REST API, 60 req/hr limit).
Pass GITHUB_TOKEN to raise the limit to 5000 req/hr.

Usage:
    python3 scripts/backfill_tag_releases.py
    GITHUB_TOKEN=<token> python3 scripts/backfill_tag_releases.py
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

# Projects to backfill: (owner, repo, data_dir, stable_tag_pattern)
PROJECTS = [
    ("apache",   "camel",            "apache-camel",   r"^camel-\d+\.\d+\.\d+$"),
    ("apache",   "activemq-artemis", "apache-artemis", r"^\d+\.\d+\.\d+$"),
    ("debezium", "debezium",         "debezium",       r"^v\d+\.\d+\.\d+\.Final$"),
    ("apache",   "tomcat",           "tomcat",         r"^\d+\.\d+\.\d+$"),
]

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")


def gh_get(url):
    """GET a GitHub API URL, return parsed JSON. Raises on HTTP errors."""
    headers = {"Accept": "application/vnd.github.v3+json",
               "User-Agent": "oss-dashboard-backfill"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.load(resp)


def fetch_stable_tags(owner, repo, pattern, max_stable=20):
    """
    Page through /repos/{owner}/{repo}/tags until we have max_stable stable ones.
    Returns list of dicts with tag_name and published_at.
    """
    results = []
    page = 1
    seen_pages = 0
    while len(results) < max_stable and seen_pages < 10:
        url = f"https://api.github.com/repos/{owner}/{repo}/tags?per_page=100&page={page}"
        try:
            tags = gh_get(url)
        except urllib.error.HTTPError as e:
            print(f"  ⚠️  HTTP {e.code} fetching tags page {page}: {e}")
            break
        if not tags:
            break
        seen_pages += 1
        page += 1
        for tag in tags:
            if len(results) >= max_stable:
                break
            if not re.match(pattern, tag["name"]):
                continue
            # Fetch commit date — each tag points to a commit SHA
            sha = tag["commit"]["sha"]
            commit_url = f"https://api.github.com/repos/{owner}/{repo}/commits/{sha}"
            try:
                commit = gh_get(commit_url)
                date_str = commit["commit"]["committer"]["date"]
                published_at = date_str
            except Exception as e:
                print(f"  ⚠️  Could not fetch commit date for {tag['name']}: {e}")
                published_at = None
            results.append({
                "tag_name": tag["name"],
                "name": tag["name"],
                "published_at": published_at,
                "prerelease": False,
                "draft": False,
            })
            # Small delay to avoid hammering unauthenticated rate limit
            if not GITHUB_TOKEN:
                time.sleep(0.5)
    return results


def cadence_and_frequency(release_list):
    dates = []
    for r in release_list:
        if r.get("published_at"):
            try:
                dates.append(datetime.fromisoformat(
                    r["published_at"].replace("+00:00", "").replace("Z", "")
                ))
            except ValueError:
                pass
    if len(dates) < 2:
        return None, None
    sorted_dates = sorted(dates, reverse=True)
    gaps = [(sorted_dates[i] - sorted_dates[i + 1]).days for i in range(len(sorted_dates) - 1)]
    avg = sum(gaps) / len(gaps)
    freq = "high" if avg <= 30 else "medium" if avg <= 90 else "low"
    return round(avg, 2), freq


def main():
    if not GITHUB_TOKEN:
        print("ℹ️  No GITHUB_TOKEN set — using unauthenticated API (60 req/hr). Pass token to go faster.")

    for owner, repo, data_dir, pattern in PROJECTS:
        print(f"\n{'='*55}")
        print(f"Backfilling {owner}/{repo}  →  data/{data_dir}/releases.json")
        try:
            release_list = fetch_stable_tags(owner, repo, pattern)
            avg_days, frequency = cadence_and_frequency(release_list)
            out = {
                "total_releases": len(release_list),
                "recent_releases": release_list,
                "avg_days_between_releases": avg_days,
                "release_frequency": frequency,
                "extracted_at": datetime.now().isoformat(),
            }
            out_path = DATA_DIR / data_dir / "releases.json"
            out_path.parent.mkdir(parents=True, exist_ok=True)
            with open(out_path, "w") as f:
                json.dump(out, f, indent=2)
            print(f"  ✓ {len(release_list)} releases, avg {avg_days} days, frequency={frequency}")
            print(f"  Saved → {out_path}")
        except Exception as e:
            print(f"  ❌ Error: {e}")

    print("\n✅ Backfill complete.")


if __name__ == "__main__":
    main()
