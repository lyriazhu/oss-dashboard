# OSS Dashboard — Complete Regeneration Prompts

This document contains every prompt needed to regenerate this dashboard from scratch. Each prompt is self-contained and ordered. Follow them sequentially. Every detail — directory structure, file names, data shapes, design tokens, component logic, API contracts, Python extraction logic — is captured here.

---

## 0. Project Overview

This is a full-stack Open Source community health dashboard. It tracks GitHub-hosted open source projects and surfaces contributor, commit, PR, issue, CVE, release, and adopter metrics. It consists of three layers:

1. **Python scripts** (`scripts/`) — extract raw data from GitHub (REST API + local git mirror), Jira, and CVE databases; write per-project JSON files into `data/<project-slug>/`.
2. **Java Spring Boot backend** (`backend/`) — reads those JSON files, exposes a REST API on port 8080, manages `data/projects.json` and `scripts/config.yaml`, and runs extraction as a subprocess when triggered.
3. **React + Vite frontend** (`frontend/`) — IBM Carbon Design System White theme, no Carbon component library (all CSS hand-written), served on port 3000 with a Vite proxy to the backend.

Package name: `oss-dashboard-carbon`. Title: `Open Source Dashboard — Carbon`.

---

## Phase 1 — Repository & Directory Structure

### Prompt 1.1 — Create the root layout

```
Create the following top-level directory and file layout:

oss-dashboard/
├── data/
│   └── projects.json          ← registry of all tracked projects
├── scripts/
│   ├── config.yaml            ← project list + GitHub token (not committed)
│   ├── config.yaml.example    ← template committed to git
│   ├── requirements.txt
│   ├── extract_github_data.py
│   ├── extract_single_project.py
│   ├── extract_cves.py
│   ├── extract_jira_issues.py
│   ├── add_company_metrics.py
│   ├── backfill_tag_releases.py
│   ├── export_issues_cli.py
│   ├── reset_commit_state.py
│   ├── update_founding_dates.py
│   └── update_founding_dates_simple.py
├── backend/
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/ossdashboard/
│       │   ├── OssDashboardApplication.java
│       │   ├── config/CorsConfig.java
│       │   ├── controller/ProjectController.java
│       │   ├── controller/SettingsController.java
│       │   ├── model/   (Project, ProjectMetrics, ProjectMetadata,
│       │   │             ContributorData, CommitData, IssueData,
│       │   │             PullRequestData, ReleaseData, AdopterData,
│       │   │             CveData, AddProjectRequest, AddProjectResponse)
│       │   └── service/
│       │       ├── DataService.java
│       │       └── SettingsService.java
│       └── resources/application.properties
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       ├── data.js
│       ├── github.js
│       ├── index.css
│       ├── assets/trash-can.svg
│       └── components/
│           ├── UIShellHeader.jsx
│           ├── SideNav.jsx
│           ├── Overview.jsx
│           ├── Detail.jsx
│           ├── AddProjectModal.jsx
│           ├── ExtractionToast.jsx
│           ├── GitHubTokenModal.jsx
│           └── ui.jsx
├── .gitignore
├── .github/workflows/data_refresh.yml
└── package-lock.json   (root — only for GitHub Actions node tooling)
```

The `.gitignore` must exclude: `data/*/`, `!data/projects.json`, `.cache/`, `.venv/`, `node_modules/`, `scripts/config.yaml`, `backend/target/`.
```

---

### Prompt 1.2 — Create `data/projects.json`

```
Create data/projects.json with this exact schema. This file is the single source of truth for which projects appear in the dashboard.

{
  "last_updated": "2025-01-01T00:00:00Z",
  "projects": [
    {
      "id": "strimzi-kafka-operator",
      "name": "Strimzi",
      "github_url": "https://github.com/strimzi/strimzi-kafka-operator",
      "owner": "strimzi",
      "repo": "strimzi-kafka-operator",
      "foundation": "CNCF",
      "website": "https://strimzi.io",
      "enabled": true,
      "data_dir": "strimzi"
    }
  ]
}

Key rules:
- `id` = repo name lowercased, non-alphanumeric chars replaced with hyphens
- `data_dir` = the subfolder under data/ where JSON files live; set once at creation, never changed on rename
- `data_dir` overrides for known legacy projects:
    strimzi-kafka-operator  → strimzi
    camel                   → apache-camel
    artemis / activemq-artemis → apache-artemis
    apicurio-registry / apicurio-studio → apicurio
    console                 → streamshub
- Optional fields: issue_source ("github"|"jira"), jira_project_key, jira_base_url,
  issue_github_url (when issues live in a different repo than the code)
```

---

### Prompt 1.3 — Per-project data directory layout

```
Each tracked project gets a subdirectory under data/ named by its data_dir value.
Example: data/strimzi/

Every subdirectory may contain these JSON files (all optional; backend handles missing files gracefully):
  metadata.json
  contributors.json
  commits.json
  issues.json
  pull_requests.json
  releases.json
  adopters.json
  cve.json
  _state.json          ← incremental extraction state (not served to frontend)

The _state.json tracks:
{
  "contributors": { "known_logins": [...], "last_extracted_at": "ISO" },
  "commits":      { "last_git_sync_at": "ISO" },
  "pull_requests":{ "last_extracted_at": "ISO" },
  "issues":       { "last_extracted_at": "ISO" },
  "releases":     { "last_extracted_at": "ISO" }
}
```

---

## Phase 2 — Python Data Extraction

### Prompt 2.1 — `scripts/requirements.txt`

```
Create scripts/requirements.txt with these exact pinned versions:

PyGithub==2.1.1
requests==2.32.5
PyYAML==6.0.1
pandas==2.1.4
python-dateutil==2.8.2
playwright==1.40.0
beautifulsoup4==4.15.0
tqdm==4.66.1
tenacity==8.2.3
```

### Prompt 2.2 — `scripts/config.yaml.example`

```
Create scripts/config.yaml.example (this is committed; the real config.yaml is gitignored):

# GitHub API Configuration
github:
  token: "ghp_REPLACE_WITH_YOUR_TOKEN"

# Two config formats are supported per project:
# 1. Single repo: name, owner, repo, github_url, foundation, website
# 2. Multi-repo:  name, repos (list of {owner,repo}), foundation, website
#    Multi-repo aggregates commits/PRs across all repos.
projects:
  - name: "Strimzi"
    github_url: "https://github.com/strimzi/strimzi-kafka-operator"
    owner: "strimzi"
    repo: "strimzi-kafka-operator"
    foundation: "CNCF"
    website: "https://strimzi.io"

  # Jira issue tracker example:
  - name: "Apache Artemis"
    github_url: "https://github.com/apache/activemq-artemis"
    owner: "apache"
    repo: "activemq-artemis"
    foundation: "Apache Software Foundation"
    issue_source: jira
    jira_project_key: ARTEMIS
    jira_base_url: "https://issues.apache.org/jira"

  # Issues in a different GitHub repo:
  - name: "Apache Camel"
    github_url: "https://github.com/apache/camel"
    owner: "apache"
    repo: "camel"
    foundation: "Apache Software Foundation"
    issue_owner: "apache"
    issue_repo: "camel"

extraction:
  quarters_back: 8
  rate_limit: 5000
  max_retries: 3
  retry_delay: 5
```

### Prompt 2.3 — `scripts/extract_github_data.py` — `GitHubDataExtractor` class

```
Create scripts/extract_github_data.py containing class GitHubDataExtractor.

INIT:
- Reads config.yaml (PyYAML)
- Requires GITHUB_TOKEN env var; creates Github(token) client
- Sets self.data_dir = Path(__file__).parent.parent / "data"
- Sets self.cache_dir = Path(__file__).parent.parent / ".cache"
- Creates self.repo_cache_dir = cache_dir / "repos" (for local git mirrors)
- Loads user_profile_cache from .cache/user_profiles.json

PROJECT DIRECTORY RESOLUTION (_project_dir):
Priority:
1. Read data/projects.json; match by repo slug (id = repo.lower().replace("_","-")); use data_dir field if set
2. Fall back to this explicit map:
     "Strimzi" / "strimzi-kafka-operator"  → strimzi
     "Apache Camel" / "camel"              → apache-camel
     "Apache Artemis" / "artemis"          → apache-artemis
     "Apicurio Registry" / "apicurio-registry" / "apicurio-studio" → apicurio
3. repo.lower().replace("_","-") as directory name
4. project_name.lower().replace(" ","-")

GIT MIRROR (_ensure_local_repo):
- Clone with `git clone --mirror https://github.com/owner/repo.git .cache/repos/owner__repo`
- Or `git -C <path> fetch --all --prune` if already cloned
- Used for all commit/contributor analytics (not the GitHub API paginator)

QUARTERLY DATE WINDOWS (_get_quarter_dates):
- Returns last N calendar quarters as list of (start, end) datetime tuples
- Starts from start-of-next-quarter and walks backwards

QUARTER LABEL (_quarter_label):
- Takes the end boundary datetime (first day of next quarter)
- Returns e.g. "Q3 2024"

CONTRIBUTOR HISTORY (_build_contributor_history):
- Reads git history rows (sha, identity, email, author_name, authored_at, month)
- Identity = email.strip().lower() if present, else author_name.strip().lower()
- Builds: contributor_first_commit dict, contributor_quarters dict, contributor_years dict

