#!/usr/bin/env python3
"""
Extract data for every repository in a GitHub org/user and merge them.

Usage:
    python3 extract_org_project.py <org_name> [--issue-scope all|one] [--issue-repo owner/repo]

What it does:
1.  Lists every non-fork, non-archived public repo in the org.
2.  For each repo: adds it to projects.json / config.yaml and runs the standard
    single-project extraction (metadata, contributors, commits, issues, PRs,
    releases, adopters).
3.  On completion writes a merge record to data/merges.json so the dashboard
    automatically groups all repos under the org name.

Progress lines understood by ExtractionToast:
    ORG_REPOS_FOUND <n>          — total repo count
    ORG_REPO_START <i> <n> <repo> — starting repo i of n
    ORG_REPO_DONE  <i> <n> <repo> — repo i of n finished
    ORG_MERGING                  — writing merge record
    __DONE__                     — all finished
    __FAILED__                   — fatal error
    __TOKEN_EXPIRED__            — bad/expired GitHub token
"""

import json
import sys
import re
from datetime import datetime
from pathlib import Path

from extract_github_data import GitHubDataExtractor
from github import GithubException
import extract_single_project as esp


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _slug(name: str) -> str:
    """Lower-case, hyphen-normalised slug identical to generateProjectId() in Java."""
    return re.sub(r'[^a-z0-9-]', '-', name.lower())


