#!/usr/bin/env python3
"""
GitHub Data Extraction Script
Extracts contributor, commit, issue, and PR data from GitHub repositories
"""

import os
import json
import yaml
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Set
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
        self.repo_cache_dir = Path(__file__).parent.parent / ".cache" / "repos"
        self.repo_cache_dir.mkdir(parents=True, exist_ok=True)
        self.user_profile_cache: Dict[str, Dict[str, Optional[str]]] = {}
        
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

    def _quarter_label(self, dt: datetime) -> str:
        """Return quarter label for a datetime"""
        return f"Q{((dt.month - 1) // 3) + 1} {dt.year}"

    def _safe_isoformat(self, value: Optional[datetime]) -> Optional[str]:
        """Safely convert datetime to ISO string"""
        return value.isoformat() if value else None

    def _normalize_company(self, company: Optional[str]) -> str:
        """Normalize company names for grouping"""
        if not company:
            return "Unknown"
        return company.strip().lstrip('@').title() or "Unknown"

    def _get_user_profile(self, login: str) -> Dict[str, Optional[str]]:
        """Fetch user profile details with safe fallbacks and caching"""
        if login in self.user_profile_cache:
            return self.user_profile_cache[login]

        try:
            user = self.github.get_user(login)
            profile = {
                "name": user.name,
                "company": self._normalize_company(user.company),
                "location": user.location,
                "email": user.email,
                "profile_url": user.html_url
            }
        except GithubException:
            profile = {
                "name": None,
                "company": "Unknown",
                "location": None,
                "email": None,
                "profile_url": f"https://github.com/{login}"
            }

        self.user_profile_cache[login] = profile
        return profile

    def _get_repo_cache_path(self, owner: str, repo: str) -> Path:
        """Return local cache path for a repository clone"""
        return self.repo_cache_dir / f"{owner}__{repo}"

    def _ensure_local_repo(self, owner: str, repo: str) -> Optional[Path]:
        """Clone or update a local repository mirror for git-based analytics"""
        repo_path = self._get_repo_cache_path(owner, repo)
        repo_url = f"https://github.com/{owner}/{repo}.git"

        try:
            if repo_path.exists():
                subprocess.run(
                    ["git", "-C", str(repo_path), "fetch", "--all", "--prune"],
                    check=True,
                    capture_output=True,
                    text=True
                )
            else:
                subprocess.run(
                    ["git", "clone", "--mirror", repo_url, str(repo_path)],
                    check=True,
                    capture_output=True,
                    text=True
                )
            return repo_path
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print(f"⚠️  Unable to prepare local git cache for {owner}/{repo}: {e}")
            return None

    def _month_label(self, dt: datetime) -> str:
        """Return month label for a datetime"""
        return dt.strftime("%Y-%m")

    def _extract_retention_from_git_history(self, owner: str, repo: str, months: int = 6) -> List[Dict[str, Any]]:
        """Compute contributor retention cohorts from local git history"""
        repo_path = self._ensure_local_repo(owner, repo)
        if not repo_path:
            return []

        try:
            result = subprocess.run(
                [
                    "git", "-C", str(repo_path), "log",
                    "--all",
                    "--pretty=format:%ae|%an|%aI"
                ],
                check=True,
                capture_output=True,
                text=True
            )
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print(f"⚠️  Unable to read git history for retention on {owner}/{repo}: {e}")
            return []

        contributor_months: Dict[str, Set[str]] = defaultdict(set)
        contributor_first_seen: Dict[str, str] = {}

        for line in result.stdout.splitlines():
            parts = line.split("|", 2)
            if len(parts) != 3:
                continue

            email, author_name, authored_at = parts
            identity = email.strip().lower() if email.strip() else author_name.strip().lower()
            if not identity or not authored_at:
                continue

            try:
                authored_dt = datetime.fromisoformat(authored_at.replace("Z", "+00:00"))
            except ValueError:
                continue

            month = self._month_label(authored_dt)
            contributor_months[identity].add(month)

            if identity not in contributor_first_seen or month < contributor_first_seen[identity]:
                contributor_first_seen[identity] = month

        all_months = sorted({month for months_set in contributor_months.values() for month in months_set})
        if not all_months:
            return []

        selected_months = all_months[-months:]
        retention_rows = []

        for month in selected_months:
            cohort = {identity for identity, first_month in contributor_first_seen.items() if first_month == month}
            retained_next_month = 0

            if cohort:
                month_index = all_months.index(month)
                next_month = all_months[month_index + 1] if month_index + 1 < len(all_months) else None
                if next_month:
                    retained_next_month = sum(
                        1 for identity in cohort if next_month in contributor_months.get(identity, set())
                    )

            retention_rows.append({
                "quarter": month,
                "start_date": month,
                "end_date": month,
                "active_contributors": sum(1 for months_set in contributor_months.values() if month in months_set),
                "new_contributors": len(cohort),
                "returning_contributors": retained_next_month,
                "retention_rate": round((retained_next_month / len(cohort)) * 100, 2) if cohort else None
            })

        return retention_rows
    
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
                "has_discussions": getattr(repository, "has_discussions", None),
                "extracted_at": datetime.now().isoformat()
            }
            
            return metadata
            
        except GithubException as e:
            print(f"❌ Error extracting metadata: {e}")
            return {}
    
    def extract_contributors(self, owner: str, repo: str, quarters: int = 4) -> Dict[str, Any]:
        """Extract contributor information with company affiliations and retention"""
        print(f"👥 Extracting contributors for {owner}/{repo}...")
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            contributors_data = {
                "total_contributors": 0,
                "contributors": [],
                "companies": {},
                "total_companies": 0,
                "retention_by_quarter": [],
                "company_diversity": {},
                "extracted_at": datetime.now().isoformat()
            }
            
            contributors = repository.get_contributors()
            contributor_list = []
            company_count = defaultdict(int)
            
            for contributor in tqdm(contributors, desc="Processing contributors"):
                try:
                    profile = self._get_user_profile(contributor.login)
                    contributor_info = {
                        "login": contributor.login,
                        "name": profile["name"],
                        "company": profile["company"],
                        "location": profile["location"],
                        "email": profile["email"],
                        "contributions": contributor.contributions,
                        "profile_url": profile["profile_url"]
                    }
                    
                    contributor_list.append(contributor_info)
                    company_count[profile["company"]] += 1
                    
                except GithubException as e:
                    print(f"⚠️  Error processing contributor {contributor.login}: {e}")
                    continue

            retention_by_quarter = self._extract_retention_from_git_history(owner, repo, months=max(quarters * 3, 6))

            total_contributors = len(contributor_list)
            known_company_total = sum(count for company, count in company_count.items() if company != "Unknown")
            company_diversity = {
                "known_company_contributors": known_company_total,
                "unknown_company_contributors": company_count.get("Unknown", 0),
                "top_companies": [
                    {"company": company, "contributor_count": count}
                    for company, count in sorted(company_count.items(), key=lambda item: item[1], reverse=True)[:10]
                ]
            }
            
            contributors_data["total_contributors"] = total_contributors
            contributors_data["contributors"] = contributor_list
            contributors_data["companies"] = dict(company_count)
            contributors_data["total_companies"] = len(company_count)
            contributors_data["retention_by_quarter"] = retention_by_quarter
            contributors_data["company_diversity"] = company_diversity
            
            return contributors_data
            
        except GithubException as e:
            print(f"❌ Error extracting contributors: {e}")
            return {}
    
    def extract_commits(self, owner: str, repo: str, quarters: int = 4) -> Dict[str, Any]:
        """Extract commit activity by quarter and committer details"""
        print(f"📝 Extracting commits for {owner}/{repo}...")
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            quarter_dates = self._get_quarter_dates(quarters)
            
            commits_data = {
                "total_commits": 0,
                "quarters": [],
                "committers": [],
                "extracted_at": datetime.now().isoformat()
            }

            committer_stats: Dict[str, Dict[str, Any]] = {}
            
            for start_date, end_date in tqdm(quarter_dates, desc="Processing quarters"):
                try:
                    commits = repository.get_commits(since=start_date, until=end_date)
                    commit_count = commits.totalCount
                    
                    quarter_info = {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "commit_count": commit_count,
                        "quarter": self._quarter_label(end_date)
                    }
                    
                    commits_data["quarters"].append(quarter_info)
                    commits_data["total_commits"] += commit_count

                    processed = 0
                    for commit in commits:
                        if processed >= 200:
                            break

                        author = commit.author
                        if not author:
                            continue

                        login = author.login
                        if login not in committer_stats:
                            profile = self._get_user_profile(login)
                            committer_stats[login] = {
                                "login": login,
                                "name": profile["name"],
                                "company": profile["company"],
                                "location": profile["location"],
                                "email": profile["email"],
                                "profile_url": profile["profile_url"],
                                "commit_count": 0
                            }

                        committer_stats[login]["commit_count"] += 1
                        processed += 1
                    
                except (GithubException, IndexError) as e:
                    print(f"⚠️  Error processing quarter: {e}")
                    continue

            commits_data["committers"] = sorted(
                committer_stats.values(),
                key=lambda item: item["commit_count"],
                reverse=True
            )
            
            return commits_data
            
        except GithubException as e:
            print(f"❌ Error extracting commits: {e}")
            return {}
    
    def extract_issues(self, owner: str, repo: str) -> Dict[str, Any]:
        """Extract issue metrics and commenter activity"""
        print(f"🐛 Extracting issues for {owner}/{repo}...")
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            
            open_issues = repository.get_issues(state='open')
            closed_issues = repository.get_issues(state='closed')
            
            issues_data = {
                "total_open": open_issues.totalCount,
                "total_closed": closed_issues.totalCount,
                "total_issues": open_issues.totalCount + closed_issues.totalCount,
                "avg_resolution_time_days": None,
                "issue_commenters": [],
                "extracted_at": datetime.now().isoformat()
            }
            
            resolution_times = []
            commenter_counts = defaultdict(int)

            for issue in closed_issues[:100]:
                if issue.pull_request is not None:
                    continue

                if issue.closed_at and issue.created_at:
                    delta = issue.closed_at - issue.created_at
                    resolution_times.append(delta.days)

                try:
                    comments = issue.get_comments()
                    for comment in comments[:50]:
                        if comment.user and comment.user.login:
                            commenter_counts[comment.user.login] += 1
                except GithubException:
                    continue
            
            if resolution_times:
                issues_data["avg_resolution_time_days"] = sum(resolution_times) / len(resolution_times)

            issue_commenters = []
            for login, comment_count in sorted(commenter_counts.items(), key=lambda item: item[1], reverse=True)[:50]:
                profile = self._get_user_profile(login)
                issue_commenters.append({
                    "login": login,
                    "name": profile["name"],
                    "company": profile["company"],
                    "location": profile["location"],
                    "profile_url": profile["profile_url"],
                    "comment_count": comment_count
                })

            issues_data["issue_commenters"] = issue_commenters
            
            return issues_data
            
        except GithubException as e:
            print(f"❌ Error extracting issues: {e}")
            return {}
    
    def extract_pull_requests(self, owner: str, repo: str, quarters: int = 4) -> Dict[str, Any]:
        """Extract pull request metrics including merge timeline"""
        print(f"🔀 Extracting pull requests for {owner}/{repo}...")
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            quarter_dates = self._get_quarter_dates(quarters)
            
            pr_data = {
                "total_prs": 0,
                "avg_time_to_merge_days": None,
                "quarters": [],
                "extracted_at": datetime.now().isoformat()
            }

            overall_merge_times = []
            
            for start_date, end_date in tqdm(quarter_dates, desc="Processing quarters"):
                try:
                    pulls = repository.get_pulls(state='all', sort='created')
                    
                    quarter_prs = []
                    quarter_merge_times = []

                    for pr in pulls:
                        if start_date <= pr.created_at <= end_date:
                            quarter_prs.append(pr)
                            if pr.merged_at:
                                merge_days = (pr.merged_at - pr.created_at).total_seconds() / 86400
                                quarter_merge_times.append(round(merge_days, 2))
                                overall_merge_times.append(round(merge_days, 2))
                        elif pr.created_at < start_date:
                            break
                    
                    quarter_info = {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "pr_count": len(quarter_prs),
                        "merged_pr_count": len(quarter_merge_times),
                        "avg_time_to_merge_days": (
                            round(sum(quarter_merge_times) / len(quarter_merge_times), 2)
                            if quarter_merge_times else None
                        ),
                        "quarter": self._quarter_label(end_date)
                    }
                    
                    pr_data["quarters"].append(quarter_info)
                    pr_data["total_prs"] += len(quarter_prs)
                    
                except GithubException as e:
                    print(f"⚠️  Error processing quarter: {e}")
                    continue

            if overall_merge_times:
                pr_data["avg_time_to_merge_days"] = round(
                    sum(overall_merge_times) / len(overall_merge_times), 2
                )
            
            return pr_data
            
        except GithubException as e:
            print(f"❌ Error extracting pull requests: {e}")
            return {}
    
    def extract_releases(self, owner: str, repo: str) -> Dict[str, Any]:
        """Extract release information and cadence summary"""
        print(f"🚀 Extracting releases for {owner}/{repo}...")
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            releases = repository.get_releases()
            
            release_list = []
            published_dates = []

            for release in releases[:20]:
                published_at = self._safe_isoformat(release.published_at)
                if release.published_at:
                    published_dates.append(release.published_at)

                release_info = {
                    "tag_name": release.tag_name,
                    "name": release.title,
                    "published_at": published_at,
                    "prerelease": release.prerelease,
                    "draft": release.draft
                }
                release_list.append(release_info)

            cadence_days = []
            sorted_dates = sorted([dt for dt in published_dates if dt], reverse=True)
            for i in range(len(sorted_dates) - 1):
                cadence_days.append((sorted_dates[i] - sorted_dates[i + 1]).days)
            
            releases_data = {
                "total_releases": releases.totalCount,
                "recent_releases": release_list,
                "avg_days_between_releases": (
                    round(sum(cadence_days) / len(cadence_days), 2) if cadence_days else None
                ),
                "release_frequency": (
                    "high" if cadence_days and (sum(cadence_days) / len(cadence_days)) <= 30 else
                    "medium" if cadence_days and (sum(cadence_days) / len(cadence_days)) <= 90 else
                    "low" if cadence_days else None
                ),
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
