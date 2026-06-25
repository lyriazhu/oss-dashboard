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
        self.cache_dir = Path(__file__).parent.parent / ".cache"
        self.cache_dir.mkdir(exist_ok=True)
        self.repo_cache_dir = self.cache_dir / "repos"
        self.repo_cache_dir.mkdir(parents=True, exist_ok=True)
        self.user_profile_cache_file = self.cache_dir / "user_profiles.json"
        self.user_profile_cache: Dict[str, Dict[str, Optional[str]]] = self._load_json_file(
            self.user_profile_cache_file,
            {}
        )
        
    def _load_config(self, config_path: str) -> Dict:
        """Load YAML configuration"""
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)

    def _load_json_file(self, path: Path, default: Any) -> Any:
        """Load JSON file with default fallback"""
        if not path.exists():
            return default

        try:
            with open(path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return default

    def _save_json_file(self, path: Path, data: Any):
        """Persist JSON file"""
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)

    def _project_dir(self, project_name: str) -> Path:
        """Return normalized project data directory"""
        return self.data_dir / project_name.lower().replace(" ", "-")

    def _project_state_path(self, project_name: str) -> Path:
        """Return project state file path"""
        return self._project_dir(project_name) / "_state.json"

    def _load_project_state(self, project_name: str) -> Dict[str, Any]:
        """Load per-project extraction state"""
        return self._load_json_file(
            self._project_state_path(project_name),
            {
                "contributors": {
                    "known_logins": [],
                    "last_extracted_at": None
                },
                "commits": {
                    "last_git_sync_at": None
                }
            }
        )

    def _save_project_state(self, project_name: str, state: Dict[str, Any]):
        """Save per-project extraction state"""
        self._save_json_file(self._project_state_path(project_name), state)
    
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
        self._save_json_file(self.user_profile_cache_file, self.user_profile_cache)
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

    def _read_git_history_rows(self, owner: str, repo: str, since: Optional[str] = None) -> List[Dict[str, str]]:
        """Read local git history rows for analytics"""
        repo_path = self._ensure_local_repo(owner, repo)
        if not repo_path:
            return []

        command = [
            "git", "-C", str(repo_path), "log",
            "--all",
            "--pretty=format:%H|%ae|%an|%aI"
        ]
        if since:
            command.insert(4, f"--since={since}")

        try:
            result = subprocess.run(
                command,
                check=True,
                capture_output=True,
                text=True
            )
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print(f"⚠️  Unable to read git history for {owner}/{repo}: {e}")
            return []

        rows = []
        for line in result.stdout.splitlines():
            parts = line.split("|", 3)
            if len(parts) != 4:
                continue

            commit_sha, email, author_name, authored_at = parts
            identity = email.strip().lower() if email.strip() else author_name.strip().lower()
            if not identity or not authored_at:
                continue

            try:
                authored_dt = datetime.fromisoformat(authored_at.replace("Z", "+00:00"))
            except ValueError:
                continue

            rows.append({
                "sha": commit_sha,
                "identity": identity,
                "email": email.strip().lower() if email.strip() else "",
                "author_name": author_name.strip(),
                "authored_at": authored_at,
                "month": self._month_label(authored_dt)
            })

        return rows

    def _extract_yearly_commits_from_git_history(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        """Compute yearly commit counts from local git history"""
        history_rows = self._read_git_history_rows(owner, repo)
        if not history_rows:
            return []

        yearly_commits: Dict[int, int] = defaultdict(int)
        
        for row in history_rows:
            try:
                authored_dt = datetime.fromisoformat(row["authored_at"].replace("Z", "+00:00"))
                year = authored_dt.year
                yearly_commits[year] += 1
            except ValueError:
                continue

        # Sort by year and create list
        years = sorted(yearly_commits.keys())
        current_year = datetime.now().year
        
        yearly_data = []
        for year in years:
            yearly_data.append({
                "year": year,
                "commit_count": yearly_commits[year],
                "is_current": year == current_year
            })
        
        return yearly_data

    def _extract_yearly_contributors_from_git_history(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        """Compute yearly unique contributor counts from local git history"""
        history_rows = self._read_git_history_rows(owner, repo)
        if not history_rows:
            return []

        yearly_contributors: Dict[int, Set[str]] = defaultdict(set)
        
        for row in history_rows:
            try:
                authored_dt = datetime.fromisoformat(row["authored_at"].replace("Z", "+00:00"))
                year = authored_dt.year
                identity = row["identity"]
                yearly_contributors[year].add(identity)
            except ValueError:
                continue

        # Sort by year and create list
        years = sorted(yearly_contributors.keys())
        current_year = datetime.now().year
        
        yearly_data = []
        for year in years:
            yearly_data.append({
                "year": year,
                "contributor_count": len(yearly_contributors[year]),
                "is_current": year == current_year
            })
        
        return yearly_data

    def _extract_retention_from_git_history(self, owner: str, repo: str, months: int = 6) -> List[Dict[str, Any]]:
        """Compute contributor retention cohorts from local git history"""
        history_rows = self._read_git_history_rows(owner, repo)
        if not history_rows:
            return []

        contributor_months: Dict[str, Set[str]] = defaultdict(set)
        contributor_first_seen: Dict[str, str] = {}

        for row in history_rows:
            identity = row["identity"]
            month = row["month"]
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

    def _extract_committers_from_git_history(self, owner: str, repo: str, quarters: int = 4) -> List[Dict[str, Any]]:
        """Compute exact aggregated committers from local git history (all-time)"""
        history_rows = self._read_git_history_rows(owner, repo)
        if not history_rows:
            return []

        committer_counts: Dict[str, Dict[str, Any]] = {}

        # Process all commits (all-time)
        for row in history_rows:
            identity = row["identity"]
            if identity not in committer_counts:
                committer_counts[identity] = {
                    "identity": identity,
                    "email": row["email"] or (identity if "@" in identity else None),
                    "author_name": row["author_name"],
                    "commit_count": 0
                }

            committer_counts[identity]["commit_count"] += 1

        committers = []
        for identity, committer in sorted(
            committer_counts.items(),
            key=lambda item: item[1]["commit_count"],
            reverse=True
        ):
            profile = self.user_profile_cache.get(identity)
            if not profile and "@" not in identity:
                profile = self.user_profile_cache.get(identity.lower())

            if not profile:
                profile = {
                    "name": committer["author_name"] or None,
                    "company": "Unknown",
                    "location": None,
                    "email": committer["email"],
                    "profile_url": None
                }

            committers.append({
                "login": identity if "@" not in identity else (committer["author_name"] or identity.split("@")[0]),
                "name": profile["name"] or committer["author_name"] or None,
                "company": profile["company"],
                "location": profile["location"],
                "email": profile["email"] or committer["email"],
                "profile_url": profile["profile_url"],
                "commit_count": committer["commit_count"]
            })

        return committers

    def _merge_contributor_data(self, existing_data: Dict[str, Any], new_contributors: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Merge contributor records by login while preserving current schema"""
        existing_by_login = {
            contributor["login"]: contributor
            for contributor in existing_data.get("contributors", [])
            if contributor.get("login")
        }

        for contributor in new_contributors:
            existing_by_login[contributor["login"]] = contributor

        merged_contributors = sorted(
            existing_by_login.values(),
            key=lambda item: item.get("contributions", 0),
            reverse=True
        )

        company_count = defaultdict(int)
        for contributor in merged_contributors:
            company_count[contributor.get("company") or "Unknown"] += 1

        known_company_total = sum(count for company, count in company_count.items() if company != "Unknown")

        return {
            "total_contributors": len(merged_contributors),
            "contributors": merged_contributors,
            "companies": dict(sorted(company_count.items(), key=lambda item: item[1], reverse=True)),
            "total_companies": len(company_count),
            "retention_by_quarter": existing_data.get("retention_by_quarter", []),
            "company_diversity": {
                "known_company_contributors": known_company_total,
                "unknown_company_contributors": company_count.get("Unknown", 0),
                "top_companies": [
                    {"company": company, "contributor_count": count}
                    for company, count in sorted(company_count.items(), key=lambda item: item[1], reverse=True)[:10]
                ]
            },
            "time_scope": {
                "contributors": "all_time_github_contributors",
                "retention_by_quarter": f"last_{len(existing_data.get('retention_by_quarter', [])) or 0}_months_from_git_history"
            },
            "extracted_at": datetime.now().isoformat()
        }

    def _merge_commit_data(
        self,
        existing_data: Dict[str, Any],
        new_history_rows: List[Dict[str, str]],
        owner: str,
        repo: str,
        quarters: int = 4
    ) -> Dict[str, Any]:
        """Merge new git-history commits into aggregated commit data (all-time for committers)"""
        existing_committers = {
            (committer.get("email") or committer.get("login")): dict(committer)
            for committer in existing_data.get("committers", [])
        }

        quarter_dates = self._get_quarter_dates(quarters)
        quarter_buckets = {
            self._quarter_label(end_date): {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "commit_count": 0,
                "quarter": self._quarter_label(end_date)
            }
            for start_date, end_date in quarter_dates
        }

        for existing_quarter in existing_data.get("quarters", []):
            quarter_label = existing_quarter.get("quarter")
            if quarter_label in quarter_buckets:
                quarter_buckets[quarter_label]["commit_count"] = existing_quarter.get("commit_count", 0)

        # Process all commits for committers (all-time)
        for row in new_history_rows:
            try:
                authored_dt = datetime.fromisoformat(row["authored_at"].replace("Z", "+00:00")).replace(tzinfo=None)
            except ValueError:
                continue

            # Update quarter buckets (still quarterly for visualization)
            for start_date, end_date in quarter_dates:
                quarter_label = self._quarter_label(end_date)
                if start_date <= authored_dt <= end_date:
                    quarter_buckets[quarter_label]["commit_count"] += 1
                    break

            # Update committers (all-time)
            identity = row["identity"]
            profile = self.user_profile_cache.get(identity)
            if not profile:
                profile = {
                    "name": row["author_name"] or None,
                    "company": "Unknown",
                    "location": None,
                    "email": row["email"] or (identity if "@" in identity else None),
                    "profile_url": None
                }

            committer_key = profile["email"] or row["email"] or identity
            if committer_key not in existing_committers:
                existing_committers[committer_key] = {
                    "login": identity if "@" not in identity else (row["author_name"] or identity.split("@")[0]),
                    "name": profile["name"] or row["author_name"] or None,
                    "company": profile["company"],
                    "location": profile["location"],
                    "email": profile["email"] or row["email"] or None,
                    "profile_url": profile["profile_url"],
                    "commit_count": 0
                }

            existing_committers[committer_key]["commit_count"] += 1

        merged_committers = sorted(
            existing_committers.values(),
            key=lambda item: item.get("commit_count", 0),
            reverse=True
        )

        return {
            "total_commits": sum(bucket["commit_count"] for bucket in quarter_buckets.values()),
            "quarters": list(quarter_buckets.values()),
            "committers": merged_committers,
            "time_scope": {
                "total_commits": f"last_{quarters}_quarters",
                "quarters": f"last_{quarters}_quarters",
                "committers": "all_time_from_git_history"
            },
            "extracted_at": datetime.now().isoformat()
        }
    
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
    
    def extract_contributors(self, owner: str, repo: str, project_name: str, quarters: int = 4) -> Dict[str, Any]:
        """Extract complete contributor information with incremental profile enrichment and git-based counting"""
        print(f"👥 Extracting contributors for {owner}/{repo}...")
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            project_state = self._load_project_state(project_name)
            existing_data = self._load_json_file(self._project_dir(project_name) / "contributors.json", {})
            known_logins = set(project_state.get("contributors", {}).get("known_logins", []))

            # Get contributors from GitHub API (limited by pagination)
            contributors = repository.get_contributors()
            new_or_updated_contributors = []
            current_logins = set()
            
            for contributor in tqdm(contributors, desc="Processing GitHub contributors"):
                try:
                    current_logins.add(contributor.login)

                    if contributor.login in known_logins and contributor.login in self.user_profile_cache:
                        profile = self.user_profile_cache[contributor.login]
                    else:
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
                    
                    new_or_updated_contributors.append(contributor_info)
                    
                except GithubException as e:
                    print(f"⚠️  Error processing contributor {contributor.login}: {e}")
                    continue

            # Get accurate all-time contributor count from git history FIRST
            print(f"  ℹ️  Counting all-time contributors from git history...")
            history_rows = self._read_git_history_rows(owner, repo)
            all_time_contributors = set()
            for row in history_rows:
                all_time_contributors.add(row["identity"])
            
            git_contributor_count = len(all_time_contributors)
            
            # Add yearly contributor aggregations at the top
            yearly_contributors = self._extract_yearly_contributors_from_git_history(owner, repo)
            
            # Build contributors_data with yearly_contributors at the top
            contributors_data = {}
            contributors_data["yearly_contributors"] = yearly_contributors
            contributors_data["total_contributors"] = git_contributor_count
            contributors_data["total_contributors_git"] = git_contributor_count
            
            # Merge existing contributor profiles
            retention_months = max(quarters * 3, 6)
            merged_data = self._merge_contributor_data(existing_data, new_or_updated_contributors)
            
            # Add the rest of the data
            contributors_data["contributors"] = merged_data.get("contributors", [])
            contributors_data["total_contributors_github_api"] = len(contributors_data["contributors"])
            
            print(f"  ✓ GitHub API contributors: {contributors_data['total_contributors_github_api']}")
            print(f"  ✓ Git history contributors: {git_contributor_count}")
            
            contributors_data["retention_by_quarter"] = self._extract_retention_from_git_history(
                owner,
                repo,
                months=retention_months
            )
            
            contributors_data["time_scope"] = {
                "yearly_contributors": "all_time_from_git_history",
                "total_contributors": "all_time_from_git_history",
                "contributors": "all_time_github_contributors",
                "retention_by_quarter": f"last_{retention_months}_months_from_git_history"
            }

            project_state["contributors"] = {
                "known_logins": sorted(current_logins),
                "last_extracted_at": datetime.now().isoformat()
            }
            self._save_project_state(project_name, project_state)
            
            return contributors_data
            
        except GithubException as e:
            print(f"❌ Error extracting contributors: {e}")
            return {}
    
    def extract_commits(self, owner: str, repo: str, project_name: str, quarters: int = 4) -> Dict[str, Any]:
        """Extract exact aggregated commit activity and committer details (all-time for committers)"""
        print(f"📝 Extracting commits for {owner}/{repo}...")
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            project_state = self._load_project_state(project_name)
            existing_data = self._load_json_file(self._project_dir(project_name) / "commits.json", {})
            last_git_sync_at = project_state.get("commits", {}).get("last_git_sync_at")
            quarter_dates = self._get_quarter_dates(quarters)

            # For incremental updates, only fetch new commits since last sync
            # For initial run or if no previous data, fetch all history
            if existing_data and last_git_sync_at:
                print(f"  ℹ️  Incremental update: fetching commits since {last_git_sync_at}")
                new_history_rows = self._read_git_history_rows(owner, repo, since=last_git_sync_at)
            else:
                print(f"  ℹ️  Initial extraction: fetching all-time commit history")
                new_history_rows = self._read_git_history_rows(owner, repo)

            commits_data = self._merge_commit_data(
                existing_data,
                new_history_rows,
                owner,
                repo,
                quarters
            )

            refreshed_quarters = []
            total_commits = 0
            for start_date, end_date in tqdm(quarter_dates, desc="Processing quarters"):
                try:
                    commits = repository.get_commits(since=start_date, until=end_date)
                    commit_count = commits.totalCount
                    refreshed_quarters.append({
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "commit_count": commit_count,
                        "quarter": self._quarter_label(end_date)
                    })
                    total_commits += commit_count
                except (GithubException, IndexError) as e:
                    print(f"⚠️  Error processing quarter: {e}")
                    continue

            # Add yearly commit aggregations
            yearly_commits = self._extract_yearly_commits_from_git_history(owner, repo)
            
            commits_data["quarters"] = refreshed_quarters
            commits_data["years"] = yearly_commits
            commits_data["total_commits"] = total_commits
            commits_data["time_scope"] = {
                "total_commits": f"last_{quarters}_quarters",
                "quarters": f"last_{quarters}_quarters",
                "years": "all_time_from_git_history",
                "committers": "all_time_from_git_history"
            }
            commits_data["extracted_at"] = datetime.now().isoformat()

            project_state["commits"] = {
                "last_git_sync_at": datetime.now().isoformat()
            }
            self._save_project_state(project_name, project_state)
            
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
            
            # Skip detailed extraction if no issues exist (e.g., projects using JIRA)
            if issues_data["total_issues"] == 0:
                print(f"ℹ️  No GitHub issues found (project may use external issue tracker)")
                return issues_data
            
            resolution_times = []
            commenter_counts = defaultdict(int)

            issue_count = 0
            for issue in closed_issues:
                if issue_count >= 100:
                    break
                    
                if issue.pull_request is not None:
                    continue

                if issue.closed_at and issue.created_at:
                    delta = issue.closed_at - issue.created_at
                    resolution_times.append(delta.days)

                try:
                    comments = issue.get_comments()
                    comment_count = 0
                    for comment in comments:
                        if comment_count >= 50:
                            break
                        if comment.user and comment.user.login:
                            commenter_counts[comment.user.login] += 1
                        comment_count += 1
                except (GithubException, IndexError):
                    continue
                
                issue_count += 1
            
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
    
    def _get_quarters_since_creation(self, created_at: datetime) -> List[tuple]:
        """Generate list of quarter start/end dates from project creation to now"""
        quarters = []
        now = datetime.now()
        
        # Make created_at timezone-naive for comparison
        if created_at.tzinfo:
            created_at = created_at.replace(tzinfo=None)
        
        # Start from the beginning of the quarter when project was created
        start_year = created_at.year
        start_quarter = ((created_at.month - 1) // 3) + 1
        start_month = (start_quarter - 1) * 3 + 1
        current_start = datetime(start_year, start_month, 1)
        
        # Generate quarters from creation to now
        while current_start <= now:
            # Calculate end of quarter (last day of third month)
            end_month = current_start.month + 2
            end_year = current_start.year
            if end_month > 12:
                end_month -= 12
                end_year += 1
            
            # Get last day of the end month
            if end_month == 12:
                quarter_end = datetime(end_year, 12, 31, 23, 59, 59)
            else:
                next_month = datetime(end_year, end_month + 1, 1)
                quarter_end = next_month - timedelta(seconds=1)
            
            # Don't go beyond current time
            if quarter_end > now:
                quarter_end = now
            
            quarters.append((current_start, quarter_end))
            
            # Move to next quarter (add 3 months)
            next_month = current_start.month + 3
            next_year = current_start.year
            if next_month > 12:
                next_month -= 12
                next_year += 1
            current_start = datetime(next_year, next_month, 1)
        
        return quarters

    def extract_pull_requests(self, repos: List[Dict[str, str]], project_created_at: datetime) -> Dict[str, Any]:
        """Extract pull request metrics including merge timeline
        
        Args:
            repos: List of repo dicts with 'owner' and 'repo' keys
            project_created_at: When the project was created (from earliest repo)
        """
        print(f"🔀 Extracting pull requests for {len(repos)} repo(s)...")
        
        try:
            quarter_dates = self._get_quarters_since_creation(project_created_at)
            
            pr_data = {
                "total_prs": 0,
                "avg_time_to_merge_days": None,
                "quarters": [],
                "extracted_at": datetime.now().isoformat()
            }

            # Initialize quarter data structure
            quarter_data_map = {}
            for start_date, end_date in quarter_dates:
                quarter_label = self._quarter_label(end_date)
                quarter_data_map[quarter_label] = {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "pr_count": 0,
                    "merged_pr_count": 0,
                    "merge_times": [],
                    "quarter": quarter_label
                }

            overall_merge_times = []
            
            # Process each repository
            for repo_info in repos:
                owner = repo_info['owner']
                repo = repo_info['repo']
                print(f"  📦 Processing {owner}/{repo}...")
                
                try:
                    repository = self.github.get_repo(f"{owner}/{repo}")
                    
                    # Get all PRs for this repo
                    pulls = repository.get_pulls(state='all', sort='created', direction='asc')
                    
                    for pr in tqdm(pulls, desc=f"  Processing PRs from {owner}/{repo}", leave=False):
                        # Make pr.created_at timezone-naive for comparison
                        pr_created = pr.created_at.replace(tzinfo=None) if pr.created_at.tzinfo else pr.created_at
                        
                        # Find which quarter this PR belongs to
                        for start_date, end_date in quarter_dates:
                            if start_date <= pr_created <= end_date:
                                quarter_label = self._quarter_label(end_date)
                                quarter_data_map[quarter_label]["pr_count"] += 1
                                
                                if pr.merged_at:
                                    merge_days = (pr.merged_at - pr.created_at).total_seconds() / 86400
                                    quarter_data_map[quarter_label]["merged_pr_count"] += 1
                                    quarter_data_map[quarter_label]["merge_times"].append(round(merge_days, 2))
                                    overall_merge_times.append(round(merge_days, 2))
                                break
                    
                except GithubException as e:
                    print(f"  ⚠️  Error processing {owner}/{repo}: {e}")
                    continue

            # Convert quarter data map to list and calculate averages
            for quarter_label in sorted(quarter_data_map.keys()):
                quarter_info = quarter_data_map[quarter_label]
                merge_times = quarter_info.pop("merge_times")
                
                quarter_info["avg_time_to_merge_days"] = (
                    round(sum(merge_times) / len(merge_times), 2)
                    if merge_times else None
                )
                
                pr_data["quarters"].append(quarter_info)
                pr_data["total_prs"] += quarter_info["pr_count"]

            if overall_merge_times:
                pr_data["avg_time_to_merge_days"] = round(
                    sum(overall_merge_times) / len(overall_merge_times), 2
                )
            
            return pr_data
            
        except Exception as e:
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

            release_count = 0
            for release in releases:
                if release_count >= 20:
                    break
                    
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
                release_count += 1

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
            
            project_name = project['name']
            
            # Support both single repo and multiple repos
            if 'repos' in project:
                # Multiple repos configuration
                repos = project['repos']
            else:
                # Single repo configuration (backward compatible)
                repos = [{'owner': project['owner'], 'repo': project['repo']}]
            
            # Use the first/primary repo for metadata
            primary_repo = repos[0]
            owner = primary_repo['owner']
            repo = primary_repo['repo']
            
            # Extract all data types
            metadata = self.extract_project_metadata(owner, repo)
            project_created_at = None
            if metadata:
                self.save_project_data(project_name, metadata, "metadata")
                # Parse created_at for PR extraction
                project_created_at = datetime.fromisoformat(metadata['created_at'].replace('+00:00', ''))
            
            # For multi-repo projects, find the earliest creation date
            if len(repos) > 1 and project_created_at:
                for repo_info in repos[1:]:
                    try:
                        repository = self.github.get_repo(f"{repo_info['owner']}/{repo_info['repo']}")
                        repo_created = repository.created_at.replace(tzinfo=None) if repository.created_at.tzinfo else repository.created_at
                        if repo_created < project_created_at:
                            project_created_at = repo_created
                    except GithubException as e:
                        print(f"⚠️  Could not get creation date for {repo_info['owner']}/{repo_info['repo']}: {e}")
            
            contributors = self.extract_contributors(owner, repo, project_name)
            if contributors:
                self.save_project_data(project_name, contributors, "contributors")
            
            commits = self.extract_commits(owner, repo, project_name)
            if commits:
                self.save_project_data(project_name, commits, "commits")
            
            issues = self.extract_issues(owner, repo)
            if issues:
                self.save_project_data(project_name, issues, "issues")
            
            # Extract pull requests with new method supporting multiple repos
            if project_created_at:
                pull_requests = self.extract_pull_requests(repos, project_created_at)
                if pull_requests:
                    self.save_project_data(project_name, pull_requests, "pull_requests")
            else:
                print("⚠️  Skipping pull request extraction - no creation date available")
            
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
        try:
            rate_limit = extractor.github.get_rate_limit()
            if hasattr(rate_limit, 'core'):
                print(f"📊 Rate limit: {rate_limit.core.remaining} requests remaining\n")
            else:
                print(f"📊 Rate limit info available\n")
        except:
            print(f"📊 Connected to GitHub API\n")
    except GithubException as e:
        print(f"❌ Authentication failed: {e}")
        print("Please check your GitHub token in config.yaml")
        return
    
    # Extract all project data
    extractor.extract_all_projects()


if __name__ == "__main__":
    main()

# Made with Bob
