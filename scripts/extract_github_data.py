#!/usr/bin/env python3
"""
GitHub Data Extraction Script
Extracts contributor, commit, issue, and PR data from GitHub repositories
"""

import os
import json
import yaml
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict

from github import Github, GithubException
from tqdm import tqdm
import time


class GitHubDataExtractor:
    """Extract data from GitHub repositories"""
    
    def __init__(self, config_path: str = "config.yaml"):
        """Initialize with configuration"""
        self.config = self._load_config(config_path)
        self.github = Github(self.config['github']['token'])
        self.data_dir = Path(__file__).parent.parent / "data"
        self.data_dir.mkdir(exist_ok=True)
        
    def _load_config(self, config_path: str) -> Dict:
        """Load YAML configuration"""
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    
    def _get_quarter_dates(self, quarters_back: int = 8) -> List[tuple]:
        """Generate list of quarter start/end dates"""
        quarters = []
        now = datetime.now()
        
        for i in range(quarters_back):
            # Calculate quarter
            quarter_end = now - timedelta(days=i * 90)
            quarter_start = quarter_end - timedelta(days=90)
            quarters.append((quarter_start, quarter_end))
        
        return quarters
    
    def extract_project_metadata(self, owner: str, repo: str) -> Dict[str, Any]:
        """Extract basic project metadata"""
        print(f"📊 Extracting metadata for {owner}/{repo}...")
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            
            metadata = {
                "name": repository.name,
                "full_name": repository.full_name,
                "description": repository.description,
                "created_at": repository.created_at.isoformat(),
                "updated_at": repository.updated_at.isoformat(),
                "stars": repository.stargazers_count,
                "forks": repository.forks_count,
                "watchers": repository.watchers_count,
                "open_issues": repository.open_issues_count,
                "language": repository.language,
                "topics": repository.get_topics(),
                "license": repository.license.name if repository.license else None,
                "homepage": repository.homepage,
                "has_wiki": repository.has_wiki,
                "has_discussions": repository.has_discussions,
                "extracted_at": datetime.now().isoformat()
            }
            
            return metadata
            
        except GithubException as e:
            print(f"❌ Error extracting metadata: {e}")
            return {}
    
    def extract_contributors(self, owner: str, repo: str) -> Dict[str, Any]:
        """Extract contributor information with company affiliations"""
        print(f"👥 Extracting contributors for {owner}/{repo}...")
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            contributors_data = {
                "total_contributors": 0,
                "contributors": [],
                "companies": {},
                "extracted_at": datetime.now().isoformat()
            }
            
            # Get all contributors
            contributors = repository.get_contributors()
            contributor_list = []
            company_count = defaultdict(int)
            
            for contributor in tqdm(contributors, desc="Processing contributors"):
                try:
                    # Get user details
                    user = self.github.get_user(contributor.login)
                    
                    # Extract company from profile
                    company = user.company if user.company else "Unknown"
                    if company:
                        # Clean company name
                        company = company.strip().lstrip('@').title()
                    
                    contributor_info = {
                        "login": contributor.login,
                        "name": user.name,
                        "company": company,
                        "location": user.location,
                        "email": user.email,
                        "contributions": contributor.contributions,
                        "profile_url": user.html_url
                    }
                    
                    contributor_list.append(contributor_info)
                    company_count[company] += 1
                    
                    # Rate limiting
                    time.sleep(0.1)
                    
                except GithubException as e:
                    print(f"⚠️  Error processing contributor {contributor.login}: {e}")
                    continue
            
            contributors_data["total_contributors"] = len(contributor_list)
            contributors_data["contributors"] = contributor_list
            contributors_data["companies"] = dict(company_count)
            contributors_data["total_companies"] = len(company_count)
            
            return contributors_data
            
        except GithubException as e:
            print(f"❌ Error extracting contributors: {e}")
            return {}
    
    def extract_commits(self, owner: str, repo: str, quarters: int = 4) -> Dict[str, Any]:
        """Extract commit activity by quarter"""
        print(f"📝 Extracting commits for {owner}/{repo}...")
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            quarter_dates = self._get_quarter_dates(quarters)
            
            commits_data = {
                "total_commits": 0,
                "quarters": [],
                "extracted_at": datetime.now().isoformat()
            }
            
            for start_date, end_date in tqdm(quarter_dates, desc="Processing quarters"):
                try:
                    commits = repository.get_commits(since=start_date, until=end_date)
                    commit_count = commits.totalCount
                    
                    quarter_info = {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "commit_count": commit_count,
                        "quarter": f"Q{((end_date.month - 1) // 3) + 1} {end_date.year}"
                    }
                    
                    commits_data["quarters"].append(quarter_info)
                    commits_data["total_commits"] += commit_count
                    
                except GithubException as e:
                    print(f"⚠️  Error processing quarter: {e}")
                    continue
            
            return commits_data
            
        except GithubException as e:
            print(f"❌ Error extracting commits: {e}")
            return {}
    
    def extract_issues(self, owner: str, repo: str) -> Dict[str, Any]:
        """Extract issue metrics"""
        print(f"🐛 Extracting issues for {owner}/{repo}...")
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            
            # Get open and closed issues
            open_issues = repository.get_issues(state='open')
            closed_issues = repository.get_issues(state='closed')
            
            issues_data = {
                "total_open": open_issues.totalCount,
                "total_closed": closed_issues.totalCount,
                "total_issues": open_issues.totalCount + closed_issues.totalCount,
                "avg_resolution_time_days": None,
                "extracted_at": datetime.now().isoformat()
            }
            
            # Calculate average resolution time (sample last 100 closed issues)
            resolution_times = []
            for issue in closed_issues[:100]:
                if issue.closed_at and issue.created_at:
                    delta = issue.closed_at - issue.created_at
                    resolution_times.append(delta.days)
            
            if resolution_times:
                issues_data["avg_resolution_time_days"] = sum(resolution_times) / len(resolution_times)
            
            return issues_data
            
        except GithubException as e:
            print(f"❌ Error extracting issues: {e}")
            return {}
    
    def extract_pull_requests(self, owner: str, repo: str, quarters: int = 4) -> Dict[str, Any]:
        """Extract pull request metrics"""
        print(f"🔀 Extracting pull requests for {owner}/{repo}...")
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            quarter_dates = self._get_quarter_dates(quarters)
            
            pr_data = {
                "total_prs": 0,
                "quarters": [],
                "extracted_at": datetime.now().isoformat()
            }
            
            for start_date, end_date in tqdm(quarter_dates, desc="Processing quarters"):
                try:
                    # Get PRs created in this quarter
                    pulls = repository.get_pulls(state='all', sort='created')
                    
                    quarter_prs = []
                    for pr in pulls:
                        if start_date <= pr.created_at <= end_date:
                            quarter_prs.append(pr)
                        elif pr.created_at < start_date:
                            break  # Stop if we've gone past the quarter
                    
                    quarter_info = {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "pr_count": len(quarter_prs),
                        "quarter": f"Q{((end_date.month - 1) // 3) + 1} {end_date.year}"
                    }
                    
                    pr_data["quarters"].append(quarter_info)
                    pr_data["total_prs"] += len(quarter_prs)
                    
                except GithubException as e:
                    print(f"⚠️  Error processing quarter: {e}")
                    continue
            
            return pr_data
            
        except GithubException as e:
            print(f"❌ Error extracting pull requests: {e}")
            return {}
    
    def extract_releases(self, owner: str, repo: str) -> Dict[str, Any]:
        """Extract release information"""
        print(f"🚀 Extracting releases for {owner}/{repo}...")
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            releases = repository.get_releases()
            
            release_list = []
            for release in releases[:20]:  # Last 20 releases
                release_info = {
                    "tag_name": release.tag_name,
                    "name": release.title,
                    "published_at": release.published_at.isoformat() if release.published_at else None,
                    "prerelease": release.prerelease,
                    "draft": release.draft
                }
                release_list.append(release_info)
            
            releases_data = {
                "total_releases": releases.totalCount,
                "recent_releases": release_list,
                "extracted_at": datetime.now().isoformat()
            }
            
            return releases_data
            
        except GithubException as e:
            print(f"❌ Error extracting releases: {e}")
            return {}
    
    def save_project_data(self, project_name: str, data: Dict[str, Any], data_type: str):
        """Save extracted data to JSON file"""
        project_dir = self.data_dir / project_name.lower().replace(" ", "-")
        project_dir.mkdir(exist_ok=True)
        
        output_file = project_dir / f"{data_type}.json"
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"✅ Saved {data_type} data to {output_file}")
    
    def extract_all_projects(self):
        """Extract data for all configured projects"""
        projects = self.config['projects']
        
        print(f"\n🚀 Starting data extraction for {len(projects)} projects...\n")
        
        for project in projects:
            print(f"\n{'='*60}")
            print(f"Processing: {project['name']}")
            print(f"{'='*60}\n")
            
            owner = project['owner']
            repo = project['repo']
            project_name = project['name']
            
            # Extract all data types
            metadata = self.extract_project_metadata(owner, repo)
            if metadata:
                self.save_project_data(project_name, metadata, "metadata")
            
            contributors = self.extract_contributors(owner, repo)
            if contributors:
                self.save_project_data(project_name, contributors, "contributors")
            
            commits = self.extract_commits(owner, repo)
            if commits:
                self.save_project_data(project_name, commits, "commits")
            
            issues = self.extract_issues(owner, repo)
            if issues:
                self.save_project_data(project_name, issues, "issues")
            
            pull_requests = self.extract_pull_requests(owner, repo)
            if pull_requests:
                self.save_project_data(project_name, pull_requests, "pull_requests")
            
            releases = self.extract_releases(owner, repo)
            if releases:
                self.save_project_data(project_name, releases, "releases")
            
            print(f"\n✅ Completed extraction for {project_name}\n")
            
            # Rate limiting between projects
            time.sleep(2)
        
        print(f"\n{'='*60}")
        print("🎉 All projects processed successfully!")
        print(f"{'='*60}\n")


def main():
    """Main execution function"""
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║         GitHub Data Extraction Tool                       ║
    ║         Open Source Dashboard Project                     ║
    ╚═══════════════════════════════════════════════════════════╝
    """)
    
    # Check if config exists
    config_path = Path(__file__).parent / "config.yaml"
    if not config_path.exists():
        print("❌ Error: config.yaml not found!")
        print("Please create config.yaml with your GitHub token.")
        return
    
    # Initialize extractor
    extractor = GitHubDataExtractor(str(config_path))
    
    # Check GitHub token
    try:
        user = extractor.github.get_user()
        print(f"✅ Authenticated as: {user.login}")
        print(f"📊 Rate limit: {extractor.github.get_rate_limit().core.remaining} requests remaining\n")
    except GithubException as e:
        print(f"❌ Authentication failed: {e}")
        print("Please check your GitHub token in config.yaml")
        return
    
    # Extract all project data
    extractor.extract_all_projects()


if __name__ == "__main__":
    main()

# Made with Bob
