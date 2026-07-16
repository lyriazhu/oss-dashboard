#!/usr/bin/env python3
"""
Extract data for a single project from config.yaml.
Usage: python3 extract_single_project.py <project_name_or_repo>
"""

import json
import sys
import subprocess
import time
from datetime import datetime
from pathlib import Path

from extract_github_data import GitHubDataExtractor
from github import GithubException


def extract_one_repo(extractor, owner, repo, project_name, project):
    """Run the full extraction pipeline for a single owner/repo pair.

    This is the same logic that was previously inlined in main() for single-repo
    projects.  It is now a function so that the org-level path can call it once
    per repo returned by the GitHub API.
    """
    repos = [{'owner': owner, 'repo': repo}]

    print(f"\n{'='*60}")
    print(f"Processing: {project_name}  ({owner}/{repo})")
    print(f"{'='*60}\n")

    extraction_status = {
        "metadata": False,
        "contributors": False,
        "commits": False,
        "issues": False,
        "pull_requests": False,
        "releases": False,
        "adopters": False,
    }

    # Metadata
    project_created_at = None
    try:
        metadata = extractor.extract_project_metadata(owner, repo, project_name=project_name)
        if metadata:
            extractor.save_project_data(project_name, metadata, "metadata", repo=repo)
            extraction_status["metadata"] = True
            project_created_at = datetime.fromisoformat(metadata['created_at'].replace('+00:00', ''))
    except Exception as e:
        print(f"⚠️  Warning: Metadata extraction failed: {e}")

    # Contributors (includes quarterly + yearly retention)
    try:
        contributors = extractor.extract_contributors(owner, repo, project_name)
        if contributors:
            extractor.save_project_data(project_name, contributors, "contributors", repo=repo)
            extraction_status["contributors"] = True
            extractor.refresh_metadata_companies(project_name, repo=repo)
    except Exception as e:
        print(f"⚠️  Warning: Contributors extraction failed: {e}")

    # Commits
    try:
        commits = extractor.extract_commits(owner, repo, project_name)
        if commits:
            extractor.save_project_data(project_name, commits, "commits", repo=repo)
            extraction_status["commits"] = True
    except Exception as e:
        print(f"⚠️  Warning: Commits extraction failed: {e}")

    # Issues — route to jira or github (optionally from a dedicated issue repo)
    issue_source = project.get('issue_source', 'github')
    issue_repos = repos
    if project.get('issue_owner') and project.get('issue_repo'):
        issue_repos = [{'owner': project['issue_owner'], 'repo': project['issue_repo']}]

    if issue_source == 'jira':
        try:
            jira_script = Path(__file__).parent / "extract_jira_issues.py"
            jira_result = subprocess.run(
                [sys.executable, str(jira_script), project_name],
                cwd=str(Path(__file__).parent),
                check=False,
            )
            if jira_result.returncode == 0:
                extraction_status["issues"] = True
            else:
                print(f"⚠️  Warning: Jira issues extraction failed with exit code {jira_result.returncode}")
        except Exception as e:
            print(f"⚠️  Warning: Jira issues extraction failed: {e}")
    else:
        try:
            if project_created_at:
                issues = extractor.extract_issues(issue_repos, project_created_at, project_name)
                if issues:
                    extractor.save_project_data(project_name, issues, "issues", repo=repo)
                    extraction_status["issues"] = True
            else:
                print(f"⚠️  Warning: Cannot extract issues - metadata not available")
        except Exception as e:
            print(f"⚠️  Warning: Issues extraction failed: {e}")

    # Pull Requests
    try:
        if project_created_at:
            pull_requests = extractor.extract_pull_requests(repos, project_created_at, project_name)
            if pull_requests:
                extractor.save_project_data(project_name, pull_requests, "pull_requests", repo=repo)
                extraction_status["pull_requests"] = True
        else:
            print(f"⚠️  Warning: Cannot extract pull requests - metadata not available")
    except Exception as e:
        print(f"⚠️  Warning: Pull requests extraction failed: {e}")

    # Releases
    try:
        releases = extractor.extract_releases(owner, repo, project_name)
        if releases:
            extractor.save_project_data(project_name, releases, "releases", repo=repo)
            extraction_status["releases"] = True
    except Exception as e:
        print(f"⚠️  Warning: Releases extraction failed: {e}")

    # Adopters
    try:
        adopters = extractor.extract_adopters(owner, repo, project_name)
        extractor.save_project_data(project_name, adopters, "adopters", repo=repo)
        extraction_status["adopters"] = True
    except Exception as e:
        print(f"⚠️  Warning: Adopters extraction failed: {e}")

    # Summary
    print(f"\n{'='*60}")
    print(f"Extraction Summary for {project_name} ({owner}/{repo}):")
    print(f"{'='*60}")
    for data_type, success in extraction_status.items():
        print(f"{'✅' if success else '❌'} {data_type}")
    print(f"{'='*60}\n")

    successful_count = sum(extraction_status.values())
    total_count = len(extraction_status)

    if successful_count == total_count:
        print(f"✅ Completed extraction for {project_name} - All data types extracted successfully!\n")
    elif successful_count > 0:
        print(f"⚠️  Partial extraction for {project_name} - {successful_count}/{total_count} data types extracted\n")
    else:
        print(f"❌ Extraction failed for {project_name} - No data could be extracted\n")

    return extraction_status