QUARTERLY RETENTION (_extract_quarterly_retention):
- Uses _build_contributor_history
- New contributor: first-ever commit is within this quarter window
- Returning contributor: committed this quarter but committed in a prior quarter
- Returns list of {period, period_type:"quarter", start_date, end_date,
    active_contributors, new_contributors, returning_contributors, retention_rate}

YEARLY RETENTION (_extract_yearly_retention):
- Same logic as quarterly but per calendar year
- Returns list of {period:"2024", period_type:"year", ..., is_current}

SEARCH API RATE LIMITING (_search_count):
- Uses private requester: self.github._Github__requester.requestJsonAndCheck("GET", "/search/issues", ...)
- Sleeps _SEARCH_RATE_DELAY = 2.2 seconds between calls (60/30 rpm + safety margin)

YEAR COUNT WITH CAP BYPASS (_count_by_year):
- If total_count < 1000, return it directly
- Otherwise sum each month individually (GitHub Search API caps at 1000 results)

EXTRACT_PROJECT_METADATA:
Output schema (metadata.json):
{
  "name", "full_name", "description", "created_at", "updated_at",
  "stars", "forks", "watchers", "open_issues", "language", "topics",
  "license", "homepage", "has_wiki", "has_discussions",
  "top_contributing_companies": [],   ← always [] here; populated by refresh_metadata_companies
  "extracted_at"
}

EXTRACT_CONTRIBUTORS:
- Gets contributors from GitHub API (for contribution counts + profile enrichment)
- Gets all-time unique contributor count from git history (more accurate)
- Runs quarterly and yearly retention from git history
- Output schema (contributors.json):
  {
    "yearly_contributors": [{year, contributor_count, is_current}],
    "total_contributors": <git_count>,
    "total_contributors_git": <git_count>,
    "contributors": [{login, name, company, location, email, contributions, profile_url}],
    "total_contributors_github_api": N,
    "companies": {"CompanyName": count},
    "total_companies": N,
    "company_diversity": {
      "known_company_contributors": N,
      "unknown_company_contributors": N,
      "top_companies": [{company, contributor_count}]
    },
    "retention_by_quarter": [...],
    "retention_by_year": [...],
    "time_scope": {...},
    "extracted_at"
  }

refresh_metadata_companies: After contributors extracted, re-reads contributors.json,
  computes top_contributing_companies (company→sum of contributions, top 10),
  and patches that list back into metadata.json.

  top_contributing_companies schema per entry: {company, commits (=contribution count), percentage}

EXTRACT_COMMITS:
- Uses GitHub API totalCount per quarter for accurate quarterly counts
- Uses git history for yearly aggregations and committer list (all-time)
- Incremental: reads last_git_sync_at from _state.json; only reads commits since then
- Output schema (commits.json):
  {
    "total_commits": N,
    "quarters": [{start_date, end_date, commit_count, quarter:"Q3 2024"}],
    "years": [{year:2024, commit_count:N, is_current:bool}],
    "committers": [{login, name, company, location, email, profile_url, commit_count}],
    "time_scope": {total_commits:"last_N_quarters", years:"all_time_from_git_history", ...},
    "extracted_at"
  }
  Quarters are stored newest-first (as returned by _get_quarter_dates).
  The frontend reverses them to display chronologically left-to-right.

EXTRACT_ISSUES:
- Month-level: iterates issues created in last 12 months via GitHub search API
- Year-level: uses _count_issues_in_year (cap-safe monthly summation)
- Supports multi-repo (aggregates counts across repos list)
- Output schema (issues.json):
  {
    "total_open": N,
    "total_closed": N,
    "median_resolution_time_days": float,
    "months": [{month:"2024-07", open:N, closed:N, is_current:bool}],
    "years": [{year:2024, open:N, closed:N, is_current:bool}],
    "issue_commenters": [{login, comment_count}],
    "time_scope": {...},
    "extracted_at"
  }

EXTRACT_PULL_REQUESTS:
- Same cap-safe approach as issues
- Supports multi-repo aggregation
- Output schema (pull_requests.json):
  {
    "total_prs": N,
    "total_merged": N,
    "median_merge_time_days": float,
    "months": [{month:"2024-07", pr_count:N, merged_pr_count:N, is_current:bool}],
    "years": [{year:2024, pr_count:N, merged_pr_count:N, is_current:bool}],
    "time_scope": {...},
    "extracted_at"
  }

EXTRACT_RELEASES:
- Lists all releases via GitHub API
- Output schema (releases.json):
  {
    "total_releases": N,
    "releases": [{tag_name, name, published_at, is_prerelease, body_excerpt}],
    "extracted_at"
  }

EXTRACT_ADOPTERS:
- Reads ADOPTERS.md or USERS.md from the repo via GitHub API raw content
- Falls back to playwright browser scraping of the project website's adopters page
- Output schema (adopters.json):
  {
    "adopters": [{name, url}],
    "source": "https://raw.githubusercontent.com/.../ADOPTERS.md",
    "extracted_at"
  }

SAVE_PROJECT_DATA:
- Writes JSON to _project_dir(project_name, repo=repo) / "<data_type>.json"
- Uses indent=2

_SYNC_PROJECTS_JSON:
- Reads config.yaml and ensures every project has a matching entry in data/projects.json
- Preserves existing data_dir values; adds missing projects with derived data_dir
```

### Prompt 2.4 — `scripts/extract_single_project.py`

```
Create scripts/extract_single_project.py.

Usage: python3 extract_single_project.py <project_name_or_owner/repo>

Steps in order:
1. Validate GitHub token with extractor.github.get_user().login — print __TOKEN_EXPIRED__ and exit(1) on GithubException
2. Call extractor._sync_projects_json()
3. Find the project in config.yaml by matching p['name'].lower() OR "owner/repo" of the first repo
4. Run in order: metadata → contributors → commits → issues → pull_requests → releases → adopters
5. After a successful exit from the main script, the Java backend calls extract_cves.py separately

For issues:
- If issue_source == "jira": subprocess-call extract_jira_issues.py <project_name>
- If issue_owner/issue_repo is set: use those for the issues repo list
- Otherwise: use the primary repos list

Print sentinel lines that the Java backend/frontend parse:
  "metadata"      → triggers "Extracting metadata…" in toast
  "contributor"   → triggers "Extracting contributors…"
  "commit"        → triggers "Extracting commits…"
  "issue"         → triggers "Extracting issues…"
  "pull request"  → triggers "Extracting pull requests…"
  "release"       → triggers "Extracting releases…"
  "adopter"       → triggers "Extracting adopters…"
  __TOKEN_EXPIRED__ → frontend shows "Update token" button and clears localStorage token
  __DONE__          → sent by Java after CVE extraction succeeds
  __FAILED__        → sent by Java on non-zero exit code

All extraction failures are soft (print warning, continue). Only token failure is hard exit.
```

### Prompt 2.5 — `scripts/extract_cves.py`

```
Create scripts/extract_cves.py.

Usage: python3 extract_cves.py <project_name>

This script is called by the Java DataService after extract_single_project.py exits 0.
It queries the GitHub Advisory Database (GraphQL) or GitHub Security Advisories
for CVEs affecting the project's packages.

Output schema (cve.json):
{
  "total_all_time": N,
  "source": "github_advisory_database",   or "github_security_advisories"
  "entries": [
    {
      "id": "CVE-2024-12345",
      "ghsa_id": "GHSA-xxxx-xxxx-xxxx",
      "summary": "...",
      "severity": "critical"|"high"|"medium"|"low"|"unknown",
      "published_at": "ISO",
      "url": "https://github.com/advisories/..."
    }
  ],
  "by_year": [{year:2024, count:N, is_current:bool}],
  "by_month": [{month:"2024-07", count:N, is_current:bool}],
  "extracted_at": "ISO"
}

Severity order for display: critical(0) > high(1) > medium/moderate(2) > low(3) > unknown(4)
```

---

## Phase 3 — Java Spring Boot Backend

### Prompt 3.1 — `backend/pom.xml`

```
Create backend/pom.xml with:
- Parent: spring-boot-starter-parent 3.2.0
- groupId: com.ossdashboard
- artifactId: oss-dashboard-backend
- Java 17
- Dependencies: spring-boot-starter-web, jackson-databind,
  spring-boot-starter-actuator, spring-boot-starter-validation,
  spring-boot-starter-test (test scope)
