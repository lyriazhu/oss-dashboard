#!/usr/bin/env python3
"""
Extract data for a single project from config.yaml.
Usage: python3 extract_single_project.py <project_name_or_repo>
"""

import sys
import subprocess
import time
from datetime import datetime
from pathlib import Path

from extract_github_data import GitHubDataExtractor
from github import GithubException


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 extract_single_project.py <project_name_or_repo>")
        print("Example: python3 extract_single_project.py Strimzi")
        print("Example: python3 extract_single_project.py '3scale'")
        sys.exit(1)

    project_identifier = sys.argv[1].lower()

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

    # Find the project in config.yaml by name, owner/repo, or first repo owner/repo
    project = None
    for p in extractor.config['projects']:
        if p['name'].lower() == project_identifier:
            project = p
            break
        # Also match by "owner/repo" shorthand
        repos = p.get('repos') or [{'owner': p['owner'], 'repo': p['repo']}]
        primary = repos[0]
        if f"{primary['owner']}/{primary['repo']}".lower() == project_identifier:
            project = p
            break

    if not project:
        print(f"❌ Project '{sys.argv[1]}' not found in config.yaml")
        print("\nAvailable projects:")
        for p in extractor.config['projects']:
            print(f"  - {p['name']}")
        sys.exit(1)

    project_name = project['name']

    # Support both single repo and multiple repos (same as extract_all_projects)
    if 'repos' in project:
        repos = project['repos']
    else:
        repos = [{'owner': project['owner'], 'repo': project['repo']}]

    primary_repo = repos[0]
    owner = primary_repo['owner']
    repo = primary_repo['repo']

    print(f"\n{'='*60}")
    print(f"Processing: {project_name}")
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
            extractor.save_project_data(project_name, metadata, "metadata")
            extraction_status["metadata"] = True
            project_created_at = datetime.fromisoformat(metadata['created_at'].replace('+00:00', ''))
    except Exception as e:
        print(f"⚠️  Warning: Metadata extraction failed: {e}")

    # For multi-repo projects, find the earliest creation date
    if len(repos) > 1 and project_created_at:
        for repo_info in repos[1:]:
            try:
                repository = extractor.github.get_repo(f"{repo_info['owner']}/{repo_info['repo']}")
                repo_created = repository.created_at.replace(tzinfo=None) if repository.created_at.tzinfo else repository.created_at
                if repo_created < project_created_at:
                    project_created_at = repo_created
            except GithubException as e:
                print(f"⚠️  Could not get creation date for {repo_info['owner']}/{repo_info['repo']}: {e}")

    # Contributors (includes quarterly + yearly retention)
    try:
        contributors = extractor.extract_contributors(owner, repo, project_name)
        if contributors:
            extractor.save_project_data(project_name, contributors, "contributors")
            extraction_status["contributors"] = True
            extractor.refresh_metadata_companies(project_name)
    except Exception as e:
        print(f"⚠️  Warning: Contributors extraction failed: {e}")

    # Commits
    try:
        commits = extractor.extract_commits(owner, repo, project_name)
        if commits:
            extractor.save_project_data(project_name, commits, "commits")
            extraction_status["commits"] = True
    except Exception as e:
        print(f"⚠️  Warning: Commits extraction failed: {e}")

    # Issues — route to jira or github (optionally from a dedicated issue repo)
    issue_source = project.get('issue_source', 'github')
    issue_repos = repos
    if project.get('issue_owner') and project.get('issue_repo'):
        issue_repos = [{
            'owner': project['issue_owner'],
            'repo': project['issue_repo'],
        }]

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
                    extractor.save_project_data(project_name, issues, "issues")
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
                extractor.save_project_data(project_name, pull_requests, "pull_requests")
                extraction_status["pull_requests"] = True
        else:
            print(f"⚠️  Warning: Cannot extract pull requests - metadata not available")
    except Exception as e:
        print(f"⚠️  Warning: Pull requests extraction failed: {e}")

    # Releases
    try:
        releases = extractor.extract_releases(owner, repo, project_name)
        if releases:
            extractor.save_project_data(project_name, releases, "releases")
            extraction_status["releases"] = True
    except Exception as e:
        print(f"⚠️  Warning: Releases extraction failed: {e}")

    # Adopters
    try:
        adopters = extractor.extract_adopters(owner, repo, project_name)
        extractor.save_project_data(project_name, adopters, "adopters")
        extraction_status["adopters"] = True
    except Exception as e:
        print(f"⚠️  Warning: Adopters extraction failed: {e}")

    # Summary
    print(f"\n{'='*60}")
    print(f"Extraction Summary for {project_name}:")
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


if __name__ == "__main__":
    main()

# Made with Bob