def _add_repo_to_projects_json(data_dir: Path, owner: str, repo: str,
                                org_name: str, foundation: str):
    """Upsert a single-repo project entry into data/projects.json.

    Also removes the bare org-sentinel entry (id == owner slug) that the
    backend wrote when the user first clicked "Add entire project".  That
    sentinel has no real data directory and must be gone before loadProjects
    is called, otherwise the backend will log hundreds of "File not found"
    warnings and the sentinel will show up as a broken project card.
    """
    projects_file = data_dir / "projects.json"
    try:
        with open(projects_file) as f:
            payload = json.load(f)
    except (OSError, json.JSONDecodeError):
        payload = {"projects": []}

    owner_slug = _slug(owner)
    # Namespaced ID: "owner--repo" — matches the format used by the backend
    # and by _sync_projects_json for all org-repo entries.
    project_id = f"{owner_slug}--{_slug(repo)}"
    data_dir_name = f"{owner_slug}--{repo.lower().replace('_', '-')}"

    # Remove the bare org-sentinel (id == owner slug, no real repo) if present
    payload["projects"] = [
        p for p in payload["projects"]
        if not (p.get("id") == owner_slug and not p.get("repo"))
    ]

    # Check if this repo entry is already present
    for p in payload["projects"]:
        if p.get("id") == project_id:
            return  # already registered

    payload["projects"].append({
        "id":        project_id,
        "name":      repo,
        "github_url": f"https://github.com/{owner}/{repo}",
        "owner":     owner,
        "repo":      repo,
        "foundation": foundation,
        "data_dir":  data_dir_name,
        "enabled":   True,
        "is_org":    True,
        "org_owner": owner.lower(),
    })
    payload["last_updated"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"

    with open(projects_file, "w") as f:
        json.dump(payload, f, indent=2)


def _add_repo_to_config_yaml(scripts_dir: Path, owner: str, repo: str,
                               org_name: str, foundation: str):
    """Append a project block to config.yaml if not already present.

    Uses structured YAML parsing to check for an exact owner+repo match so that
    two orgs sharing the same repo name (e.g. both having 'governance') do not
    produce a false "already present" result (BUG-21).
    """
    import yaml as _yaml

    config_path = scripts_dir / "config.yaml"
    if not config_path.exists():
        return

    # Use structured parsing: skip only when an entry with *both* this exact
    # owner AND this exact repo already exists — never rely on substring search.
    try:
        with open(config_path) as f:
            cfg = _yaml.safe_load(f) or {}
        for p in cfg.get("projects", []):
            if p.get("owner", "").lower() == owner.lower() and p.get("repo", "").lower() == repo.lower():
                return  # exact match — already present
    except Exception:
        # If parsing fails fall through and let the append happen;
        # the worst outcome is a duplicate entry which the duplicate guard catches.
        pass

    entry = (
        f'\n  - name: "{repo}"\n'
        f'    github_url: "https://github.com/{owner}/{repo}"\n'
        f'    owner: "{owner}"\n'
        f'    repo: "{repo}"\n'
        f'    foundation: "{foundation}"\n'
    )

    lines = content.splitlines(keepends=True)
    insert_at = len(lines)
    in_projects = False
    for i, line in enumerate(lines):
        if line.startswith("projects:"):
            in_projects = True
            continue
        if in_projects and line and not line[0].isspace():
            insert_at = i
            break

    lines.insert(insert_at, entry)
    config_path.write_text("".join(lines))


def _write_merge_record(data_dir: Path, org_name: str, member_ids: list,
                         display_name: str):
    """Upsert the org's merge record in data/merges.json."""
    merges_file = data_dir / "merges.json"
    try:
        with open(merges_file) as f:
            payload = json.load(f)
        merges = payload.get("merges", [])
    except (OSError, json.JSONDecodeError):
        merges = []

    org_key = _slug(org_name)

    # Find and remove the stale record, but carry forward any user-set fields
    existing = next((m for m in merges if m.get("mergedKey") == org_key), {})
    merges = [m for m in merges if m.get("mergedKey") != org_key]
    new_record = {
        "mergedKey":  org_key,
        "memberKeys": member_ids,
        "name":       display_name,
    }
    # Preserve user-edited fields that the extraction script doesn't own
    if existing.get("orgUrl"):
        new_record["orgUrl"] = existing["orgUrl"]
    if existing.get("foundation"):
        new_record["foundation"] = existing["foundation"]
    merges.append(new_record)

    payload = {
        "merges":       merges,
        "last_updated": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z",
    }
    with open(merges_file, "w") as f:
        json.dump(payload, f, indent=2)


def _extract_single_repo(extractor, owner, repo, project_name, issue_scope, issue_repo,
                          project_config=None):
    # type: (object, str, str, str, str, object, object) -> dict
    """Run the full single-repo extraction pipeline (mirrors extract_single_project logic).

    project_config: optional dict from config.yaml for this project; used to detect
                    issue_source: jira and run Jira extraction instead of GitHub issues.
    """
    import subprocess
    from datetime import datetime as dt

    extraction_status = {k: False for k in
                         ["metadata", "contributors", "commits",
                          "issues", "pull_requests", "releases", "adopters"]}
    project_created_at = None

    # Metadata
    print("Extracting metadata...")
    try:
        metadata = extractor.extract_project_metadata(owner, repo, project_name=project_name)
        if metadata:
            extractor.save_project_data(project_name, metadata, "metadata", repo=repo, owner=owner)
            extraction_status["metadata"] = True
            project_created_at = dt.fromisoformat(
                metadata['created_at'].replace('+00:00', ''))
    except Exception as e:
        print(f"  ⚠️  Metadata: {e}")

    # Contributors
    print("Extracting contributors...")
    try:
        contributors = extractor.extract_contributors(owner, repo, project_name)
        if contributors:
            extractor.save_project_data(project_name, contributors, "contributors", repo=repo, owner=owner)
            extraction_status["contributors"] = True
            extractor.refresh_metadata_companies(project_name, repo=repo, owner=owner)
    except Exception as e:
        print(f"  ⚠️  Contributors: {e}")

    # Commits
    print("Extracting commits...")
    try:
        commits = extractor.extract_commits(owner, repo, project_name)
        if commits:
            extractor.save_project_data(project_name, commits, "commits", repo=repo, owner=owner)
            extraction_status["commits"] = True
    except Exception as e:
        print(f"  ⚠️  Commits: {e}")

    # Issues — route to Jira or GitHub depending on issue_source in the project config.
    print("Extracting issues...")
    issue_source = (project_config or {}).get("issue_source", "github")
    if issue_source == "jira":
        try:
            jira_script = Path(__file__).parent / "extract_jira_issues.py"
            result = subprocess.run(
                [sys.executable, str(jira_script), project_name],
                cwd=str(Path(__file__).parent),
                check=False,
            )
            if result.returncode == 0:
                extraction_status["issues"] = True
            else:
                print(f"  ⚠️  Jira issues extraction failed with exit code {result.returncode}")
        except Exception as e:
            print(f"  ⚠️  Jira issues: {e}")
    elif project_created_at:
        if issue_scope == "all":
            issue_repos = [{"owner": owner, "repo": repo}]
        elif issue_repo:
            ir_owner, ir_repo = issue_repo.split("/", 1)
            issue_repos = [{"owner": ir_owner, "repo": ir_repo}]
        else:
            issue_repos = [{"owner": owner, "repo": repo}]
        try:
            issues = extractor.extract_issues(issue_repos, project_created_at, project_name)
            if issues:
                extractor.save_project_data(project_name, issues, "issues", repo=repo, owner=owner)
                extraction_status["issues"] = True
        except Exception as e:
            print(f"  ⚠️  Issues: {e}")

    # Pull requests
    print("Extracting pull requests...")
    if project_created_at:
        try:
            prs = extractor.extract_pull_requests(
                [{"owner": owner, "repo": repo}], project_created_at, project_name)
            if prs:
                extractor.save_project_data(project_name, prs, "pull_requests", repo=repo, owner=owner)
                extraction_status["pull_requests"] = True
        except Exception as e:
            print(f"  ⚠️  Pull requests: {e}")

    # Releases
    print("Extracting releases...")
    try:
        releases = extractor.extract_releases(owner, repo, project_name)
        if releases:
            extractor.save_project_data(project_name, releases, "releases", repo=repo, owner=owner)
            extraction_status["releases"] = True
    except Exception as e:
        print(f"  ⚠️  Releases: {e}")

    # Adopters
    print("Extracting adopters...")
    try:
        adopters = extractor.extract_adopters(owner, repo, project_name)
        extractor.save_project_data(project_name, adopters, "adopters", repo=repo, owner=owner)
        extraction_status["adopters"] = True
    except Exception as e:
        print(f"  ⚠️  Adopters: {e}")

    return extraction_status


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def _load_registered_repo_ids(data_dir: Path, org_name: str) -> set:
    """Return the set of repo IDs already registered in projects.json for this org.

    Returns an empty set when no repos are registered yet (first-time add).
    """
    registered = set()
    try:
        with open(data_dir / "projects.json") as f:
            for p in json.load(f).get("projects", []):
                if p.get("org_owner", "").lower() == org_name.lower():
                    repo = p.get("repo")
                    if repo:
                        registered.add(repo.lower())
    except (OSError, json.JSONDecodeError):
        pass
    return registered


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 extract_org_project.py <org_name> "
              "[--issue-scope all|one] [--issue-repo owner/repo]")
        sys.exit(1)

    org_name    = sys.argv[1]
    issue_scope = "all"   # default for org: pull issues from every repo
    issue_repo  = None

    # Parse optional flags
    args = sys.argv[2:]
    i = 0
    while i < len(args):
        if args[i] == "--issue-scope" and i + 1 < len(args):
            issue_scope = args[i + 1]
            i += 2
        elif args[i] == "--issue-repo" and i + 1 < len(args):
            issue_repo = args[i + 1]
            i += 2
        else:
            i += 1

    scripts_dir = Path(__file__).parent
    config_path = scripts_dir / "config.yaml"
    data_dir    = scripts_dir.parent / "data"

    extractor = GitHubDataExtractor(str(config_path))

    # Validate token
    try:
        extractor.github.get_user().login
    except GithubException:
        print("__TOKEN_EXPIRED__")
        sys.exit(1)
    except Exception:
        pass

    # Discover repos in the org
    try:
        gh_org   = extractor.github.get_organization(org_name)
        all_repos = list(gh_org.get_repos(type="public"))
        # Filter: skip forks and archived repos
        repos = [r for r in all_repos if not r.fork and not r.archived]
    except GithubException:
        # Might be a user, not an org
        try:
            gh_user = extractor.github.get_user(org_name)
            all_repos = list(gh_user.get_repos(type="public"))
            repos = [r for r in all_repos if not r.fork and not r.archived]
        except GithubException as e:
            print(f"__FAILED__")
            print(f"Could not list repos for '{org_name}': {e}", file=sys.stderr)
            sys.exit(1)

    if not repos:
        print(f"__FAILED__")
        print(f"No public non-fork repos found for org '{org_name}'", file=sys.stderr)
        sys.exit(1)

    # Use the org entry's existing foundation value from projects.json if available
    foundation = "Independent"
    try:
        with open(data_dir / "projects.json") as f:
            for p in json.load(f).get("projects", []):
                if p.get("owner", "").lower() == org_name.lower() and p.get("is_org"):
                    foundation = p.get("foundation", "Independent")
                    break
    except (OSError, json.JSONDecodeError):
        pass

    # Load config.yaml once so per-repo lookups can be done cheaply.
    import yaml as _yaml
    _cfg_projects = []
    org_project_config = {}
    try:
        with open(config_path) as f:
            _cfg = _yaml.safe_load(f)
        _cfg_projects = _cfg.get("projects", [])
        for p in _cfg_projects:
            if p.get("owner", "").lower() == org_name.lower() and p.get("is_org"):
                org_project_config = p
                break
    except Exception:
        pass

    # Determine display name for the merged group
    display_name = org_name

    # Check which repos are already registered for this org.
    # On a refresh (any repos already exist), restrict processing to only those
    # repos — do not add new ones discovered from GitHub.
    registered_repos = _load_registered_repo_ids(data_dir, org_name)
    is_refresh = len(registered_repos) > 0

    if is_refresh:
        # Keep only repos that are already registered; ignore any new GitHub repos.
        repos = [r for r in repos if r.name.lower() in registered_repos]
        if not repos:
            print(f"__FAILED__")
            print(
                f"No previously registered repos found for org '{org_name}'. "
                f"This should not happen — check projects.json.",
                file=sys.stderr,
            )
            sys.exit(1)
        print(f"ORG_REPOS_FOUND {len(repos)}")
    else:
        print(f"ORG_REPOS_FOUND {len(repos)}")

    # On a refresh, seed member_ids with ALL previously registered repo IDs so
    # that repos which were archived/deleted on GitHub since the last run are not
    # silently dropped from the merge record (BUG-22).
    if is_refresh:
        try:
            with open(data_dir / "projects.json") as f:
                _existing_pjs = json.load(f).get("projects", [])
            member_ids = [
                p["id"] for p in _existing_pjs
                if p.get("org_owner", "").lower() == org_name.lower() and p.get("id")
            ]
        except (OSError, json.JSONDecodeError):
            member_ids = []
    else:
        member_ids = []

    for idx, gh_repo in enumerate(repos, start=1):
        repo_name = gh_repo.name
        print(f"ORG_REPO_START {idx} {len(repos)} {repo_name}")
        print(f"  Processing repo {idx}/{len(repos)}: {org_name}/{repo_name}")

        # On a first-time add register each repo; on a refresh the repos are already
        # registered so skip registration to prevent adding new communities.
        if not is_refresh:
            _add_repo_to_projects_json(data_dir, org_name, repo_name, org_name, foundation)
            _add_repo_to_config_yaml(scripts_dir, org_name, repo_name, org_name, foundation)

        # Build the effective config for this repo: prefer a per-repo config block
        # (owner == org_name AND repo == repo_name) over the org-level block so that
        # individual repos can override issue_source (e.g. one repo uses Jira while
        # the rest use GitHub).  Fall back to the org-level block when no per-repo
        # entry exists.
        per_repo_config = next(
            (p for p in _cfg_projects
             if p.get("owner", "").lower() == org_name.lower()
             and not p.get("is_org")
             and p.get("repo", "").lower() == repo_name.lower()),
            None,
        )
        effective_config = per_repo_config if per_repo_config is not None else org_project_config

        # Run extraction — pass effective_config so per-repo issue_source is honoured
        try:
            _extract_single_repo(extractor, org_name, repo_name, repo_name,
                                  issue_scope, issue_repo,
                                  project_config=effective_config)
        except Exception as e:
            print(f"  ⚠️  Extraction failed for {repo_name}: {e}")

        new_id = f"{_slug(org_name)}--{_slug(repo_name)}"
        if new_id not in member_ids:
            member_ids.append(new_id)
        print(f"ORG_REPO_DONE {idx} {len(repos)} {repo_name}")

    # Write merge record so dashboard auto-groups the repos
    print("ORG_MERGING")
    if len(member_ids) >= 2:
        _write_merge_record(data_dir, org_name, member_ids, display_name)
        print(f"  ✅ Merge record written for {org_name} ({len(member_ids)} repos)")
    else:
        print(f"  ℹ️  Only 1 repo found — no merge needed")

    print(f"✅ Org extraction complete for {org_name} ({len(member_ids)} repos)")


if __name__ == "__main__":
    main()

# Made with Bob
