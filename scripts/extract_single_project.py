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
    
    # Extract all data types
    print(f"{'='*60}")
    print(f"Processing: {name}")
    print(f"{'='*60}\n")
    
    metadata = extractor.extract_project_metadata(owner, repo)
    if metadata:
        extractor.save_project_data(name, metadata, "metadata")
    
    contributors = extractor.extract_contributors(owner, repo, name)
    if contributors:
        extractor.save_project_data(name, contributors, "contributors")
    
    commits = extractor.extract_commits(owner, repo, name)
    if commits:
        extractor.save_project_data(name, commits, "commits")
    
    issues = extractor.extract_issues(owner, repo)
    if issues:
        extractor.save_project_data(name, issues, "issues")
    
    pull_requests = extractor.extract_pull_requests(owner, repo)
    if pull_requests:
        extractor.save_project_data(name, pull_requests, "pull_requests")
    
    releases = extractor.extract_releases(owner, repo)
    if releases:
        extractor.save_project_data(name, releases, "releases")
    
    print(f"\n✅ Completed extraction for {name}\n")

if __name__ == "__main__":
    main()

# Made with Bob
