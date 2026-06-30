#!/usr/bin/env python3
"""
Extract data for a single project
Usage: python3 extract_single_project.py <project_id_or_name>
"""

import sys
import json
import subprocess
from extract_github_data import GitHubDataExtractor
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 extract_single_project.py <project_id_or_name>")
        print("Example: python3 extract_single_project.py kubernetes")
        print("Example: python3 extract_single_project.py 'Apache Camel'")
        sys.exit(1)
    
    project_identifier = sys.argv[1]
    
    # Initialize extractor
    config_path = Path(__file__).parent / "config.yaml"
    extractor = GitHubDataExtractor(str(config_path))
    
    # Read projects from projects.json
    projects_file = Path(__file__).parent.parent / "data" / "projects.json"
    if not projects_file.exists():
        print(f"❌ Projects file not found: {projects_file}")
        sys.exit(1)
    
    with open(projects_file, 'r') as f:
        projects_data = json.load(f)
    
    # Find the project by ID or name
    project = None
    for p in projects_data['projects']:
        if p['id'].lower() == project_identifier.lower() or p['name'].lower() == project_identifier.lower():
            project = p
            break
    
    if not project:
        print(f"❌ Project '{project_identifier}' not found in projects.json")
        print("\nAvailable projects:")
        for p in projects_data['projects']:
            print(f"  - {p['id']} ({p['name']})")
        sys.exit(1)
    
    print(f"\n🚀 Extracting data for: {project['name']} ({project['id']})\n")
    
    owner = project['owner']
    repo = project['repo']
    name = project['id']  # Use project ID as the directory name
    
    # Extract all data types with error handling
    print(f"{'='*60}")
    print(f"Processing: {name}")
    print(f"{'='*60}\n")
    
    # Track extraction status
    extraction_status = {
        "metadata": False,
        "contributors": False,
        "commits": False,
        "issues": False,
        "pull_requests": False,
        "releases": False
    }
    
    # Metadata
    metadata = None
    try:
        metadata = extractor.extract_project_metadata(owner, repo, project_name=name)
        if metadata:
            extractor.save_project_data(name, metadata, "metadata")
            extraction_status["metadata"] = True
    except Exception as e:
        print(f"⚠️  Warning: Metadata extraction failed: {e}")
        print(f"   Continuing with other data types...")
    
    # Contributors
    try:
        contributors = extractor.extract_contributors(owner, repo, name)
        if contributors:
            extractor.save_project_data(name, contributors, "contributors")
            extraction_status["contributors"] = True
    except Exception as e:
        print(f"⚠️  Warning: Contributors extraction failed: {e}")
        print(f"   Continuing with other data types...")
    
    # Commits
    try:
        commits = extractor.extract_commits(owner, repo, name)
        if commits:
            extractor.save_project_data(name, commits, "commits")
            extraction_status["commits"] = True
    except Exception as e:
        print(f"⚠️  Warning: Commits extraction failed: {e}")
        print(f"   Continuing with other data types...")
    
    # Issues
    try:
        issue_source = project.get("issue_source", "github")
        if issue_source == "jira":
            jira_script = Path(__file__).parent / "extract_jira_issues.py"
            jira_result = subprocess.run(
                [sys.executable, str(jira_script), project['id']],
                cwd=str(Path(__file__).parent),
                check=False,
            )
            if jira_result.returncode == 0:
                extraction_status["issues"] = True
            else:
                print(f"⚠️  Warning: Jira issues extraction failed with exit code {jira_result.returncode}")
                print(f"   Continuing with other data types...")
        elif metadata and 'created_at' in metadata:
            from datetime import datetime
            # Parse the created_at from metadata
            created_at = datetime.fromisoformat(metadata['created_at'].replace('Z', '+00:00'))
            # Create repos list
            repos = [{'owner': owner, 'repo': repo}]
            issues = extractor.extract_issues(repos, created_at, name)
            if issues:
                extractor.save_project_data(name, issues, "issues")
                extraction_status["issues"] = True
        else:
            print(f"⚠️  Warning: Cannot extract issues - metadata not available")
    except Exception as e:
        print(f"⚠️  Warning: Issues extraction failed: {e}")
        print(f"   Continuing with other data types...")
    
    # Pull Requests
    try:
        if metadata and 'created_at' in metadata:
            from datetime import datetime
            # Parse the created_at from metadata
            created_at = datetime.fromisoformat(metadata['created_at'].replace('Z', '+00:00'))
            # Create repos list
            repos = [{'owner': owner, 'repo': repo}]
            pull_requests = extractor.extract_pull_requests(repos, created_at, name)
            if pull_requests:
                extractor.save_project_data(name, pull_requests, "pull_requests")
                extraction_status["pull_requests"] = True
        else:
            print(f"⚠️  Warning: Cannot extract pull requests - metadata not available")
    except Exception as e:
        print(f"⚠️  Warning: Pull requests extraction failed: {e}")
        print(f"   Continuing with other data types...")
    
    # Releases
    try:
        releases = extractor.extract_releases(owner, repo, name)
        if releases:
            extractor.save_project_data(name, releases, "releases")
            extraction_status["releases"] = True
    except Exception as e:
        print(f"⚠️  Warning: Releases extraction failed: {e}")
        print(f"   Continuing with other data types...")
    
    # Summary
    print(f"\n{'='*60}")
    print(f"Extraction Summary for {name}:")
    print(f"{'='*60}")
    for data_type, success in extraction_status.items():
        status = "✅" if success else "❌"
        print(f"{status} {data_type}")
    print(f"{'='*60}\n")
    
    successful_count = sum(extraction_status.values())
    total_count = len(extraction_status)
    
    if successful_count == total_count:
        print(f"✅ Completed extraction for {name} - All data types extracted successfully!\n")
    elif successful_count > 0:
        print(f"⚠️  Partial extraction for {name} - {successful_count}/{total_count} data types extracted\n")
    else:
        print(f"❌ Extraction failed for {name} - No data could be extracted\n")

if __name__ == "__main__":
    main()

# Made with Bob
