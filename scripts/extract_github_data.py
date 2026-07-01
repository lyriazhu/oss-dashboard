#!/usr/bin/env python3
"""
GitHub Data Extraction Script
Extracts contributor, commit, issue, and PR data from GitHub repositories
"""

import os
import json
import yaml
import subprocess
import statistics
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
        token = os.environ.get("GITHUB_TOKEN")
        if not token:
            raise ValueError("GITHUB_TOKEN environment variable is required")
        self.github = Github(token)
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
        """Return normalized project data directory with ID mapping"""
        # Keys are config 'name' values; values are the data directory names
        # (must match backend DataService.java getProjectDirectoryName())
        dir_name_map = {
            # config name -> data dir
            "Strimzi": "strimzi",
            "Apache Camel": "apache-camel",
            "Apache ActiveMQ": "apache-activemq",
            "Apicurio Registry": "apicurio",
            "3scale": "3scale",
            "Keycloak": "keycloak",
            # legacy repo-name keys kept for backward compatibility
            "strimzi-kafka-operator": "strimzi",
            "camel": "apache-camel",
            "activemq": "apache-activemq",
            "apicurio-registry": "apicurio",
            "3scale-operator": "3scale",
        }
        
        # Use mapped name if exists, otherwise normalize the project name
        dir_name = dir_name_map.get(project_name, project_name.lower().replace(" ", "-"))
        return self.data_dir / dir_name

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
                },
                "pull_requests": {
                    "last_extracted_at": None
                },
                "issues": {
                    "last_extracted_at": None
                },
                "releases": {
                    "last_extracted_at": None
                }
            }
        )

    def _save_project_state(self, project_name: str, state: Dict[str, Any]):
        """Save per-project extraction state"""
        self._save_json_file(self._project_state_path(project_name), state)
    
    def _get_quarter_dates(self, quarters_back: int = 12) -> List[tuple]:
        """Generate list of calendar quarter start/end dates ending at the current quarter."""
        quarters = []
        now = datetime.now()

        # Find the start of the NEXT quarter so the first iteration produces the current quarter.
        current_q = (now.month - 1) // 3  # 0-indexed: 0=Q1, 1=Q2, 2=Q3, 3=Q4
        next_q_start_month = (current_q + 1) * 3 + 1  # first month of the next quarter
        if next_q_start_month > 12:
            quarter_end = datetime(now.year + 1, next_q_start_month - 12, 1)
        else:
            quarter_end = datetime(now.year, next_q_start_month, 1)

        for _ in range(quarters_back):
            q_end = quarter_end
            # Step back one quarter
            q_start_month = q_end.month - 3
            if q_start_month <= 0:
                q_start = datetime(q_end.year - 1, q_start_month + 12, 1)
            else:
                q_start = datetime(q_end.year, q_start_month, 1)
            quarters.append((q_start, q_end))
            quarter_end = q_start

        return quarters

    def _quarter_label(self, dt: datetime) -> str:
        """Return quarter label for a datetime (uses the quarter containing the date)."""
        # For a quarter start/end boundary, label by the quarter that ends at dt
        # dt is a quarter-start date; label the quarter that precedes it
        label_month = dt.month - 1 if dt.month > 1 else 12
        label_year = dt.year if dt.month > 1 else dt.year - 1
        return f"Q{((label_month - 1) // 3) + 1} {label_year}"

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

    def _build_contributor_history(self, history_rows: List[Dict[str, str]]) -> tuple:
        """
        Build all-time contributor history structures from git rows.

        Returns:
            contributor_first_commit: Dict[identity -> ISO date string of first ever commit]
            contributor_quarters: Dict[identity -> Set[quarter_label]]
            contributor_years: Dict[identity -> Set[year int]]
        """
        contributor_first_commit: Dict[str, str] = {}
        contributor_quarters: Dict[str, Set[str]] = defaultdict(set)
        contributor_years: Dict[str, Set[int]] = defaultdict(set)

        for row in history_rows:
            identity = row["identity"]
            authored_at = row["authored_at"]

            # Track first ever commit (ISO string comparison is safe for sorting)
            if identity not in contributor_first_commit or authored_at < contributor_first_commit[identity]:
                contributor_first_commit[identity] = authored_at

            try:
                dt = datetime.fromisoformat(authored_at.replace("Z", "+00:00")).replace(tzinfo=None)
            except ValueError:
                continue

            year = dt.year
            contributor_years[identity].add(year)

            # Quarter label: which calendar quarter does this commit fall in?
            q_num = ((dt.month - 1) // 3) + 1
            q_start_month = (q_num - 1) * 3 + 1
            # The "end" boundary is the first day of the *next* quarter (used by _quarter_label)
            end_month = q_start_month + 3
            if end_month > 12:
                q_end = datetime(dt.year + 1, end_month - 12, 1)
            else:
                q_end = datetime(dt.year, end_month, 1)
            label = self._quarter_label(q_end)
            contributor_quarters[identity].add(label)

        return contributor_first_commit, contributor_quarters, contributor_years

    def _extract_quarterly_retention(self, owner: str, repo: str, quarters: int = 12) -> List[Dict[str, Any]]:
        """
        Compute per-quarter contributor retention for the last N quarters.

        New contributor: their very first commit ever falls within this quarter.
        Returning contributor: they committed this quarter but had committed in any prior quarter.
        Identity is normalized email (or author name if email absent) — the most stable
        cross-commit unique identifier available from git history.
        """
        history_rows = self._read_git_history_rows(owner, repo)
        if not history_rows:
            return []

        contributor_first_commit, contributor_quarters, _ = self._build_contributor_history(history_rows)

        # Build the target quarter windows (last N quarters, chronological order)
        quarter_dates = self._get_quarter_dates(quarters)  # newest-first list of (start, end)
        quarter_windows = []
        for start_dt, end_dt in reversed(quarter_dates):  # chronological
            label = self._quarter_label(end_dt)
            quarter_windows.append((label, start_dt, end_dt))

        retention_rows = []
        for label, q_start, q_end in quarter_windows:
            # Identities who committed during this quarter
            active = {
                identity
                for identity, qs in contributor_quarters.items()
                if label in qs
            }

            # New: first-ever commit falls within this quarter window
            new_contributors = set()
            for identity in active:
                first_commit_dt = datetime.fromisoformat(
                    contributor_first_commit[identity].replace("Z", "+00:00")
                ).replace(tzinfo=None)
                if q_start <= first_commit_dt < q_end:
                    new_contributors.add(identity)

            returning = active - new_contributors
            active_count = len(active)
            new_count = len(new_contributors)
            returning_count = len(returning)

            retention_rows.append({
                "period": label,
                "period_type": "quarter",
                "start_date": q_start.isoformat(),
                "end_date": q_end.isoformat(),
                "active_contributors": active_count,
                "new_contributors": new_count,
                "returning_contributors": returning_count,
                "retention_rate": round((returning_count / active_count) * 100, 2) if active_count else None
            })

        return retention_rows

    def _extract_yearly_retention(self, owner: str, repo: str) -> List[Dict[str, Any]]:
        """
        Compute per-year contributor retention for all years with commit history.

        New contributor: their very first commit ever falls within this calendar year.
        Returning contributor: they committed this year but had committed in any prior year.
        Identity is normalized email (or author name if email absent).
        """
        history_rows = self._read_git_history_rows(owner, repo)
        if not history_rows:
            return []

        contributor_first_commit, _, contributor_years = self._build_contributor_history(history_rows)

        all_years = sorted({year for years_set in contributor_years.values() for year in years_set})
        if not all_years:
            return []

        current_year = datetime.now().year
        retention_rows = []

        for year in all_years:
            year_start = datetime(year, 1, 1)
            year_end = datetime(year + 1, 1, 1)

            # Identities who committed during this year
            active = {
                identity
                for identity, years_set in contributor_years.items()
                if year in years_set
            }

            # New: first-ever commit falls within this calendar year
            new_contributors = set()
            for identity in active:
                first_commit_dt = datetime.fromisoformat(
                    contributor_first_commit[identity].replace("Z", "+00:00")
                ).replace(tzinfo=None)
                if year_start <= first_commit_dt < year_end:
                    new_contributors.add(identity)

            returning = active - new_contributors
            active_count = len(active)
            new_count = len(new_contributors)
            returning_count = len(returning)

            retention_rows.append({
                "period": str(year),
                "period_type": "year",
                "start_date": year_start.isoformat(),
                "end_date": year_end.isoformat(),
                "active_contributors": active_count,
                "new_contributors": new_count,
                "returning_contributors": returning_count,
                "retention_rate": round((returning_count / active_count) * 100, 2) if active_count else None,
                "is_current": year == current_year
            })

        return retention_rows

    def _extract_committers_from_git_history(self, owner: str, repo: str, quarters: int = 12) -> List[Dict[str, Any]]:
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
            "retention_by_year": existing_data.get("retention_by_year", []),
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
        quarters: int = 12
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
    
    def _compute_top_companies(self, project_name: str) -> List[Dict[str, Any]]:
        """Compute top contributing companies from the saved contributors.json file."""
        contributors_data = self._load_json_file(
            self._project_dir(project_name) / "contributors.json", {}
        )
        company_contribution_counts: Dict[str, int] = defaultdict(int)
        for contributor in contributors_data.get("contributors", []):
            company = contributor.get("company") or "Unknown"
            contribution_count = contributor.get("contributions") or 0
            if company == "Unknown" or not contribution_count:
                continue
            company_contribution_counts[company] += contribution_count

        total = sum(company_contribution_counts.values())
        if not total:
            return []
        return [
            {
                "company": company,
                "commits": contributions,
                "percentage": round((contributions / total) * 100, 2)
            }
            for company, contributions in sorted(
                company_contribution_counts.items(),
                key=lambda item: item[1],
                reverse=True
            )[:10]
        ]

    def refresh_metadata_companies(self, project_name: str) -> bool:
        """Patch the saved metadata.json with fresh top_contributing_companies from contributors.json.

        Called after extract_contributors so the company data is always up to date.
        Returns True if metadata was updated, False otherwise.
        """
        meta_path = self._project_dir(project_name) / "metadata.json"
        if not meta_path.exists():
            return False
        metadata = self._load_json_file(meta_path, {})
        if not metadata:
            return False
        top_companies = self._compute_top_companies(project_name)
        metadata["top_contributing_companies"] = top_companies
        self._save_json_file(meta_path, metadata)
        print(f"  ✓ Updated top_contributing_companies ({len(top_companies)} companies)")
        return True

    def extract_project_metadata(self, owner: str, repo: str, project_name: Optional[str] = None) -> Dict[str, Any]:
        """Extract basic project metadata.

        top_contributing_companies is always written as [] here — it is populated
        by refresh_metadata_companies() which must be called after extract_contributors().
        """
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
                "top_contributing_companies": [],
                "extracted_at": datetime.now().isoformat()
            }

            return metadata

        except GithubException as e:
            print(f"❌ Error extracting metadata: {e}")
            return {}
    
    def extract_contributors(self, owner: str, repo: str, project_name: str, quarters: int = 12) -> Dict[str, Any]:
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
            merged_data = self._merge_contributor_data(existing_data, new_or_updated_contributors)

            # Add the rest of the data
            contributors_data["contributors"] = merged_data.get("contributors", [])
            contributors_data["total_contributors_github_api"] = len(contributors_data["contributors"])
            contributors_data["companies"] = merged_data.get("companies", {})
            contributors_data["total_companies"] = merged_data.get("total_companies", 0)
            contributors_data["company_diversity"] = merged_data.get("company_diversity", {})

            print(f"  ✓ GitHub API contributors: {contributors_data['total_contributors_github_api']}")
            print(f"  ✓ Git history contributors: {git_contributor_count}")

            print(f"  ℹ️  Computing quarterly retention (last {quarters} quarters)...")
            contributors_data["retention_by_quarter"] = self._extract_quarterly_retention(
                owner, repo, quarters=quarters
            )

            print(f"  ℹ️  Computing yearly retention (all-time)...")
            contributors_data["retention_by_year"] = self._extract_yearly_retention(owner, repo)

            contributors_data["time_scope"] = {
                "yearly_contributors": "all_time_from_git_history",
                "total_contributors": "all_time_from_git_history",
                "contributors": "all_time_github_contributors",
                "retention_by_quarter": f"last_{quarters}_quarters_from_git_history",
                "retention_by_year": "all_time_from_git_history"
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
    
    def extract_commits(self, owner: str, repo: str, project_name: str, quarters: int = 12) -> Dict[str, Any]:
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
    
    def extract_issues(self, repos: List[Dict[str, str]], project_created_at: datetime, project_name: str) -> Dict[str, Any]:
        """Extract issue metrics including monthly and yearly aggregations with incremental updates
        
        Args:
            repos: List of repo dicts with 'owner' and 'repo' keys
            project_created_at: When the project was created (from earliest repo)
            project_name: Name of the project for state management
        """
        print(f"🐛 Extracting issues for {len(repos)} repo(s)...")
        
        try:
            project_state = self._load_project_state(project_name)
            last_extracted_at = project_state.get("issues", {}).get("last_extracted_at")
            
            month_dates = self._get_last_n_months(12)  # Get last 12 months
            
            # Handle project_created_at - ensure it's a datetime object
            if project_created_at is None:
                # Default to 5 years ago if no creation date
                project_created_at = datetime.now() - timedelta(days=365*5)
            elif isinstance(project_created_at, str):
                # Parse if it's a string
                project_created_at = datetime.fromisoformat(project_created_at.replace('+00:00', '').replace('Z', ''))
            
            years = self._get_years_since_creation(project_created_at)  # Get all years
            
            # For initial extraction, start fresh. For incremental, load existing data
            if last_extracted_at:
                existing_data = self._load_json_file(self._project_dir(project_name) / "issues.json", {})
                issue_data = {
                    "total_open": 0,
                    "total_closed": existing_data.get("total_closed", 0),
                    "total_issues": existing_data.get("total_issues", 0),
                    "median_resolution_time_days": existing_data.get("median_resolution_time_days"),
                    "months": existing_data.get("months", []),
                    "years": existing_data.get("years", []),
                    "extracted_at": datetime.now().isoformat()
                }
            else:
                # Initial extraction - start with empty data
                issue_data = {
                    "total_open": 0,
                    "total_closed": 0,
                    "total_issues": 0,
                    "median_resolution_time_days": None,
                    "months": [],
                    "years": [],
                    "extracted_at": datetime.now().isoformat()
                }

            # Initialize month data structure
            month_data_map = {}
            if last_extracted_at:
                # For incremental updates, preserve existing month data
                for month_info in issue_data["months"]:
                    month_label = month_info["month"]
                    month_data_map[month_label] = {
                        "start_date": month_info["start_date"],
                        "end_date": month_info["end_date"],
                        "issue_count": month_info["issue_count"],
                        "closed_issue_count": month_info["closed_issue_count"],
                        "resolution_times": [],
                        "month": month_label,
                        "median_resolution_time_days": month_info.get("median_resolution_time_days")
                    }
            
            # Add any new months not in existing data
            for start_date, end_date in month_dates:
                month_label = self._month_label(end_date)
                if month_label not in month_data_map:
                    month_data_map[month_label] = {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "issue_count": 0,
                        "closed_issue_count": 0,
                        "resolution_times": [],
                        "month": month_label
                    }
            
            # Initialize year data structure
            year_data_map = {}
            if last_extracted_at:
                # For incremental updates, preserve existing year data
                for year_info in issue_data["years"]:
                    year = year_info["year"]
                    year_data_map[year] = {
                        "year": year,
                        "issue_count": year_info["issue_count"],
                        "closed_issue_count": year_info["closed_issue_count"]
                    }
            
            # Add any new years not in existing data
            for year in years:
                if year not in year_data_map:
                    year_data_map[year] = {
                        "year": year,
                        "issue_count": 0,
                        "closed_issue_count": 0
                    }

            overall_resolution_times = []
            total_open_count = 0
            
            # Determine since date for incremental updates
            since_date = None
            if last_extracted_at:
                # Parse the ISO format string and make it timezone-naive
                since_date = datetime.fromisoformat(last_extracted_at)
                if since_date.tzinfo:
                    since_date = since_date.replace(tzinfo=None)
                print(f"  ℹ️  Incremental update: fetching issues updated since {last_extracted_at}")
            else:
                print(f"  ℹ️  Initial extraction: fetching all issues")
            
            # Process each repository
            for repo_info in repos:
                owner = repo_info['owner']
                repo = repo_info['repo']
                print(f"  📦 Processing {owner}/{repo}...")
                
                try:
                    repository = self.github.get_repo(f"{owner}/{repo}")
                    
                    # Count current open issues (always get fresh count)
                    print(f"    📊 Counting open issues...")
                    repo_open_count = 0
                    for issue in repository.get_issues(state='open'):
                        if issue.pull_request is None:
                            repo_open_count += 1
                    total_open_count += repo_open_count
                    print(f"    ✓ Open issues: {repo_open_count}")
                    
                    # Get issues - either all or only updated since last extraction
                    if since_date:
                        # For incremental updates, get recently updated issues
                        issues = repository.get_issues(state='all', sort='updated', direction='desc')
                    else:
                        # For initial extraction, get all issues
                        issues = repository.get_issues(state='all', sort='created', direction='asc')
                    
                    issue_count = 0
                    processed_issue_ids = set()  # Track which issues we've processed
                    
                    for issue in tqdm(issues, desc=f"  Processing issues from {owner}/{repo}", leave=False):
                        # Skip pull requests
                        if issue.pull_request is not None:
                            continue
                        
                        # For incremental updates, stop when we reach issues we've already processed
                        # Only break if we're doing incremental AND the issue was updated before our cutoff
                        if since_date and issue.updated_at:
                            issue_updated = issue.updated_at.replace(tzinfo=None) if issue.updated_at.tzinfo else issue.updated_at
                            # Only break if we've processed enough issues in incremental mode
                            if issue_updated < since_date and issue_count >= 100:
                                break
                        
                        # Make issue.created_at timezone-naive for comparison
                        issue_created = issue.created_at.replace(tzinfo=None) if issue.created_at.tzinfo else issue.created_at
                        
                        # Track this issue to avoid double-counting
                        processed_issue_ids.add(issue.number)
                        
                        # Find which month this issue belongs to (only for last 12 months)
                        # Only increment if this is a new issue (not in existing data)
                        for start_date, end_date in month_dates:
                            if start_date <= issue_created <= end_date:
                                month_label = self._month_label(end_date)
                                # For incremental updates, only count if issue was created after last extraction
                                if not since_date or issue_created >= since_date:
                                    month_data_map[month_label]["issue_count"] += 1
                                    
                                    if issue.closed_at:
                                        resolution_days = (issue.closed_at - issue.created_at).total_seconds() / 86400
                                        month_data_map[month_label]["closed_issue_count"] += 1
                                        month_data_map[month_label]["resolution_times"].append(round(resolution_days, 2))
                                        overall_resolution_times.append(round(resolution_days, 2))
                                break
                        
                        # Track issue by year (for all issues, not just last 12 months)
                        # Only increment if this is a new issue (not in existing data)
                        issue_year = issue_created.year
                        if issue_year in year_data_map:
                            # For incremental updates, only count if issue was created after last extraction
                            if not since_date or issue_created >= since_date:
                                year_data_map[issue_year]["issue_count"] += 1
                                if issue.closed_at:
                                    year_data_map[issue_year]["closed_issue_count"] += 1
                        
                        issue_count += 1
                        # Limit processing for very large repos
                        # For initial extraction: process up to 2000 issues
                        # For incremental updates: process up to 1000 issues
                        if since_date and issue_count >= 1000:
                            break
                        elif not since_date and issue_count >= 2000:
                            print(f"    ℹ️  Reached limit of 2000 issues for initial extraction")
                            break
                    
                except GithubException as e:
                    print(f"  ⚠️  Error processing {owner}/{repo}: {e}")
                    continue

            # Convert month data map to list and calculate medians
            issue_data["months"] = []
            total_issues_from_months = 0
            total_closed_from_months = 0
            for month_label in sorted(month_data_map.keys()):
                month_info = month_data_map[month_label]
                resolution_times = month_info.pop("resolution_times")
                
                # Calculate median if we have resolution times
                if resolution_times:
                    month_info["median_resolution_time_days"] = round(statistics.median(resolution_times), 2)
                
                issue_data["months"].append(month_info)
                total_issues_from_months += month_info["issue_count"]
                total_closed_from_months += month_info["closed_issue_count"]
            
            # Convert year data map to list
            issue_data["years"] = []
            for year in sorted(year_data_map.keys()):
                year_info = year_data_map[year]
                issue_data["years"].append(year_info)

            # Update totals
            issue_data["total_open"] = total_open_count
            issue_data["total_closed"] = total_closed_from_months
            issue_data["total_issues"] = total_issues_from_months
            
            if overall_resolution_times:
                issue_data["median_resolution_time_days"] = round(
                    statistics.median(overall_resolution_times), 2
                )
            
            print(f"  📈 Total issues: {issue_data['total_issues']} (Open: {issue_data['total_open']}, Closed: {issue_data['total_closed']})")
            
            project_state["issues"] = {"last_extracted_at": datetime.now().isoformat()}
            self._save_project_state(project_name, project_state)
            
            return issue_data
            
        except Exception as e:
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
    
    def _get_months_since_creation(self, created_at: datetime) -> List[tuple]:
        """Generate list of month start/end dates from project creation to now"""
        months = []
        now = datetime.now()
        
        # Make created_at timezone-naive for comparison
        if created_at.tzinfo:
            created_at = created_at.replace(tzinfo=None)
        
        # Start from the beginning of the month when project was created
        current_start = datetime(created_at.year, created_at.month, 1)
        
        # Generate months from creation to now
        while current_start <= now:
            # Calculate end of month (last day of month)
            if current_start.month == 12:
                month_end = datetime(current_start.year, 12, 31, 23, 59, 59)
            else:
                next_month = datetime(current_start.year, current_start.month + 1, 1)
                month_end = next_month - timedelta(seconds=1)
            
            # Don't go beyond current time
            if month_end > now:
                month_end = now
            
            months.append((current_start, month_end))
            
            # Move to next month
            if current_start.month == 12:
                current_start = datetime(current_start.year + 1, 1, 1)
            else:
                current_start = datetime(current_start.year, current_start.month + 1, 1)
        
        return months
    
    def _get_last_n_months(self, n: int = 12) -> List[tuple]:
        """Generate list of the last N months (default 12) from now going backwards"""
        months = []
        now = datetime.now()
        
        # Start from the beginning of the current month
        current_start = datetime(now.year, now.month, 1)
        
        # Generate N months going backwards
        for _ in range(n):
            # Calculate end of month (last day of month)
            if current_start.month == 12:
                month_end = datetime(current_start.year, 12, 31, 23, 59, 59)
            else:
                next_month = datetime(current_start.year, current_start.month + 1, 1)
                month_end = next_month - timedelta(seconds=1)
            
            # For current month, don't go beyond now
            if month_end > now:
                month_end = now
            
            months.insert(0, (current_start, month_end))  # Insert at beginning to maintain chronological order
            
            # Move to previous month
            if current_start.month == 1:
                current_start = datetime(current_start.year - 1, 12, 1)
            else:
                current_start = datetime(current_start.year, current_start.month - 1, 1)
        
        return months
    
    def _get_years_since_creation(self, created_at: datetime) -> List[int]:
        """Generate list of years from project creation to now"""
        now = datetime.now()
        
        # Make created_at timezone-naive for comparison
        if created_at.tzinfo:
            created_at = created_at.replace(tzinfo=None)
        
        start_year = created_at.year
        current_year = now.year
        
        return list(range(start_year, current_year + 1))

    def extract_pull_requests(self, repos: List[Dict[str, str]], project_created_at: datetime, project_name: str) -> Dict[str, Any]:
        """Extract pull request metrics including merge timeline with incremental updates
        
        Args:
            repos: List of repo dicts with 'owner' and 'repo' keys
            project_created_at: When the project was created (from earliest repo)
            project_name: Name of the project for state management
        """
        print(f"🔀 Extracting pull requests for {len(repos)} repo(s)...")
        
        try:
            project_state = self._load_project_state(project_name)
            existing_data = self._load_json_file(self._project_dir(project_name) / "pull_requests.json", {})
            last_extracted_at = project_state.get("pull_requests", {}).get("last_extracted_at")
            
            month_dates = self._get_last_n_months(12)  # Get last 12 months
            years = self._get_years_since_creation(project_created_at)  # Get all years
            
            pr_data = {
                "total_prs": existing_data.get("total_prs", 0),
                "median_time_to_merge_days": existing_data.get("median_time_to_merge_days"),
                "months": existing_data.get("months", []),
                "years": existing_data.get("years", []),
                "extracted_at": datetime.now().isoformat()
            }

            # Initialize month data structure from existing data
            month_data_map = {}
            for month_info in pr_data["months"]:
                month_label = month_info["month"]
                month_data_map[month_label] = {
                    "start_date": month_info["start_date"],
                    "end_date": month_info["end_date"],
                    "pr_count": month_info["pr_count"],
                    "merged_pr_count": month_info["merged_pr_count"],
                    "merge_times": [],
                    "month": month_label,
                    "median_time_to_merge_days": month_info.get("median_time_to_merge_days")
                }
            
            # Add any new months not in existing data
            for start_date, end_date in month_dates:
                month_label = self._month_label(end_date)
                if month_label not in month_data_map:
                    month_data_map[month_label] = {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "pr_count": 0,
                        "merged_pr_count": 0,
                        "merge_times": [],
                        "month": month_label
                    }
            
            # Initialize year data structure from existing data
            year_data_map = {}
            for year_info in pr_data["years"]:
                year = year_info["year"]
                year_data_map[year] = {
                    "year": year,
                    "pr_count": year_info["pr_count"],
                    "merged_pr_count": year_info["merged_pr_count"]
                }
            
            # Add any new years not in existing data
            for year in years:
                if year not in year_data_map:
                    year_data_map[year] = {
                        "year": year,
                        "pr_count": 0,
                        "merged_pr_count": 0
                    }

            overall_merge_times = []
            
            # Determine since date for incremental updates
            since_date = None
            if last_extracted_at:
                # Parse the ISO format string and make it timezone-naive
                since_date = datetime.fromisoformat(last_extracted_at)
                if since_date.tzinfo:
                    since_date = since_date.replace(tzinfo=None)
                print(f"  ℹ️  Incremental update: fetching PRs updated since {last_extracted_at}")
            else:
                print(f"  ℹ️  Initial extraction: fetching all PRs")
            
            # Process each repository
            for repo_info in repos:
                owner = repo_info['owner']
                repo = repo_info['repo']
                print(f"  📦 Processing {owner}/{repo}...")
                
                try:
                    repository = self.github.get_repo(f"{owner}/{repo}")
                    
                    # Get PRs - either all or only updated since last extraction
                    if since_date:
                        # For incremental updates, get recently updated PRs
                        pulls = repository.get_pulls(state='all', sort='updated', direction='desc')
                    else:
                        # For initial extraction, get all PRs
                        pulls = repository.get_pulls(state='all', sort='created', direction='asc')
                    
                    pr_count = 0
                    for pr in tqdm(pulls, desc=f"  Processing PRs from {owner}/{repo}", leave=False):
                        # For incremental updates, stop when we reach PRs we've already processed
                        if since_date and pr.updated_at:
                            pr_updated = pr.updated_at.replace(tzinfo=None) if pr.updated_at.tzinfo else pr.updated_at
                            if pr_updated < since_date:
                                break
                        
                        # Make pr.created_at timezone-naive for comparison
                        pr_created = pr.created_at.replace(tzinfo=None) if pr.created_at.tzinfo else pr.created_at
                        
                        # Find which month this PR belongs to
                        for start_date, end_date in month_dates:
                            if start_date <= pr_created <= end_date:
                                month_label = self._month_label(end_date)
                                
                                # Only increment if this is a new PR (initial extraction or not yet counted)
                                if not since_date or pr_created >= since_date:
                                    month_data_map[month_label]["pr_count"] += 1
                                
                                if pr.merged_at:
                                    merge_days = (pr.merged_at - pr.created_at).total_seconds() / 86400
                                    if not since_date or pr_created >= since_date:
                                        month_data_map[month_label]["merged_pr_count"] += 1
                                    month_data_map[month_label]["merge_times"].append(round(merge_days, 2))
                                    overall_merge_times.append(round(merge_days, 2))
                                break
                        
                        # Track PR by year (for all PRs, not just last 12 months)
                        pr_year = pr_created.year
                        if pr_year in year_data_map:
                            if not since_date or pr_created >= since_date:
                                year_data_map[pr_year]["pr_count"] += 1
                            if pr.merged_at:
                                if not since_date or pr_created >= since_date:
                                    year_data_map[pr_year]["merged_pr_count"] += 1
                        
                        pr_count += 1
                        # Limit processing for very large repos during incremental updates
                        if since_date and pr_count >= 500:
                            break
                    
                except GithubException as e:
                    print(f"  ⚠️  Error processing {owner}/{repo}: {e}")
                    continue

            # Convert month data map to list and calculate medians
            pr_data["months"] = []
            pr_data["total_prs"] = 0
            for month_label in sorted(month_data_map.keys()):
                month_info = month_data_map[month_label]
                merge_times = month_info.pop("merge_times")
                
                # Calculate median if we have merge times
                if merge_times:
                    month_info["median_time_to_merge_days"] = round(statistics.median(merge_times), 2)
                
                pr_data["months"].append(month_info)
                pr_data["total_prs"] += month_info["pr_count"]
            
            # Convert year data map to list
            pr_data["years"] = []
            for year in sorted(year_data_map.keys()):
                year_info = year_data_map[year]
                pr_data["years"].append(year_info)

            if overall_merge_times:
                pr_data["median_time_to_merge_days"] = round(
                    statistics.median(overall_merge_times), 2
                )
            
            project_state["pull_requests"] = {"last_extracted_at": datetime.now().isoformat()}
            self._save_project_state(project_name, project_state)
            
            return pr_data
            
        except Exception as e:
            print(f"❌ Error extracting pull requests: {e}")
            return {}
    
    def extract_releases(self, owner: str, repo: str, project_name: str) -> Dict[str, Any]:
        """Extract release information and cadence summary with incremental updates"""
        print(f"🚀 Extracting releases for {owner}/{repo}...")
        
        try:
            repository = self.github.get_repo(f"{owner}/{repo}")
            project_state = self._load_project_state(project_name)
            existing_data = self._load_json_file(self._project_dir(project_name) / "releases.json", {})
            last_extracted_at = project_state.get("releases", {}).get("last_extracted_at")
            
            releases = repository.get_releases()
            
            # Start with existing data
            release_list = existing_data.get("recent_releases", [])
            existing_tags = {r["tag_name"] for r in release_list}
            
            published_dates = []
            new_releases_count = 0

            # For incremental updates, only process new releases
            if last_extracted_at:
                print(f"  ℹ️  Incremental update: checking for new releases since {last_extracted_at}")
                last_extracted_date = datetime.fromisoformat(last_extracted_at)
            else:
                print(f"  ℹ️  Initial extraction: fetching all releases")
                last_extracted_date = None

            release_count = 0
            for release in releases:
                # Stop after checking enough releases
                if release_count >= 20 and last_extracted_date:
                    break
                
                # Skip if we already have this release
                if release.tag_name in existing_tags:
                    release_count += 1
                    continue
                
                # For incremental updates, stop when we reach old releases
                if last_extracted_date and release.published_at:
                    release_published = release.published_at.replace(tzinfo=None) if release.published_at.tzinfo else release.published_at
                    if release_published < last_extracted_date:
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
                release_list.insert(0, release_info)  # Add to beginning to maintain order
                new_releases_count += 1
                release_count += 1

            # Keep only the most recent 20 releases
            release_list = release_list[:20]
            
            # Recalculate cadence from the release list
            published_dates = []
            for release_info in release_list:
                if release_info["published_at"]:
                    published_dates.append(datetime.fromisoformat(release_info["published_at"].replace('+00:00', '')))
            
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
            
            if new_releases_count > 0:
                print(f"  ✓ Found {new_releases_count} new release(s)")
            
            project_state["releases"] = {"last_extracted_at": datetime.now().isoformat()}
            self._save_project_state(project_name, project_state)
            
            return releases_data
            
        except GithubException as e:
            print(f"❌ Error extracting releases: {e}")
            return {}
    
    def save_project_data(self, project_name: str, data: Dict[str, Any], data_type: str):
        """Save extracted data to JSON file"""
        project_dir = self._project_dir(project_name)
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
            metadata = self.extract_project_metadata(owner, repo, project_name=project_name)
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
                self.refresh_metadata_companies(project_name)

            commits = self.extract_commits(owner, repo, project_name)
            if commits:
                self.save_project_data(project_name, commits, "commits")

            # Route issue extraction: jira, github, or skip
            issue_source = project.get('issue_source', 'github')
            if issue_source == 'jira':
                print(f"  ℹ️  Running Jira issue extraction for {project_name}...")
                jira_script = Path(__file__).parent / "extract_jira_issues.py"
                jira_result = subprocess.run(
                    [sys.executable, str(jira_script), project_name],
                    cwd=str(Path(__file__).parent),
                    check=False,
                )
                if jira_result.returncode != 0:
                    print(f"⚠️  Jira issue extraction failed for {project_name}")
            elif not project.get('skip_issues', False):
                issues = self.extract_issues(repos, project_created_at, project_name)
                if issues:
                    self.save_project_data(project_name, issues, "issues")
            else:
                print(f"⏭️  Skipping issue extraction (project uses external issue tracker)")
            
            # Extract pull requests with new method supporting multiple repos
            if project_created_at:
                pull_requests = self.extract_pull_requests(repos, project_created_at, project_name)
                if pull_requests:
                    self.save_project_data(project_name, pull_requests, "pull_requests")
            else:
                print("⚠️  Skipping pull request extraction - no creation date available")
            
            releases = self.extract_releases(owner, repo, project_name)
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
