#!/usr/bin/env python3
"""
Extract data for a single project
Usage: python3 extract_single_project.py "Apache Camel"
"""

import sys
from extract_github_data import GitHubDataExtractor
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 extract_single_project.py <project_name>")
        print("Example: python3 extract_single_project.py 'Apache Camel'")
        sys.exit(1)
    
    project_name = sys.argv[1]
    
    # Initialize extractor
    config_path = Path(__file__).parent / "config.yaml"
    extractor = GitHubDataExtractor(str(config_path))
    
    # Find the project in config
    project = None
    for p in extractor.config['projects']:
        if p['name'].lower() == project_name.lower():
            project = p
            break
    
    if not project:
        print(f"❌ Project '{project_name}' not found in config.yaml")
        print("\nAvailable projects:")
        for p in extractor.config['projects']:
            print(f"  - {p['name']}")
        sys.exit(1)
    
    print(f"\n🚀 Extracting data for: {project['name']}\n")
    
    owner = project['owner']
    repo = project['repo']
    name = project['name']
    
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
    try:
        metadata = extractor.extract_project_metadata(owner, repo)
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
        issues = extractor.extract_issues(owner, repo)
        if issues:
            extractor.save_project_data(name, issues, "issues")
            extraction_status["issues"] = True
    except Exception as e:
        print(f"⚠️  Warning: Issues extraction failed: {e}")
        print(f"   Continuing with other data types...")
    
    # Pull Requests
    try:
        pull_requests = extractor.extract_pull_requests(owner, repo)
        if pull_requests:
            extractor.save_project_data(name, pull_requests, "pull_requests")
            extraction_status["pull_requests"] = True
    except Exception as e:
        print(f"⚠️  Warning: Pull requests extraction failed: {e}")
        print(f"   Continuing with other data types...")
    
    # Releases
    try:
        releases = extractor.extract_releases(owner, repo)
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