- Build plugin: spring-boot-maven-plugin
```

### Prompt 3.2 — `backend/src/main/resources/application.properties`

```
spring.application.name=oss-dashboard-backend
server.port=8080
app.github.token=${GITHUB_TOKEN:}
app.data.directory=../data
app.cors.allowed-origins=http://localhost:3000,http://localhost:5173
management.endpoints.web.exposure.include=health,info,metrics
management.endpoint.health.show-details=always
logging.level.root=INFO
logging.level.com.ossdashboard=DEBUG
logging.pattern.console=%d{yyyy-MM-dd HH:mm:ss} - %msg%n
spring.jackson.serialization.indent-output=true
spring.jackson.serialization.write-dates-as-timestamps=false
spring.jackson.default-property-inclusion=non_null
```

### Prompt 3.3 — `backend/src/main/java/com/ossdashboard/config/CorsConfig.java`

```
Create CorsConfig as @Configuration implementing WebMvcConfigurer.
Read allowed origins from app.cors.allowed-origins (comma-separated).
Allow all methods, all headers, allow credentials.
Apply to /api/** path pattern.
```

### Prompt 3.4 — Java Model Classes

```
Create these POJO model classes under com.ossdashboard.model, all using
@JsonIgnoreProperties(ignoreUnknown = true) and @JsonProperty where field names
differ between JSON (snake_case) and Java (camelCase):

Project:
  id, name, githubUrl, owner, repo, foundation, website, enabled,
  dataDir, issueSource, jiraProjectKey, jiraBaseUrl, issueGithubUrl

ProjectMetrics:
  projectId, projectName, metadata, contributors, commits,
  issues, pullRequests, releases, adopters, cves

ProjectMetadata:
  name, fullName, description, createdAt, updatedAt, stars, forks,
  watchers, openIssues, language, topics, license, homepage,
  hasWiki, hasDiscussions, topContributingCompanies (List<CompanyContribution>),
  extractedAt, status

  CompanyContribution inner class: company, commits, percentage

ContributorData:
  totalContributors, totalContributorsGit, totalContributorsGithubApi,
  contributors (List<Contributor>), companies (Map<String,Integer>),
  totalCompanies, companyDiversity (CompanyDiversity), retentionByQuarter,
  retentionByYear, yearlyContributors (List<YearlyContributor>), timeScope, extractedAt

  Contributor: login, name, company, location, email, contributions, profileUrl
  CompanyDiversity: knownCompanyContributors, unknownCompanyContributors, topCompanies
  CompanyCount: company, contributorCount
  RetentionQuarter/RetentionYear: period, periodType, startDate, endDate,
    activeContributors, newContributors, returningContributors, retentionRate, isCurrent
  YearlyContributor: year, contributorCount, isCurrent
  TimeScope: inner class with @JsonAnySetter/@JsonAnyGetter for flexible keys

CommitData:
  totalCommits, quarters (List<QuarterData>), years (List<YearData>),
  committers (List<Committer>), timeScope, extractedAt

  QuarterData: startDate, endDate, commitCount, quarter
  YearData: year, commitCount, isCurrent
  Committer: login, name, company, location, email, profileUrl, commitCount

IssueData:
  totalOpen, totalClosed, medianResolutionTimeDays,
  months (List<MonthData>), years (List<YearData>),
  issueCommenters, timeScope, extractedAt

  MonthData: month, open, closed, isCurrent
  YearData: year, open, closed, isCurrent

PullRequestData:
  totalPrs, totalMerged, medianMergeTimeDays,
  months (List<MonthData>), years (List<YearData>), timeScope, extractedAt

  MonthData: month, prCount, mergedPrCount, isCurrent
  YearData: year, prCount, mergedPrCount, isCurrent

ReleaseData:
  totalReleases, releases (List<Release>), extractedAt

  Release: tagName, name, publishedAt, isPrerelease, bodyExcerpt

AdopterData:
  adopters (List<Adopter>), source, extractedAt

  Adopter: name, url

CveData:
  totalAllTime, source, entries (List<CveEntry>),
  byYear (List<YearData>), byMonth (List<MonthData>), extractedAt

  CveEntry: id, ghsaId, summary, severity, publishedAt, url
  YearData: year, count, isCurrent
  MonthData: month, count, isCurrent

AddProjectRequest:
  githubUrl, foundation, website, issueSource, jiraProjectKey, jiraBaseUrl, issueGithubUrl

AddProjectResponse:
  success, message, project (Project), extractionStatus
```

### Prompt 3.5 — `DataService.java`

```
Create com.ossdashboard.service.DataService as @Service.

Key fields:
  @Value("${app.data.directory}") String dataDirectory
  @Autowired SettingsService settingsService
  ObjectMapper objectMapper (new ObjectMapper())
  ConcurrentHashMap<String, CopyOnWriteArrayList<String>> extractionLogs
  ConcurrentHashMap<String, Boolean> extractionRunning

DATA_DIR RESOLUTION (getProjectDirectoryName / deriveDataDir):
  1. Read projects.json, find project by id; use data_dir field if non-blank
  2. Legacy hardcoded switch:
     strimzi-kafka-operator → strimzi
     camel → apache-camel
     artemis → apache-artemis
     apicurio-studio / apicurio-registry → apicurio
     console → streamshub
     default → projectId.toLowerCase().replace("_","-")

getAllProjects():
  Read data/projects.json → parse "projects" array → List<Project>

getProjectMetrics(projectId):
  Finds project, resolves data directory.
  Loads (gracefully — null if file missing): metadata.json, contributors.json,
  commits.json, issues.json, pull_requests.json, releases.json, adopters.json, cve.json
  Returns ProjectMetrics.

addProject(request):
  1. Parse GitHub URL with regex: (?:https?://)?(?:www\.)?github\.com/([^/]+)/([^/]+)/?
  2. Generate id = repo.toLowerCase().replaceAll("[^a-z0-9-]","-")
  3. Throw IllegalArgumentException("This project has already been added.") if id exists
  4. resolveDisplayName(owner, repo) — checks a hardcoded map of owner/repo→display name,
     falls back to repo.replaceAll("[-_]"," ")
     Known mappings: strimzi/strimzi-kafka-operator→"Strimzi", apache/camel→"Apache Camel",
     apicurio/apicurio-registry→"Apicurio Registry", keycloak/keycloak→"Keycloak",
     debezium/debezium→"Debezium", quarkusio/quarkus→"Quarkus",
     streamshub/console→"StreamsHub", 3scale/3scale-operator→"3scale operator"
  5. newProject.setDataDir(deriveDataDir(projectId))
  6. Append to projects.json ArrayNode, update last_updated timestamp, write back
  7. addProjectToConfig(owner, repo, project, request) — appends YAML block inside projects: list
  Returns new Project.

updateProject(projectId, updates):
  1. Patch name and foundation in projects.json (data_dir is NEVER changed on rename)
  2. updateProjectInConfig(oldName, newName, newFoundation) — finds block by old name,
     rewrites name: and foundation: lines in-place using Files.readAllLines / Files.writeString
  Returns updated Project.

removeProject(projectId):
  1. Remove from projects.json
  2. removeProjectFromConfig(projectName) — deletes the YAML block from scripts/config.yaml
  3. Delete data directory recursively using Files.walk with reverseOrder delete

triggerDataExtraction(projectId):
  1. Resolve python3 path (tries `which python3`, then /usr/bin/python3, /usr/local/bin/python3)
  2. ProcessBuilder: python3 scripts/extract_single_project.py <project.getName()>
  3. Sets GITHUB_TOKEN env var from settingsService.getGithubToken()
     Throws IllegalStateException("No GitHub token configured...") if token is null
  4. redirectErrorStream(true)
  5. Starts new Thread: reads stdout line by line into CopyOnWriteArrayList,
     sets extractionRunning[projectId]=true, false when done
  6. On exit code 0: calls runCveExtraction(projectName, projectId, logLines, scriptsDir)
  7. On exit code != 0: appends __FAILED__ to logLines
  8. runCveExtraction: runs python3 extract_cves.py <projectName>, appends lines,
     always appends __DONE__ when finished (success or failure)
```

### Prompt 3.6 — `SettingsService.java`

```
Create com.ossdashboard.service.SettingsService as @Service.

Stores the GitHub token in memory only (not persisted to disk).
On startup, seeds from GITHUB_TOKEN env var if present.

Methods:
  getGithubToken() → String or null
  setGithubToken(String token) → void
  isTokenConfigured() → boolean
```

### Prompt 3.7 — `SettingsController.java`

```
Create com.ossdashboard.controller.SettingsController as @RestController @RequestMapping("/api/settings").

GET /api/settings/token-status
  Returns { "configured": true/false }

POST /api/settings/token
  Body: { "token": "ghp_..." }
  Calls settingsService.setGithubToken(token)
  Also writes token to localStorage-equivalent (in-memory only, not to disk)
  Returns { "success": true }
```

### Prompt 3.8 — `ProjectController.java` REST endpoints

```
Create com.ossdashboard.controller.ProjectController as @RestController @RequestMapping("/api/projects").

Endpoints:

GET  /api/projects                    → List<Project>
GET  /api/projects/{id}               → Project
GET  /api/projects/{id}/metrics       → ProjectMetrics
GET  /api/projects/{id}/metadata      → ProjectMetadata
GET  /api/projects/{id}/contributors  → ContributorData
POST /api/projects                    → AddProjectResponse (201)
PATCH /api/projects/{id}              → Project (body: Map<String,String> updates)
DELETE /api/projects/{id}             → 204

POST /api/projects/{id}/extract
  Optional body: { "token": "ghp_..." } — if present, saves to SettingsService first
  Calls dataService.triggerDataExtraction(projectId)
  Returns { "started": projectId } immediately (async)

POST /api/projects/refresh-all
  Optional body: { "token": "ghp_..." }
  Gets all projects, starts a background Thread that runs each extraction sequentially
  (waits for isExtractionRunning to become false before starting the next)
  Returns { "started": [id1, id2, ...] } immediately

GET /api/projects/{id}/extraction-progress   (produces text/event-stream)
  SSE endpoint. 10-minute timeout SseEmitter.
  Polls extractionLogs every 300ms, sends new lines.
  Closes when __DONE__ or __FAILED__ is encountered, or when extraction is
  no longer running and all lines have been sent.
```

---

## Phase 4 — React Frontend

### Prompt 4.1 — `frontend/package.json`

```json
{
  "name": "oss-dashboard-carbon",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "description": "Open Source community health dashboard — IBM Carbon Design System, React + Vite",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0"
  }
}
```

### Prompt 4.2 — `frontend/vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
```

### Prompt 4.3 — `frontend/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Open Source Dashboard — Carbon</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Fonts: **IBM Plex Sans** (weights 300/400/500/600) + **IBM Plex Mono** (400/500). Loaded from Google Fonts. This is the ONLY external resource loaded at runtime.

### Prompt 4.4 — `frontend/src/index.css` — IBM Carbon v11 White Theme

```
Create frontend/src/index.css implementing the IBM Carbon v11 White theme using raw CSS custom properties. Do NOT install @carbon/react or any Carbon npm package. All styling is hand-written.

:root CSS variables (exact values):
  Gray scale:
    --gray-10:#f4f4f4  --gray-20:#e0e0e0  --gray-30:#c6c6c6  --gray-40:#a8a8a8
    --gray-50:#8d8d8d  --gray-60:#6f6f6f  --gray-70:#525252  --gray-80:#393939
    --gray-90:#262626  --gray-100:#161616

  Blue scale:
    --blue-20:#d0e2ff  --blue-30:#a6c8ff  --blue-40:#78a9ff
    --blue-60:#0f62fe  --blue-70:#0043ce

  Other:
    --teal-50:#009d9a  --green-20:#a7f0ba  --green-50:#24a148  --green-70:#0e6027
    --red-30:#ffb3b8   --red-50:#fa4d56   --red-60:#da1e28    --yellow-30:#f1c21b

  Semantic tokens (White theme):
    --background:#ffffff
    --layer-01:#f4f4f4
    --layer-02:#ffffff
    --layer-selected:#e0e0e0
    --layer-hover:#e8e8e8
    --border-subtle:#e0e0e0
    --border-strong:#8d8d8d
    --text-primary:#161616
    --text-secondary:#525252
    --text-helper:#6f6f6f
    --text-on-color:#ffffff
    --link:#0f62fe
    --interactive:#0f62fe
    --focus:#0f62fe
    --header-bg:#161616     ← near-black header
    --header-text:#f4f4f4
    --header-text-dim:#c6c6c6

  Spacing scale (Carbon 4px base):
    --sp-02:.25rem  --sp-03:.5rem  --sp-04:.75rem  --sp-05:1rem
    --sp-06:1.5rem  --sp-07:2rem   --sp-08:2.5rem  --sp-09:3rem  --sp-10:4rem

  Layout:
    --sidenav-w:16rem

Global:
  body: font-family 'IBM Plex Sans',-apple-system,system-ui,sans-serif;
        background:var(--layer-01); color:var(--text-primary);
        -webkit-font-smoothing:antialiased; line-height:1.4
  Focus ring: outline:2px solid var(--focus); outline-offset:-2px on :focus-visible

UI Shell (.ui-shell):
  height:3rem; background:var(--header-bg); display:flex; align-items:center;
  position:sticky; top:0; z-index:100; padding:0 1rem; gap:.5rem
  .menu-btn: 3rem×3rem icon button, hover background var(--gray-80)
  .product-name: flex row, height 100%, padding 0 1rem, gap .5rem, hover var(--gray-80)
    b: font-weight:600; span: color:var(--header-text-dim) font-weight:400

Extraction toast (.extraction-toast):
  Position inside the header, margin-left:auto area
  Dark semi-transparent surface, 14px font, extraction step shown in color:
    in-progress → var(--header-text-dim)
    done → var(--green-40)
    failed → var(--red-40)
  Success state renders a Carbon-style inline notification with a CheckmarkFilled SVG icon

Tags (.tag):
  display:inline-flex; align-items:center; gap:.375rem; padding:.125rem .5rem
  font-size:.75rem; border-radius:2px; white-space:nowrap
  .dot: 0.5rem×0.5rem circle
  .green: background var(--green-20), color var(--green-70), dot var(--green-50)
  .yellow: background #fcf4d6, color #684e00, dot var(--yellow-30)
  .blue: background var(--blue-20), color var(--blue-70), dot var(--blue-60)
  .gray: background var(--gray-20), color var(--gray-70), dot var(--gray-50)

Tiles (.tile-grid / .tile):
  tile-grid: display:grid; grid-template-columns:repeat(4,1fr); gap:1px;
    background:var(--border-subtle); border:1px solid var(--border-subtle)
  tile: background:var(--layer-02); padding:1rem
  .k-label: font-size:.875rem; color:var(--text-secondary); margin-bottom:.5rem
  .k-value: font-size:2rem; line-height:2.5rem; font-weight:400; color:var(--text-primary)
  .k-help: font-size:.75rem; color:var(--text-helper); margin-top:.25rem
  Responsive: 2 columns at ≤820px, 1 column at ≤420px

Bar charts (.bar-chart-wrap / .bars / .bar):
  .bar-chart-wrap: position:relative; overflow:visible
  .bar-tooltip: position:absolute; background:#161616; color:#f4f4f4;
    font-size:.75rem; padding:.25rem .5rem; pointer-events:none; white-space:nowrap; z-index:10
  .bars: display:flex; align-items:flex-end; height:10rem; gap:.25rem
  .bars.spread: gap clamp(.0625rem,.4vw,.25rem)
  .bars.compact: gap clamp(.0625rem,.2vw,.125rem)
  .bars.dense: gap 0
  .bars.twelve: height:7rem; .bar max-width:1.5rem
  .bars.mini: height:5rem; gap:.25rem; .bar max-width:1.25rem
  .bar: width:100%; max-width:3rem; background:var(--blue-30); transition:height .3s ease
  .bar.current: background:var(--blue-60)    ← darker blue for current period
  density class applied when values.length >= 24 → dense, >= 18 → compact, else spread

  Stacked bar (.bar.stacked):
    display:flex; flex-direction:column-reverse; overflow:hidden
    .bar-segment.closed: background:var(--blue-30) (non-current) or var(--blue-60) (current)
    .bar-segment.open: background:var(--red-30) (non-current) or var(--red-50) (current)
    .bar-segment.returning: background:var(--blue-30) / var(--blue-60)
    .bar-segment.newContributors: background:var(--red-30) / var(--red-50)

  .bar-axis: display:flex; gap:.25rem; margin-top:.375rem
  .bar-axis span: flex:1; font-size:.625rem; color:var(--text-helper);
    text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap
  .chart-cap: font-size:.75rem; color:var(--text-helper); font-style:italic; margin-top:.625rem

Tables (.table-wrap / table):
  .table-wrap: overflow-x:auto; border:1px solid var(--border-subtle); background:var(--layer-02)
  table: width:100%; border-collapse:collapse; font-size:.875rem
  thead th: padding:.75rem 1rem; text-align:left; font-weight:600;
    color:var(--text-secondary); border-bottom:1px solid var(--border-subtle);
    background:var(--layer-01); white-space:nowrap
  thead th.num: text-align:right
  tbody td: padding:.625rem 1rem; border-bottom:1px solid var(--border-subtle);
    color:var(--text-secondary); vertical-align:middle
  tbody tr:last-child td: border-bottom:0
  tbody td.num: text-align:right; font-variant-numeric:tabular-nums
  tbody td.strong: color:var(--text-primary); font-weight:600
  tbody tr:hover td: background:var(--layer-01)
  td.flag: color:var(--green-70); font-weight:500

Layout:
  .layout: display:flex; min-height:calc(100vh - 3rem)
  .sidenav: width:var(--sidenav-w); flex:0 0 auto; background:var(--layer-02);
    border-right:1px solid var(--border-subtle); position:sticky; top:3rem;
    height:calc(100vh - 3rem); overflow-y:auto; transition:width .24s ease
  .sidenav.collapsed: width:0; border-right-width:0
  .sidenav-inner: width:var(--sidenav-w) (prevents reflow during collapse animation)
  .sidenav-header: padding:1rem 1rem .5rem; font-size:.75rem; letter-spacing:.02em; color:var(--text-secondary)
  .nav-item: display:block; width:100%; text-align:left; background:none; border:0;
    padding:.75rem 1rem; border-left:2px solid transparent; cursor:pointer; font-family:inherit
  .nav-item[aria-current="page"]: background:var(--layer-selected); border-left-color:var(--interactive)
    .ni-name: font-weight:600
  .nav-item .ni-name: font-weight:400; color:var(--text-primary); display:block
  .nav-item .ni-sub: font-size:.75rem; color:var(--text-helper); display:block; margin-top:1px
  .nav-overview: border-bottom:1px solid var(--border-subtle);
    padding-top/bottom:1.25rem; margin-bottom:.75rem
  .nav-overview .ni-name: color:var(--link)
  .nav-item-wrap: position:relative; display:flex; align-items:stretch
    .nav-item: flex:1; padding-right:2.25rem
  .nav-remove: position:absolute; right:0; top:0; bottom:0; width:2.25rem;
    background:none; border:0; cursor:pointer; color:var(--gray-50);
    display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .15s
    (opacity:1 on nav-item-wrap:hover)
  .nav-remove--confirm: background:rgba(250,77,86,.08); color:var(--red-50);
    opacity:1; font-size:.75rem; padding:0 .5rem; white-space:nowrap
  main: flex:1; min-width:0; padding:var(--sp-06) var(--sp-07) var(--sp-09)
  @media ≤672px: main padding var(--sp-05)

Buttons:
  .btn-primary: background:var(--blue-60); color:#fff; border:0; padding:.625rem 1rem;
    font-family:inherit; font-size:.875rem; cursor:pointer; display:inline-flex;
    align-items:center; gap:.5rem; white-space:nowrap; min-width:10rem; justify-content:center
    hover: var(--blue-70); active: #002d9c
  .btn-ghost: background:transparent; color:var(--text-secondary); border:1px solid var(--border-subtle);
    padding:.375rem .75rem; font-size:.875rem; cursor:pointer; font-family:inherit;
    display:inline-flex; align-items:center; gap:.5rem
    hover: var(--layer-hover); active: var(--layer-selected)
  .btn-danger: background:#c4434b; color:#fff; (otherwise same shape as btn-primary)
    hover: #dda0a6; active: #d08a91; disabled: var(--gray-20)/var(--gray-50)
  .btn-refresh: background:transparent; color:var(--text-secondary); border:0;
    padding:.375rem .75rem; font-size:.875rem; cursor:pointer; font-family:inherit;
    display:inline-flex; align-items:center; gap:.5rem
    hover: var(--layer-hover); color:var(--text-primary)

Overview page:
  .overview-wrap: max-width:75rem; padding:var(--sp-06) var(--sp-07) var(--sp-09)
  .ov-header: display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:1rem
  .ov-title: font-size:2.25rem; line-height:2.75rem; font-weight:400; letter-spacing:0; max-width:34rem
  .ov-meta: column flex, align-items:flex-end; gap:.5rem; font-size:.875rem
  .ov-rule: 1px horizontal rule, margin var(--sp-06) top/bottom
  .mini-grid: 4-column grid, 1rem gap (→2 cols ≤980px, 1 col ≤560px)
  .mini-card: background:var(--layer-02); padding:1rem; cursor:pointer
    hover: background:var(--layer-01), .mini-title color:var(--blue-60)
  .mini-title: font-size:.875rem; font-weight:600; margin-bottom:.75rem

Detail page:
  .breadcrumb: flex row, gap:.5rem, font-size:.875rem, margin-bottom:1rem
    button: background:none; color:var(--link); hover:underline
    .sep: color:var(--gray-50)
  .page-title: font-size:2rem; line-height:2.5rem; font-weight:400; letter-spacing:0
  .meta-line: margin-top:.25rem; font-size:.875rem; color:var(--text-secondary); flex row gap:1rem
  .title-row: flex row, align-items:center, gap:1rem, flex-wrap:wrap
  .two-col: 2-column grid equal width, gap:var(--sp-07) (→1 col ≤820px)
  .section: margin-top:var(--sp-08)
  .section-h: font-size:1rem; line-height:1.375rem; font-weight:600; margin:0 0 1rem
  .divider: 1px rule, margin var(--sp-08) top, 0 bottom
  Meter (.meter): label + value% row, 0.5rem tall track, blue or teal fill, animated width

Modals (.modal-overlay / .modal):
  .modal-overlay: fixed inset 0; background rgba(22,22,22,.7); display:flex;
    align-items:center; justify-content:center; z-index:9000
  .modal: background:var(--layer-02); width:100%; max-width:32rem; flex column; max-height:90vh
  .modal-header: padding:1rem 1rem .25rem; position:relative
  .modal-title: font-size:1.25rem; line-height:1.75rem; font-weight:400; padding-right:2.5rem
  .modal-sub: font-size:.875rem; color:var(--text-secondary); padding-right:2.5rem
  .modal-close: absolute top:.5rem right:.5rem; 2.5rem×2.5rem icon button
  .modal-body: padding:1rem; overflow-y:auto
  .modal-footer: display:flex; margin-top:1.5rem
    buttons: flex:1; border:0; cursor:pointer; font-size:.875rem; text-align:left; padding:1.25rem 1rem; color:#fff
    .btn-cancel: background:var(--gray-80); hover:#4c4c4c
    .btn-add: background:var(--blue-60); hover:var(--blue-70)
    .btn-confirm-delete: background:#c4434b; hover:#a8323a

Form fields (.field):
  label: display:block; font-size:.75rem; color:var(--text-secondary); margin-bottom:.5rem
  input/select: width:100%; padding:.625rem 1rem; border:0; border-bottom:1px solid var(--border-strong);
    background:var(--layer-01); font-family:inherit; font-size:.875rem; color:var(--text-primary)
    focus: outline:none
  input.invalid: outline:2px solid var(--red-60); outline-offset:-2px
  .err: color:var(--red-60); font-size:.75rem; margin-top:.25rem; display:none
  .field.show-err .err: display:block
  .field-row: 2-column grid, 1rem gap
  .field-help: font-size:.75rem; color:var(--text-helper); margin:.5rem 0 0; line-height:1.4
  .radio-group: flex row, gap:1rem, margin-top:.375rem
  .radio-label: flex row, align-items:center, gap:.5rem, font-size:.8125rem, cursor:pointer
    input[type=radio]: accent-color:var(--blue-60); 0.875rem×0.875rem

Inline edit:
  .inline-edit-text: display:block; min-height:1.25rem
  .inline-edit-text--editable: cursor:text on hover (visual affordance)
  .inline-edit-input: width:100%; border:0; border-bottom:2px solid var(--blue-60);
    background:var(--blue-20); padding:.125rem .25rem; font:inherit; color:var(--text-primary)

Row flash animation:
  #commTable tbody tr.row-flash td: background:var(--blue-20); transition:background .2s

Row selection:
  #commTable tbody tr.row-selected td: background:var(--blue-20)
  hover: #c0d6f5
  .chk-cell: width:2.75rem; padding-left:1rem

@media (prefers-reduced-motion:reduce): disable all transitions
```

### Prompt 4.5 — `frontend/src/api.js`

```
Create frontend/src/api.js. This file is the only place that talks to the backend.

const API_BASE = '/api'
const TOKEN_STORAGE_KEY = 'oss_dashboard_github_token'

Exported functions:
  fetchProjects()             GET /api/projects
  fetchProjectMetrics(id)     GET /api/projects/{id}/metrics
  addProject(githubUrl, foundation, website, issueSource, jiraProjectKey, jiraBaseUrl, issueGithubUrl)
                              POST /api/projects
  updateProject(id, fields)   PATCH /api/projects/{id}
  removeProject(id)           DELETE /api/projects/{id}
  triggerProjectExtraction(id, token)
                              POST /api/projects/{id}/extract  body: {token}
  refreshAllProjects(token)   POST /api/projects/refresh-all  body: {token}
  saveGithubToken(token)      POST /api/settings/token body:{token} + localStorage.setItem
  fetchTokenStatus()          GET /api/settings/token-status
  getSavedToken()             localStorage.getItem(TOKEN_STORAGE_KEY)

EXCLUDED_COMPANY_PATTERNS for countDistinctCompanies():
  Patterns that identify "independent" / unknown contributors to exclude from company counts:
  /^unknown$/i, /^independent$/i, /^(none|n\/a|not provided|self|freelance|personal)$/i,
  /^@?(users\.noreply\.github\.com)$/i, plus empty/null check.
  Returns count of contributors where company is not null, not excluded, and not "Unknown".

transformProjectData(project, metrics):
  This is the critical function that maps raw backend JSON to the frontend data shape.
  Called once per project after fetchProjectMetrics.

  STATUS DERIVATION:
  - project.id === '3scale-operator' → {label:'N/A', cls:'gray'}
  - metadata.status field (if present) — maps string to {label, cls}
  - Otherwise calculate from stars (>=1000 && contributors>100 → Healthy/green,
    >=200 → Growing/blue, else Watch/yellow)

  OV OBJECT (used in Overview table row):
  {
    foundation: project.foundation || 'Independent',
    contributorsYtd: formatNumber(contributors.yearly_contributors.find(y=>y.year===currentYear).contributor_count),
    contributorsAllTime: formatNumber(contributors.total_contributors),
    companies: formatNumber(countDistinctCompanies(contributors.contributors)),
    commits: formatNumber(commits.years.find(y=>y.year===currentYear).commit_count),
    commitsAllTime: formatNumber(sum of commits.committers[].commit_count),
    pullRequests: formatNumber(pull_requests.total_prs),
    stars: formatNumber(metadata.stars),
    quarters: commits.quarters.slice(-16).map(q=>q.commit_count)  ← used for mini bar chart
  }

  KPIS ARRAY (8 tiles in Detail view):
  [
    { l:'Contributing Companies', v: countDistinctCompanies(...), h:'Distinct companies (excl. independents)' },
    { l:'Contributors (YTD)',     v: contributorsYtd,             h:'Unique contributors this year' },
    { l:'Commits (YTD)',          v: commitsYtd,                  h:'Total commits this year' },
    { l:'GitHub Stars',           v: formatNumber(metadata.stars), h:`${forks} forks` },
    { l:'Open Issues',            v: formatNumber(issues.total_open), h:`Median: ${N} days` },
    { l:'Pull Requests (YTD)',    v: formatNumber(prYtd),          h:`${mergedPrYtd} merged` },
    { l:'Releases',               v: formatNumber(releases.total_releases), h:'Total releases' },
    { l:'Language',               v: metadata.language || '—',    h: metadata.license || 'No license' },
  ]

  COMMIT HISTORY (yearly bar chart):
  commits.years → [{y:year.toString(), v:commit_count, c:is_current}]
  Fill missing years up to currentYear with v:0.
  If no is_current from backend, mark item where parseInt(y) === currentYear.

  QUARTERLY COMMITS:
  commits.quarters reversed (backend returns newest-first → display oldest-first)
  → [{q:quarter, v:commit_count, c: idx===arr.length-1 after reverse}]

  RETENTION (stacked bar chart data):
  retentionQuarterly: contributors.retention_by_quarter → [{q:period, returning:N, newContributors:N, active:N, c:idx===last}]
  retentionYearly: contributors.retention_by_year → [{y:period, returning:N, newContributors:N, active:N, c:is_current||idx===last}]

  PR DATA:
  prMonthly: pull_requests.months sorted by month string (oldest→newest) → [{m:YYYY-MM, v:pr_count, c:is_current}]
  prYearly: pull_requests.years → [{y:year.toString(), v:pr_count, c:idx===last}]

  ISSUE DATA:
  issueMonthly: issues.months sorted by month → [{m:YYYY-MM, open:N, closed:N, c:is_current}]
  issueYearly: issues.years → [{y:year.toString(), open:N, closed:N, c:idx===last}]

  CVE DATA:
  cveYearly: cves.by_year → [{y:year.toString(), v:count, c:is_current}]
  cveMonthly: cves.by_month → [{m:YYYY-MM, v:count, c:is_current}]
  cveEntries: cves.entries (raw list, sorted by severity in Detail component)
  cveTotalAllTime: cves.total_all_time
  cveSource: cves.source

  COMPANIES:
  metadata.top_contributing_companies → [{n:company, c:formatNumber(commits), p:`${percentage}%`, strong:idx===0}]

  META TABLE:
  [
    {f:'Total releases', v:formatNumber(releases.total_releases)},
    {f:'Created',        v:new Date(metadata.created_at).getFullYear().toString()},
    {f:'Language',       v:metadata.language || '—'},
    {f:'License',        v:metadata.license || '—'},
  ]

  ADOPTERS:
  d.adopters = adopters.adopters
  d.adoptersSource = adopters.source

  ISSUE SOURCE:
  d.issueSource = project.issueSource || 'github'
  d.jiraProjectKey = project.jiraProjectKey
  d.jiraBaseUrl = project.jiraBaseUrl

  ALSO MAP:
  d.id = project.id
  d.name = project.name
  d.repoUrl = project.githubUrl
  d.foundation = project.foundation || 'Independent'
  d.sub = project.foundation || 'Independent'
  d.founded = metadata.created_at ? "Founded " + new Date(metadata.created_at).getFullYear() : "Recently added"
  d.extractedAt = metadata.extractedAt or commits.extractedAt (whichever is most recent)
  d.prMedianMergeDays = pull_requests.median_merge_time_days
  d.issueMedianResolutionDays = issues.median_resolution_time_days

  RETENTION SUMMARY (for Detail retention caption):
  latestRetention = retentionQuarters[last]
  d.retention = { returning: pct, neu: pct, cap: "N new · N returning (Q3 2024)" }

  formatNumber helper: n.toLocaleString('en-US') — handles undefined/null with '—'
```

### Prompt 4.6 — `frontend/src/components/ui.jsx`

```
Create frontend/src/components/ui.jsx with these exported components:

Tag({ cls, label }):
  <span className={`tag ${cls}`}><span className="dot"/>{label}</span>

Tile({ label, value, help }):
  <div className="tile">
    <div className="k-label">{label}</div>
    <div className="k-value">{value}</div>
    <div className="k-help">{help}</div>
  </div>

BarChart({ values, labels, currentIndex, variant, tooltipLabel, tooltipFormatter, fitWhenDense, slanted }):
  - currentIndex defaults to values.length - 1
  - maxOf(values) = Math.max(...values, 1) to avoid division by zero
  - Bar height = v===0 ? 1 : Math.round((v/max)*100) percent
  - fitWhenDense: if values.length >= 24 → "dense", >= 18 → "compact", else "spread" density CSS class
  - variant "twelve" / "mini" adds class to .bars div
  - Mouse tooltip: position relative to .bar-chart-wrap, 36px above cursor
  - Tooltip text: tooltipFormatter({value, label, index}) if provided,
    else `${labels[i]}: ${v.toLocaleString('en-US')} ${tooltipLabel}`
  - .bar.current class applied when i === currentIndex

StackedBarChart({ values, labels, currentIndex, variant, tooltipFormatter, segmentOrder, fitWhenDense }):
  - values: array of objects {open, closed} or {returning, newContributors}
  - segmentOrder defaults to ["closed","open"]
  - Total = sum of segmentOrder keys per entry for height scaling
  - Each bar is .bar.stacked; segments are flex column-reverse children .bar-segment.{key}
  - Segment height = (v[key]/total)*100 percent
  - Default tooltip: "${label}: ${total} issues (${open} open, ${closed} closed)"

Meter({ label, value, color }):
  label + value% in a flex row, 0.5rem track below, .meter-fill.{color} width = value%

All three components use local useState for tooltip state.
```

### Prompt 4.7 — `frontend/src/components/UIShellHeader.jsx`

```
Create UIShellHeader({ onToggleNav, navOpen, extracting, onExtractionDone, onTokenExpired }).

Renders <header className="ui-shell">:
- Hamburger button (.menu-btn) with 3-line SVG icon. aria-expanded={navOpen}.
- When extracting is non-null, renders <ExtractionToast key={extracting.id} ... />
  (key on projectId forces remount when project changes during refresh-all queue)
```

### Prompt 4.8 — `frontend/src/components/ExtractionToast.jsx`

```
Create ExtractionToast({ projectId, projectName, mode, onDone, onTokenExpired }).
Rendered inside UIShellHeader; positioned inline in the header bar.

Uses EventSource('/api/projects/{projectId}/extraction-progress') with 800ms start delay.

LINE PARSER (parseLine):
  "metadata"        → "Extracting metadata…"
  "contributor"     → "Extracting contributors…"
  "commit"          → "Extracting commits…"
  "issue"           → "Extracting issues…"
  "pull request"    → "Extracting pull requests…"
  "release"         → "Extracting releases…"
  "adopter"         → "Extracting adopters…"
  "__DONE__"        → {step:"Extraction complete", done:true}
  "__TOKEN_EXPIRED__" → {step:"Token expired or invalid", failed:true, tokenExpired:true}
  "__FAILED__"      → {step:"Extraction failed", failed:true}
  anything else → null (ignored)

SSE onerror: if not already done/failed, treat as complete (extraction already wrote files).
Auto-dismiss on generic failure (not token expiry) after 3000ms.

Title shows: "Refreshing {name}" when mode='refresh', "Adding {name}" when mode='add'

Step color: red-40 if failed, green-40 if done, header-text-dim if in-progress

Success state: Carbon-style inline notification with CheckmarkFilled SVG (16×16)
  Shows "{name} is ready to view."

Token expired state: shows "Update token" button that:
  1. Closes SSE
  2. Calls onDone()
  3. Calls onTokenExpired()
  Also clears localStorage token on token expiry detection.
```

### Prompt 4.9 — `frontend/src/components/SideNav.jsx`

```
Create SideNav({ data, order, selectedKey, collapsed, onSelect, onOverview, onRemove }).

<nav className={"sidenav" + (collapsed ? " collapsed" : "")}>
  <div className="sidenav-inner">  ← fixed width prevents reflow during collapse

Top item: "Overview" button (.nav-item.nav-overview) linking back to dashboard home.

Sorted project list: sort order.slice() by d.name with localeCompare(numeric, base sensitivity).

Each project rendered as .nav-item-wrap:
  - .nav-item button: aria-current="page" when key===selectedKey
    .ni-name = d.name, .ni-sub = d.sub (foundation)
  - .nav-remove trash icon button (IBM Carbon trash SVG inline)
    TWO-CLICK CONFIRM: first click sets confirmKey; second click on same key calls onRemove.
    While confirming: button shows text "Remove?" (.nav-remove--confirm class) instead of icon.
    Clicking a different nav item clears confirmKey.
```

### Prompt 4.10 — `frontend/src/components/Overview.jsx`

```
Create Overview component with these props:
{ data, order, flashKey, onSelect, onAddClick, onUpdateProject,
  selectMode, selectedKeys, onSelectToggle, onToggleSelectMode,
  onDeleteSelected, deleting, onRefreshAll }

HEADER SECTION:
  h1 "Open Source Dashboard"
  Right side: "Refresh all" button + "Last updated: {date}" text
  Last updated = oldest extractedAt across all projects (the laggiest update)
  Date format: "January 15, 2025 at 2:30 PM"

SUMMARY TILES (4 tiles using .tile-grid):
  - Total communities (count)
  - Total contributors (All-Time) = sum of ov.contributorsAllTime across projects
  - Commits (All-Time) = sum of ov.commitsAllTime
  - Open Issues = sum of kpis[4].v (Open Issues KPI)

COMMUNITIES TABLE (#commTable):
  Columns: Name | Foundation | Repository | Contributors YTD | Contributors All-Time |
           Commits YTD | Commits All-Time | Stars | Status | (chevron)
  When selectMode=true: checkbox column prepended; chevron removed

  SELECT MODE TOOLBAR:
  "Select" / "Unselect" ghost button
  When selectMode on: "Delete N projects" danger button (disabled/dim when 0 selected)

  ROW BEHAVIOR (CommunityRow component):
  - Single click on editable cell (name, foundation): schedules navigation with 300ms delay
  - Double-click on editable cell: cancels navigation, activates inline editor
  - Single click on non-editable cell: navigates immediately
  - Enter/Space: navigate (or toggle checkbox in select mode)
  - InlineEdit input: Enter commits, Escape reverts, onBlur commits
  - Commit only if value changed and non-empty
  - Guard against double-fire: committed ref prevents double save from Enter+onBlur
  - Double-click only triggers double events (two click events precede dblclick): cancel nav

ROW FLASH ANIMATION:
  When flashKey matches data-key, add row-flash class. Parent clears flashKey after 1200ms.
  Auto-scroll into view with scrollIntoView behavior:"smooth" block:"center"

SELECT+DELETE FLOW:
  "Delete N projects" → opens DeleteConfirmModal → on confirm calls onDeleteSelected
  DeleteConfirmModal shows project names in message body
  Closes on Escape or backdrop click

REFRESH MODAL:
  Password input for GitHub token (pre-filled from getSavedToken())
  On submit: saveGithubToken + refreshAllProjects(token) → calls onRefreshAll(result.started)

ADD PROJECT BUTTON:
  "+ Add project" primary button → calls onAddClick
```

### Prompt 4.11 — `frontend/src/components/Detail.jsx`

```
Create Detail({ d, onOverview, onRefreshProject }) — the per-project drilldown page.

PAGE HEADER:
  Breadcrumb: "Overview / {d.name}"
  Title row: h1 page-title + Tag (status) + right-aligned "Refresh project" button
  Below title: foundation | founded | releaseFrequency (if present)
  Last updated timestamp below Refresh button: "Last updated: Jan 15, 2025, 2:30 PM"

REFRESH PROJECT MODAL:
  Triggered by "Refresh project" button.
  Password input for token + confirm button.
  On submit: calls POST /api/projects/{id}/extract with {token}, then calls onRefreshProject(id, name).
  The actual progress is shown in the header ExtractionToast.

KPI TILES:
  d.kpis array → .tile-grid (8 tiles: 4×2 grid, responsive to 2×4 then 1×8)

COMMITS SECTION:
  Toggle button "Show quarterly" / "Show yearly" (btn-refresh style)
  Yearly view: BarChart with d.commits (years array)
  Quarterly view: BarChart with d.quarters.slice(-16) (last 16 quarters)
  Both use fitWhenDense=true
  Caption: "Darker bar = current period · ..."

CONTRIBUTORS SECTION:
  Toggle "Show quarterly" / "Show yearly"
  Yearly view: StackedBarChart from d.retentionYearly — segmentOrder:["returning","newContributors"]
  Quarterly view: StackedBarChart from d.retentionQuarterly
  Both use fitWhenDense=true
  Tooltip shows: "{label}: {active} contributors ({newContributors} new, {returning} returning)"
  Caption: "Darker bar = current period · Red = New Contributors · Blue = Returning Contributors · ..."
  Quarterly caption also shows d.retention.cap

PULL REQUESTS SECTION:
  Toggle "Show monthly" / "Show yearly"
  Monthly default: BarChart from d.prMonthly, tooltipLabel="PRs"
  Yearly: BarChart from d.prYearly
  Caption includes median merge time if d.prMedianMergeDays != null
  Format: if < 1 day → "{N} hrs", else "{N.N} days"

ISSUE ACTIVITY SECTION:
  Toggle "Show monthly" / "Show yearly"
  StackedBarChart with {open, closed} segments, segmentOrder:["closed","open"]
  If no issues: shows grey empty state panel with source label
  Source: "Jira (KEY)" or "GitHub Issues"
  Caption: source attribution + jiraBaseUrl link if applicable

CVE SECTION:
  Toggle "Show monthly" / "Show yearly"
  Bar chart of CVE counts over time
  If no CVEs: grey empty state panel
  CVE list (CveTable): sortable by ID/severity/date
    Severity column uses SEV_COLOR: critical→red-60, high→red-40, medium→yellow-30, low→blue-40, unknown→gray-50
    SEV_ORDER for default sort: critical(0)>high(1)>medium/moderate(2)>low(3)>unknown(4)
    "Show all" / "Show less" toggle when > 5 entries
    SortArrow component: up/down/neutral SVG indicator

COMPANIES & METADATA SECTION:
  .two-col layout:
  Left: "Top Contributing Companies" table — Company / Commits / %
    Rows with c.muted use text-helper color
  Right: "Project Metadata" table — Field / Value
    Rows with m.flag=true use td.flag class (green bold text)

AI POLICY SECTION (conditional: d.aiPolicySummary && length > 0):
  Bulleted list in a table-wrap styled container
  Source link below

ADOPTERS SECTION (conditional: d.adopters && cleaned list > 0):
  FILTER LOGIC before display:
    - Remove entries where name is missing
    - Remove entries matching /^(\.\.|and more|more |see |\*\*|note:|please )/i
    - Remove entries with name > 60 chars
    - Remove entries whose name matches article title patterns (e.g. "on kubernetes", "using", "deploy")
    - Remove entries whose URL matches article hosts (medium.com, itnext.io, dev.to, etc.)
  Sort alphabetically by name
  Display first 18 by default, "Show all"/"Show less" toggle when > 18
  6-column grid layout with 1px gaps (border-subtle bg)
  Each cell: background layer-02, padding 0.75rem 1rem, font-weight 600
  Names with URLs: <a> link in var(--link) color

CONTROLS ASSESSMENT SECTION (conditional: d.controls && length > 0):
  Accordion-style ControlRow components
  Each row: click to expand/collapse
  Shows automated governance check results

FOOTER:
  "Data sources: GitHub REST & GraphQL APIs · Git History · [Jira if applicable] · [CVE source] · [Adopters if applicable]"
```

### Prompt 4.12 — `frontend/src/components/AddProjectModal.jsx`

```
Create AddProjectModal({ open, onClose, onAdd, onSuccess, tokenConfigured, onTokenSaved }).

Modal with:
1. GitHub personal access token (password input, always required, pre-filled from getSavedToken())
   - Field help: "Needs at least public_repo read access"
   - Link: https://github.com/settings/tokens/new?description=oss-dashboard&scopes=public_repo
   - Token is saved to SettingsService and localStorage on add

2. Primary GitHub repository URL (required, text input, validates on backend)
   - Placeholder: "https://github.com/owner/repo"
   - Enter key submits

3. Issue tracker radio group: "GitHub Issues" | "Jira"
   GitHub Issues selected by default

4. When GitHub Issues selected: optional "Issue repository URL" field
   (for projects where issues are in a separate repo)

5. When Jira selected: required "Jira project key" + required "Jira base URL"
   jiraKey onChange: toUpperCase()

SUBMIT FLOW:
1. saveGithubToken(token)
2. POST /api/projects
3. Wait 2 seconds showing info status
4. onClose() → onSuccess() → onAdd(project.id, project.name)

ERROR HANDLING:
  Duplicate project: "This project has already been added. Remove it first if you want to re-extract data."
  Shows .add-status.err or .add-status.info panel below form
  input.invalid + .field.show-err on validation failure

Close on Escape or backdrop click.
```

### Prompt 4.13 — `frontend/src/App.jsx`

```
Create App.jsx as the root component.

STATE:
  data: {} — map of projectId → transformed project object
  order: [] — list of projectIds (insertion order from backend)
  loading, error
  view: "overview" | "detail"
  selectedKey: string | null
  navCollapsed: boolean (initially true — sidebar starts closed)
  modalOpen: boolean
  flashKey: string | null (triggers row flash animation)
  selectMode: boolean
  selectedKeys: Set
  deleting: boolean
  refreshQueue: [{id, name}] — ordered queue for refresh-all
  extracting: {id, name, mode:'add'|'refresh'} | null
    Persisted to localStorage('oss_dashboard_extracting') — survives page reload
  tokenConfigured: boolean

LOAD FLOW (loadProjects):
  1. fetchProjects() → array
  2. For each project: fetchProjectMetrics(id) → transformProjectData(project, metrics)
  3. Set data, order
  4. If no selectedKey and projects exist: set first project as selectedKey
  silent=true skips loading/error state update (used for background refresh)

ON MOUNT: loadProjects() + fetchTokenStatus().then(s=>setTokenConfigured(s.configured))

REFRESH-ALL QUEUE:
  handleRefreshAll(ids): sets extracting to first project, refreshQueue to rest
  handleExtractionDone: if queue non-empty → advance to next; else → setExtracting(null) + loadProjects(silent)

NAVIGATION:
  showOverview: setView("overview"), window.scrollTo(0,0)
  showDetail(key): setSelectedKey, setNavCollapsed(true), setView("detail"), window.scrollTo(0,0)

PROJECT UPDATE (handleUpdateProject):
  1. Optimistic patch of in-memory data (name, foundation, sub, ov.foundation)
  2. updateProject(id, fields) — on success confirms state from response
  3. On failure: loadProjects({silent:true}) to restore truth

LOADING STATE:
  Full-viewport centered "Loading projects..." in text-secondary color

ERROR STATE:
  Centered error message with red h2 + retry button (btn-primary)

LAYOUT:
  <>
    <UIShellHeader .../>
    <div className="layout">
      <SideNav .../>
      {view==="overview" ? <Overview .../> : <Detail .../>}
    </div>
    <AddProjectModal .../>
  </>
```

---

## Phase 5 — Data JSON Schemas (Reference)

### Prompt 5.1 — Full per-project JSON file schemas

These are the exact field names (snake_case) as written by the Python scripts:

**metadata.json** — see Phase 2 Prompt 2.3 `extract_project_metadata` output schema

**contributors.json** — see Phase 2 Prompt 2.3 `extract_contributors` output schema

**commits.json** — stored newest-first quarters array. Frontend reverses for display.
Fields: total_commits, quarters[{start_date, end_date, commit_count, quarter}],
years[{year, commit_count, is_current}], committers[{login, name, company, location, email, profile_url, commit_count}], time_scope, extracted_at

**issues.json**:
{total_open, total_closed, median_resolution_time_days,
months[{month:"YYYY-MM", open, closed, is_current}],
years[{year, open, closed, is_current}],
issue_commenters, time_scope, extracted_at}

**pull_requests.json**:
{total_prs, total_merged, median_merge_time_days,
months[{month:"YYYY-MM", pr_count, merged_pr_count, is_current}],
years[{year, pr_count, merged_pr_count, is_current}],
time_scope, extracted_at}

**releases.json**:
{total_releases, releases[{tag_name, name, published_at, is_prerelease, body_excerpt}], extracted_at}

**adopters.json**:
{adopters[{name, url}], source, extracted_at}

**cve.json**:
{total_all_time, source, entries[{id, ghsa_id, summary, severity, published_at, url}],
by_year[{year, count, is_current}], by_month[{month, count, is_current}], extracted_at}

**projects.json** (at data root):
{last_updated, projects[{id, name, github_url, owner, repo, foundation, website, enabled, data_dir,
 issue_source?, jira_project_key?, jira_base_url?, issue_github_url?}]}

### Prompt 5.2 — Java ↔ JSON field name mapping

```
The Java ObjectMapper uses default-property-inclusion=non_null and
write-dates-as-timestamps=false.

Java camelCase fields are serialized to camelCase JSON by default.
The Python scripts write snake_case JSON.

The frontend api.js handles BOTH by always checking both:
  contributors?.retentionByQuarter || contributors?.retention_by_quarter
  y.commitCount || y.commit_count
  etc.

This means the backend can serve either camelCase (Java serialized) or snake_case (file read)
and the frontend works correctly in both cases.
```

---

## Phase 6 — Critical Behavioral Details

### Prompt 6.1 — Extraction flow end-to-end

```
When a user adds or refreshes a project, the full flow is:

1. Frontend POSTs to /api/projects (add) or /api/projects/{id}/extract (refresh)
   - Token is included in the request body
   - Backend saves token to SettingsService (in-memory)
   - Backend starts a background thread running:
       python3 scripts/extract_single_project.py "{project.name}"
     with GITHUB_TOKEN env var set

2. Backend streams stdout line-by-line into extractionLogs[projectId] (CopyOnWriteArrayList)

3. On Python exit code 0: backend immediately runs extract_cves.py
   On exit code != 0: appends __FAILED__ and sets extractionRunning=false

4. After CVE extraction (regardless of success): appends __DONE__, sets extractionRunning=false

5. Frontend opens EventSource('/api/projects/{id}/extraction-progress')
   - Polls every 300ms, sends new log lines
   - Closes SSE when __DONE__ or __FAILED__ encountered
   - ExtractionToast parses each line with parseLine() and updates the UI step

6. For refresh-all: Frontend receives ordered ID list, advances through them sequentially
   - Each toast fires onDone → App advances refreshQueue
   - After last project: loadProjects({silent:true}) reloads all data

IMPORTANT: The SSE endpoint only closes when it has sent all lines AND isExtractionRunning is false.
If SSE errors before completion (e.g. backend restart), treat as done (data already written).
```

### Prompt 6.2 — config.yaml ↔ projects.json synchronization

```
Both files must stay in sync:
- data/projects.json is the frontend/backend registry (id, name, data_dir, etc.)
- scripts/config.yaml is what the Python extraction scripts read (name, owner, repo, etc.)

When a project is ADDED via the UI:
  1. Java writes to projects.json
  2. Java appends a YAML block to config.yaml inside the `projects:` list

When a project is UPDATED (name/foundation) via inline edit:
  1. Java patches projects.json (name, foundation — data_dir is NEVER changed)
  2. Java rewrites the matching YAML block in config.yaml (finds by old name)

When a project is REMOVED via the UI:
  1. Java removes from projects.json
  2. Java deletes the YAML block from config.yaml (finds by project name)
  3. Java recursively deletes data/<data_dir>/ directory

_sync_projects_json (Python): called at start of every extraction run to ensure
  any manual config.yaml edits are reflected in projects.json.
```

### Prompt 6.3 — Token management

```
GitHub token lifecycle:
- User enters token in AddProjectModal or RefreshModal
- Frontend: localStorage.setItem('oss_dashboard_github_token', token)
- Frontend: POST /api/settings/token {token}  (saves to SettingsService in-memory)
- When extraction is triggered: token sent again in POST body as safety net
- SettingsService.getGithubToken() is called in DataService.triggerDataExtraction()
  → IllegalStateException thrown if null

Token expiry detection:
- extract_single_project.py validates token with github.get_user().login before any work
- On GithubException: prints __TOKEN_EXPIRED__ and exits 1
- Backend sends __TOKEN_EXPIRED__ to frontend via SSE
- ExtractionToast shows "Update token" button, calls onTokenExpired()
- App.jsx: setExtracting(null), setRefreshQueue([]), setTokenConfigured(false), setModalOpen(true)
- AddProjectModal pre-fills token from getSavedToken()
- localStorage token is cleared when __TOKEN_EXPIRED__ is detected in ExtractionToast
```

### Prompt 6.4 — Project ID and data_dir stability

```
RULE: Once a project is added, its data_dir NEVER changes, even if the display name changes.
This guarantees extraction state, cached git mirrors, and JSON files are always found.

data_dir derivation (deriveDataDir in Java, _project_dir in Python):
  - strimzi-kafka-operator → strimzi
  - camel                  → apache-camel
  - activemq-artemis       → apache-artemis
  - apicurio-registry / apicurio-studio → apicurio
  - console                → streamshub
  - default: id.toLowerCase().replace("_","-")

This mapping MUST be identical in both Java (DataService.deriveDataDir) and
Python (GitHubDataExtractor._project_dir dir_name_map). They are the source of truth.
```

### Prompt 6.5 — Bar chart density and current-period highlighting

```
ALL bar charts follow these rules:

1. The "current" bar (most recent period) renders darker:
   - Regular: background var(--blue-60) vs var(--blue-30) for historical
   - Stacked: segment colors shift from light to saturated (see CSS above)

2. Dense mode (fitWhenDense=true, used in Detail view charts):
   - >= 24 bars: "dense" class (gap:0, axis labels 0.5rem)
   - >= 18 bars: "compact" class (gap clamp)
   - < 18 bars: "spread" class (gap clamp)

3. Mini mode (Overview table mini sparklines): height 5rem, bar max-width 1.25rem

4. Tooltip: position relative to .bar-chart-wrap wrapper, never overflows header.
   Appears 36px above cursor.

5. The quarters array in ov is used only for mini bar sparklines in the Overview table.
   The full quarterly data (d.quarters) is used in Detail chart.
```

---

## Phase 7 — GitHub Actions

### Prompt 7.1 — `.github/workflows/data_refresh.yml`

```yaml
name: Refresh OSS Dashboard Data

on:
  schedule:
    - cron: '0 6 * * 1'   # Every Monday at 06:00 UTC
  workflow_dispatch:        # Allow manual trigger

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd scripts
          pip install -r requirements.txt
          playwright install chromium

      - name: Create config.yaml from secret
        run: |
          cat > scripts/config.yaml << 'EOF'
          github:
            token: "${{ secrets.GITHUB_TOKEN_OSS }}"
          projects:
            # Projects populated from repository config
          EOF

      - name: Run data extraction
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN_OSS }}
        run: |
          cd scripts
          python3 extract_github_data.py

      - name: Commit and push data
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add data/
          git diff --staged --quiet || git commit -m "chore: refresh OSS dashboard data [skip ci]"
          git push
```

---

## Phase 8 — Validation Checklist

After building all components, verify:

**Backend**
- `mvn spring-boot:run` starts on port 8080 without errors
- `GET /api/projects` returns JSON array
- `GET /api/projects/{id}/metrics` returns all 8 sub-objects (null for missing files is OK)
- `POST /api/projects` with a valid GitHub URL adds to projects.json and config.yaml
- `DELETE /api/projects/{id}` removes from both files and deletes data directory
- SSE endpoint streams lines and sends `__DONE__` when extraction completes

**Python**
- `cd scripts && GITHUB_TOKEN=xxx python3 extract_single_project.py "ProjectName"` runs
- Outputs extraction step headers matching the toast parser sentinel strings
- Writes all JSON files to `data/<data_dir>/`
- Prints `__TOKEN_EXPIRED__` and exits 1 on invalid token

**Frontend**
- `cd frontend && npm run dev` starts on port 3000
- Overview page: 4 summary tiles, communities table, all projects listed
- Detail page: 8 KPI tiles, all 6+ chart sections (commits, contributors, PRs, issues, CVEs, companies)
- Add project modal: validates token + URL, shows extraction toast in header
- Refresh all: cycles through all projects showing one toast at a time
- Inline edit (double-click name or foundation): saves optimistically, confirms from backend
- Sidenav: collapse/expand animation, two-click delete confirm, active page indicator
- Responsive: 820px breakpoint for 2-column tile grid and two-col layout

**Design**
- Font renders as IBM Plex Sans (verify via DevTools → Elements → Computed → font-family)
- Header is #161616 near-black, not blue
- Active nav item has left blue border + --layer-selected background
- Current-period bar is darker (blue-60) vs historical (blue-30)
- Stacked bar: open/new = red, closed/returning = blue
- Tags: green dot for Healthy, yellow for Watch, blue for Growing, gray for N/A
- No external CSS frameworks, no Carbon npm packages