def _register_repo_in_projects_json(extractor, owner, repo, org_project):
    """Add (or update) a per-repo entry in data/projects.json.

    Called once per repo discovered for an org-level project so the dashboard
    can display each repo individually, just like a project added via its direct
    repo URL.
    """
    projects_file = extractor.data_dir / "projects.json"
    try:
        with open(projects_file) as f:
            root = json.load(f)
    except (OSError, json.JSONDecodeError):
        root = {"projects": []}

    existing = {p["id"]: p for p in root.get("projects", [])}

    project_id = repo.lower().replace("_", "-")
    repo_dir = extractor._project_dir(repo, repo=repo)
    data_dir_name = repo_dir.name

    record = dict(existing.get(project_id, {}))
    record.update({
        "id": project_id,
        "name": repo,
        "github_url": f"https://github.com/{owner}/{repo}",
        "owner": owner,
        "repo": repo,
        "foundation": org_project.get("foundation", "Independent"),
        "data_dir": data_dir_name,
        "enabled": True,
        "is_org": True,
        "org_owner": owner,
    })
    if org_project.get("website"):
        record["website"] = org_project["website"]

    existing[project_id] = record
    root["projects"] = list(existing.values())
    root["last_updated"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"

    with open(projects_file, "w") as f:
        json.dump(root, f, indent=2)


def _register_org_merge(extractor, owner, project_name, repo_names):
    """Write (or update) a merge record in data/merges.json for an org project.

    The record groups all extracted repos under a single dashboard entry whose
    key is the owner slug, display name is the project name, and repoUrl is
    the org URL (https://github.com/<owner>).
    """
    merges_file = extractor.data_dir / "merges.json"
    try:
        with open(merges_file) as f:
            root = json.load(f)
    except (OSError, json.JSONDecodeError):
        root = {"merges": []}

    # Each memberKey matches the project_id written by _register_repo_in_projects_json
    member_keys = [r.lower().replace("_", "-") for r in repo_names]
    merged_key = owner.lower().replace("_", "-")
    org_url = f"https://github.com/{owner}"

    # Replace any existing record for this org (identified by mergedKey)
    merges = [m for m in root.get("merges", []) if m.get("mergedKey") != merged_key]
    merges.append({
        "mergedKey": merged_key,
        "memberKeys": member_keys,
        "name": project_name,
        "orgUrl": org_url,
    })
    root["merges"] = merges
    root["last_updated"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"

    with open(merges_file, "w") as f:
        json.dump(root, f, indent=2)

    print(f"✅ Registered org merge for '{owner}' ({len(member_keys)} repos) in merges.json")


def extract_org_project(extractor, project):
    """Enumerate all public repos for an org/user and run extraction on each.

    Each repo is saved to its own data/<repo-slug>/ directory and registered as
    an individual entry in data/projects.json, identical to how a single-repo
    project added via its direct URL would appear.
    """
    owner = project['owner']
    project_name = project['name']

    print(f"\n{'='*60}")
    print(f"Org project: {project_name}  (owner: {owner})")
    print(f"Enumerating public repositories…")
    print(f"{'='*60}\n")

    try:
        gh_entity = extractor.github.get_organization(owner)
    except GithubException:
        # Fall back to user if not an organisation
        try:
            gh_entity = extractor.github.get_user(owner)
        except GithubException as e:
            print(f"❌ Cannot resolve GitHub org/user '{owner}': {e}")
            sys.exit(1)

    try:
        org_repos = list(gh_entity.get_repos(type="public"))
    except GithubException as e:
        print(f"❌ Cannot list repos for '{owner}': {e}")
        sys.exit(1)

    if not org_repos:
        print(f"⚠️  No public repositories found for '{owner}'.")
        sys.exit(0)

    print(f"Found {len(org_repos)} public repo(s) under '{owner}':\n")
    for r in org_repos:
        print(f"  • {r.name}")
    print()

    overall_success = 0
    overall_total = 0
    extracted_repo_names = []

    for gh_repo in org_repos:
        repo_name = gh_repo.name

        # Register this repo in projects.json before extraction starts so the
        # dashboard shows it (even partially) as soon as data is available.
        _register_repo_in_projects_json(extractor, owner, repo_name, project)

        status = extract_one_repo(extractor, owner, repo_name, repo_name, project)
        overall_success += sum(status.values())
        overall_total += len(status)
        extracted_repo_names.append(repo_name)

        # Small pause between repos to respect GitHub rate limits
        time.sleep(2)

    # Write a merge record so the dashboard automatically groups all repos
    # under a single entry named after the org, with the org URL as the link.
    if extracted_repo_names:
        _register_org_merge(extractor, owner, project_name, extracted_repo_names)

    print(f"\n{'='*60}")
    print(f"Org extraction complete for '{owner}'")
    print(f"  Repos processed : {len(org_repos)}")
    print(f"  Data categories : {overall_success}/{overall_total} succeeded")
    print(f"{'='*60}\n")


def main():
    import argparse
    parser = argparse.ArgumentParser(
        description="Extract data for a single project from config.yaml."
    )
    parser.add_argument("project", help="Project name or owner/repo shorthand")
    parser.add_argument(
        "--repo",
        metavar="REPO",
        default=None,
        help=(
            "For org projects: refresh only this one repo instead of all repos. "
            "Example: --repo console"
        ),
    )
    args = parser.parse_args()

    project_identifier = args.project.lower()
    single_repo_override = args.repo  # None means "all repos" for org projects

    config_path = Path(__file__).parent / "config.yaml"
    extractor = GitHubDataExtractor(str(config_path))

    # Validate the token with a cheap API call before doing real work.
    # A 401 means the token has expired or been revoked.
    try:
        extractor.github.get_user().login
    except GithubException:
        # Any GithubException here (401, 403 bad credentials) means the token is invalid
        print("__TOKEN_EXPIRED__")
        sys.exit(1)
    except Exception:
        pass  # network issue etc. — let the individual steps handle it

    # Keep projects.json in sync with config.yaml (preserves data_dir across renames)
    extractor._sync_projects_json()

    # Find the project in config.yaml by name or owner/repo shorthand
    project = None
    for p in extractor.config['projects']:
        if p['name'].lower() == project_identifier:
            project = p
            break
        # For single-repo projects also match by "owner/repo" shorthand
        if not p.get('is_org') and p.get('repo'):
            repos = p.get('repos') or [{'owner': p['owner'], 'repo': p['repo']}]
            primary = repos[0]
            if f"{primary['owner']}/{primary['repo']}".lower() == project_identifier:
                project = p
                break

    if not project:
        print(f"❌ Project '{args.project}' not found in config.yaml")
        print("\nAvailable projects:")
        for p in extractor.config['projects']:
            print(f"  - {p['name']}")
        sys.exit(1)

    # --- Org / entire-project path ---
    if project.get('is_org'):
        if single_repo_override:
            # Refresh only the one requested repo within the org.
            owner = project['owner']
            print(f"\n{'='*60}")
            print(f"Org project: {project['name']}  (owner: {owner})")
            print(f"Single-repo refresh: {single_repo_override}")
            print(f"{'='*60}\n")
            _register_repo_in_projects_json(extractor, owner, single_repo_override, project)
            extract_one_repo(extractor, owner, single_repo_override, single_repo_override, project)
        else:
            extract_org_project(extractor, project)
        return

    # --- Single-repo (or explicit multi-repo) path ---
    project_name = project['name']

    if 'repos' in project:
        repos = project['repos']
    else:
        repos = [{'owner': project['owner'], 'repo': project['repo']}]

    primary_repo = repos[0]
    owner = primary_repo['owner']
    repo = primary_repo['repo']

    extraction_status = extract_one_repo(extractor, owner, repo, project_name, project)

    # For explicit multi-repo projects handle the extra repos after the primary
    if len(repos) > 1:
        for repo_info in repos[1:]:
            extract_one_repo(
                extractor,
                repo_info['owner'],
                repo_info['repo'],
                project_name,
                project,
            )


if __name__ == "__main__":
    main()

# Made with Bob
