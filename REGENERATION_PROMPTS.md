# OSS Dashboard - Complete Regeneration Prompts

This document contains comprehensive prompts to regenerate the entire oss-dashboard project from scratch, capturing all architectural nuances and implementation details.

## 📋 Overview

The OSS Dashboard is an enterprise-grade system that monitors contributor activity and project health metrics across multiple open-source GitHub repositories using a polyglot architecture.

**Architecture:**
- **Python** - Data extraction from GitHub API (scripting, scheduled tasks)
- **Java Spring Boot** - Production-ready REST API backend
- **React + Vite** - Modern frontend dashboard with clean, professional UI
- **JSON** - File-based data storage with caching and incremental updates

**Key Features:**
- Dynamic project addition via REST API
- Intelligent caching (git mirrors, user profiles, per-project state)
- Incremental data extraction with checkpoints
- Time-scoped metrics with explicit metadata
- Real-time dashboard with interactive visualizations
- Fully functional frontend with overview and detail views
- Add project modal for dynamic project management

---

## Phase 1: Project Foundation & Structure

### Prompt 1.1: Initialize Project Structure

Create "oss-dashboard" project with this exact structure:

```
oss-dashboard/
├── scripts/           # Python data extraction
├── backend/           # Java Spring Boot API
├── frontend/          # React + Vite dashboard
├── data/              # JSON data storage
├── projectdata/       # Alternative data directory
├── .cache/            # Git mirrors and user profile cache
│   ├── repos/         # Cached git repositories
│   └── user_profiles.json
└── .github/           # GitHub Actions (future)
```

Create `.gitignore` excluding:
```
# Python
__pycache__/
*.pyc
*.pyo
venv/
.env
.cache/

# Java
target/
*.class
*.jar
!.mvn/wrapper/maven-wrapper.jar

# Data (keep structure, ignore content)
data/*/
!data/projects.json
projectdata/*/
!projectdata/projects.json

# IDE
.vscode/
.idea/
*.iml
.DS_Store

# Node
node_modules/
dist/
*.log
```

Add MIT LICENSE with appropriate copyright year.

### Prompt 1.2: Create Project Registry

Create `data/projects.json` with 6 initial projects:

```json
{
  "projects": [
    {
      "id": "strimzi",
      "name": "Strimzi",
      "github_url": "https://github.com/strimzi/strimzi-kafka-operator",
      "owner": "strimzi",
      "repo": "strimzi-kafka-operator",
      "foundation": "CNCF",
      "website": "https://strimzi.io",
      "enabled": true
    },
    {
      "id": "apache-camel",
      "name": "Apache Camel",
      "github_url": "https://github.com/apache/camel",
      "owner": "apache",
      "repo": "camel",
      "foundation": "Apache",
      "website": "https://camel.apache.org",
      "enabled": true
    },
    {
      "id": "apache-activemq",
      "name": "Apache ActiveMQ",
      "github_url": "https://github.com/apache/activemq",
      "owner": "apache",
      "repo": "activemq",
      "foundation": "Apache",
      "website": "https://activemq.apache.org",
      "enabled": true
    },
    {
      "id": "keycloak",
      "name": "Keycloak",
      "github_url": "https://github.com/keycloak/keycloak",
      "owner": "keycloak",
      "repo": "keycloak",
      "foundation": "CNCF",
      "website": "https://www.keycloak.org",
      "enabled": true
    },
    {
      "id": "apicurio",
      "name": "Apicurio",
      "github_url": "https://github.com/Apicurio/apicurio-studio",
      "owner": "Apicurio",
      "repo": "apicurio-studio",
      "foundation": "Independent",
      "website": "https://www.apicur.io",
      "enabled": true
    },
    {
      "id": "3scale",
      "name": "3scale",
      "github_url": "https://github.com/3scale/3scale-operator",
      "owner": "3scale",
      "repo": "3scale-operator",
      "foundation": "Red Hat",
      "website": "https://www.3scale.net",
      "enabled": true
    }
  ]
}
```

---

## Phase 2: Python Data Extraction System

### Prompt 2.1: Create Main Extraction Script

Create `scripts/extract_github_data.py` with these features:

**Core Functionality:**
- GitHubDataExtractor class with comprehensive data extraction
- Intelligent caching system (git mirrors, user profiles)
- Per-project state management for incremental updates
- Quarterly aggregation for commits and PRs
- Company affiliation detection from email domains
- Contributor retention tracking by quarter
- All-time and time-windowed metrics with explicit metadata

**Key Methods:**
```python
class GitHubDataExtractor:
    def __init__(self, config_path: str = "config.yaml")
    def _load_config(self, config_path: str) -> Dict
    def _load_json_file(self, path: Path, default: Any) -> Any
    def _save_json_file(self, path: Path, data: Any)
    def _project_dir(self, project_name: str) -> Path
    def _project_state_path(self, project_name: str) -> Path
    def _load_project_state(self, project_name: str) -> Dict[str, Any]
    def _save_project_state(self, project_name: str, state: Dict[str, Any])
    def _get_quarter_dates(self, quarters_back: int = 8) -> List[tuple]
    def _get_quarter_label(self, date: datetime) -> str
    def _get_or_clone_repo(self, owner: str, repo: str) -> Optional[Path]
    def _get_user_profile(self, username: str) -> Dict[str, Optional[str]]
    def _extract_company_from_email(self, email: str) -> Optional[str]
    def extract_all_projects(self)
    def extract_project_data(self, project: Dict)
    def extract_metadata(self, repo, project: Dict) -> Dict
    def extract_contributors(self, repo, project: Dict, project_dir: Path, state: Dict) -> Dict
    def extract_commits(self, repo, project: Dict, project_dir: Path, state: Dict) -> Dict
    def extract_issues(self, repo) -> Dict
    def extract_pull_requests(self, repo) -> Dict
    def extract_releases(self, repo) -> Dict
```

**Critical Features:**
1. **Caching Strategy:**
   - Git repository mirrors in `.cache/repos/`
   - User profile cache in `.cache/user_profiles.json`
   - Per-project state in `data/{project}/_state.json`

2. **Time Scope Metadata:**
   - All JSON files include `time_scope` field
   - Distinguishes between "all-time" and windowed data
   - Example: `"time_scope": "Last 8 quarters (2024 Q2 - 2026 Q1)"`

3. **Incremental Extraction:**
   - Tracks `last_git_sync_at` for commit extraction
   - Tracks `known_logins` for contributor extraction
   - Only fetches new data on subsequent runs

4. **Company Detection:**
   - Extracts company from email domains
   - Enriches with GitHub profile company field
   - Aggregates top companies by commit count

5. **Quarterly Aggregation:**
   - Commits grouped by quarter
   - Contributor retention by quarter (new vs returning)
   - PR counts by quarter

### Prompt 2.2: Create Requirements File

Create `scripts/requirements.txt`:
```
PyGithub==2.1.1
PyYAML==6.0.1
tqdm==4.66.1
requests==2.31.0
```

### Prompt 2.3: Create Configuration Template

Create `scripts/config.yaml.example`:
```yaml
github:
  token: "YOUR_GITHUB_TOKEN_HERE"
  
extraction:
  # Number of quarters to look back for commit history
  quarters_back: 8
  
  # Rate limiting (requests per second)
  rate_limit: 10
  
  # Cache settings
  cache_user_profiles: true
  cache_git_repos: true
  
  # Data directory (relative to project root)
  data_directory: "../data"
```

### Prompt 2.4: Create Single Project Extraction Script

Create `scripts/extract_single_project.py`:
```python
#!/usr/bin/env python3
"""
Extract data for a single project
Usage: python3 extract_single_project.py <project_id_or_name>
"""

import sys
import json
from extract_github_data import GitHubDataExtractor
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 extract_single_project.py <project_id_or_name>")
        print("Example: python3 extract_single_project.py kubernetes")
        sys.exit(1)
    
    project_identifier = sys.argv[1]
    
    # Initialize extractor
    config_path = Path(__file__).parent / "config.yaml"
    extractor = GitHubDataExtractor(str(config_path))
    
    # Read projects from projects.json
    projects_file = Path(__file__).parent.parent / "data" / "projects.json"
    with open(projects_file, 'r') as f:
        projects_data = json.load(f)
    
    # Find and extract the project
    project = None
    for p in projects_data['projects']:
        if p['id'].lower() == project_identifier.lower() or p['name'].lower() == project_identifier.lower():
            project = p
            break
    
    if not project:
        print(f"❌ Project '{project_identifier}' not found")
        sys.exit(1)
    
    print(f"\n🚀 Extracting data for: {project['name']}\n")
    extractor.extract_project_data(project)
    print(f"\n✅ Extraction complete for {project['name']}")

if __name__ == "__main__":
    main()
```

### Prompt 2.5: Create Reset State Script

Create `scripts/reset_commit_state.py`:
```python
#!/usr/bin/env python3
"""
Reset commit state to force full all-time re-extraction
"""

import json
from pathlib import Path

def reset_commit_state():
    data_dir = Path(__file__).parent.parent / "data"
    projects_reset = 0
    
    for project_dir in data_dir.iterdir():
        if not project_dir.is_dir():
            continue
            
        state_file = project_dir / "_state.json"
        if not state_file.exists():
            continue
        
        with open(state_file, 'r') as f:
            state = json.load(f)
        
        if "commits" in state and "last_git_sync_at" in state["commits"]:
            state["commits"]["last_git_sync_at"] = None
            
            with open(state_file, 'w') as f:
                json.dump(state, f, indent=2)
            
            print(f"✅ Reset {project_dir.name}")
            projects_reset += 1
    
    print(f"\nReset complete! {projects_reset} project(s) will do full extraction.")

if __name__ == "__main__":
    reset_commit_state()
```

---

## Phase 3: Java Spring Boot Backend

### Prompt 3.1: Create Maven POM

Create `backend/pom.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>
    
    <groupId>com.ossdashboard</groupId>
    <artifactId>oss-dashboard-backend</artifactId>
    <version>1.0.0</version>
    <name>OSS Dashboard Backend</name>
    <description>Backend API for Open Source Dashboard</description>
    
    <properties>
        <java.version>17</java.version>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

### Prompt 3.2: Create Application Properties

Create `backend/src/main/resources/application.properties`:
```properties
# Server Configuration
server.port=8080

# Data Directory
app.data.directory=../data

# CORS Configuration
app.cors.allowed-origins=http://localhost:5173,http://localhost:3000

# Actuator
management.endpoints.web.exposure.include=health,info
management.endpoint.health.show-details=always

# Logging
logging.level.com.ossdashboard=INFO
logging.level.org.springframework.web=INFO
```

### Prompt 3.3: Create Main Application

Create `backend/src/main/java/com/ossdashboard/OssDashboardApplication.java`:
```java
package com.ossdashboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class OssDashboardApplication {
    public static void main(String[] args) {
        SpringApplication.run(OssDashboardApplication.class, args);
    }
}
```

### Prompt 3.4: Create Data Models

Create these model classes in `backend/src/main/java/com/ossdashboard/model/`:

**Project.java:**
```java
package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Project {
    private String id;
    private String name;
    @JsonProperty("github_url")
    private String githubUrl;
    private String owner;
    private String repo;
    private String foundation;
    private String website;
    private Boolean enabled;
    
    // Getters and setters
}
```

**ProjectMetrics.java:**
```java
package com.ossdashboard.model;

public class ProjectMetrics {
    private ProjectMetadata metadata;
    private ContributorData contributors;
    private CommitData commits;
    private IssueData issues;
    private PullRequestData pullRequests;
    private ReleaseData releases;
    
    // Getters and setters
}
```

**ProjectMetadata.java, ContributorData.java, CommitData.java, IssueData.java, PullRequestData.java, ReleaseData.java:**
- Create comprehensive model classes matching the JSON structure
- Use Jackson annotations for JSON mapping
- Include all fields from the Python extraction output

**AddProjectRequest.java:**
```java
package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AddProjectRequest {
    @JsonProperty("github_url")
    private String githubUrl;
    private String foundation;
    private String website;
    
    // Getters and setters
}
```

**AddProjectResponse.java:**
```java
package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AddProjectResponse {
    private boolean success;
    private String message;
    private Project project;
    @JsonProperty("extraction_status")
    private String extractionStatus;
    
    // Constructor and getters
}
```

### Prompt 3.5: Create Data Service

Create `backend/src/main/java/com/ossdashboard/service/DataService.java`:

**Key Methods:**
```java
@Service
public class DataService {
    public List<Project> getAllProjects() throws IOException
    public Project getProjectById(String projectId) throws IOException
    public ProjectMetrics getProjectMetrics(String projectId) throws IOException
    public ProjectMetadata getProjectMetadata(String projectId) throws IOException
    public ContributorData getProjectContributors(String projectId) throws IOException
    public Project addProject(AddProjectRequest request) throws IOException
    public String[] parseGithubUrl(String githubUrl)
    public void triggerDataExtraction(String projectId) throws IOException
}
```

**Features:**
- Read JSON files from data directory
- Map project IDs to directory names
- Parse GitHub URLs
- Add projects to projects.json
- Trigger Python extraction script via ProcessBuilder

### Prompt 3.6: Create REST Controller

Create `backend/src/main/java/com/ossdashboard/controller/ProjectController.java`:

**Endpoints:**
```java
@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    @GetMapping
    public ResponseEntity<List<Project>> getAllProjects()
    
    @GetMapping("/{projectId}")
    public ResponseEntity<Project> getProject(@PathVariable String projectId)
    
    @GetMapping("/{projectId}/metrics")
    public ResponseEntity<ProjectMetrics> getProjectMetrics(@PathVariable String projectId)
    
    @GetMapping("/{projectId}/metadata")
    public ResponseEntity<ProjectMetadata> getProjectMetadata(@PathVariable String projectId)
    
    @GetMapping("/{projectId}/contributors")
    public ResponseEntity<ContributorData> getProjectContributors(@PathVariable String projectId)
    
    @PostMapping
    public ResponseEntity<AddProjectResponse> addProject(@RequestBody AddProjectRequest request)
}
```

### Prompt 3.7: Create CORS Configuration

Create `backend/src/main/java/com/ossdashboard/config/CorsConfig.java`:
```java
package com.ossdashboard.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.split(","))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
```

### Prompt 3.8: Create Backend README

Create `backend/README.md` with:
- Setup instructions
- API endpoint documentation
- Example curl commands
- Development guide

---

## Phase 4: React Frontend Dashboard

### Prompt 4.1: Initialize Frontend Project

```bash
cd frontend
npm create vite@latest . -- --template react
npm install
```

### Prompt 4.2: Create Package Configuration

Create `frontend/package.json`:
```json
{
  "name": "oss-dashboard-carbon",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "description": "Open Source community health dashboard — React + Vite",
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

### Prompt 4.3: Create Vite Configuration

Create `frontend/vite.config.js`:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
```

### Prompt 4.4: Create API Client

Create `frontend/src/api.js`:

**Key Functions:**
```javascript
export async function fetchProjects()
export async function fetchProjectMetrics(projectId)
export async function addProject(githubUrl, foundation, website)
export function transformProjectData(project, metrics)
```

**Features:**
- Fetch projects and metrics from backend
- Transform backend data to frontend format
- Handle camelCase to snake_case conversion
- Calculate derived metrics (status, retention, etc.)
- Format numbers with locale-aware formatting

### Prompt 4.5: Create Main App Component

Create `frontend/src/App.jsx`:

**Features:**
- State management for projects, view, selection
- Load projects from backend on mount
- Handle view switching (overview/detail)
- Manage side navigation collapse state
- Handle add project modal
- Error handling and loading states

### Prompt 4.6: Create UI Components

Create these components in `frontend/src/components/`:

**UIShellHeader.jsx:**
- Top navigation bar
- Logo and title
- Navigation toggle button

**SideNav.jsx:**
- Collapsible side navigation
- Project list with selection
- Overview button
- Smooth animations

**Overview.jsx:**
- Summary statistics tiles
- Communities table with all metrics
- Commit activity mini-charts
- Add project button
- Flash animation for newly added projects

**Detail.jsx:**
- Project header with breadcrumb
- KPI tiles
- Commit charts (yearly and quarterly toggle)
- Contributor retention meters
- Top companies table
- Project metadata table
- PR & issue activity chart

**AddProjectModal.jsx:**
- Modal dialog for adding projects
- GitHub URL input with validation
- Loading and status states
- Success/error messaging
- Keyboard navigation (Enter, Escape)

**ui.jsx:**
- Reusable UI components (Tag, Tile, BarChart, Meter)
- Consistent styling and behavior

### Prompt 4.7: Create Styles

Create `frontend/src/index.css`:

**Features:**
- CSS custom properties for theming
- Professional color palette
- Responsive layout
- Smooth transitions and animations
- Accessible focus states
- Table styling with hover effects
- Modal overlay and animations
- Chart visualizations

**Key Sections:**
- Reset and base styles
- Layout (header, sidenav, main)
- Typography
- Components (tiles, tables, charts, modals)
- Utilities (animations, responsive)

### Prompt 4.8: Create Data Constants

Create `frontend/src/data.js`:
```javascript
export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
```

### Prompt 4.9: Create Frontend README

Create `frontend/README.md` with:
- Setup instructions
- Development guide
- Build instructions
- Component documentation

---

## Phase 5: Comprehensive Documentation

### Prompt 5.1: Create Main README

Create `README.md` with:
- Project overview
- Quick start guide (GitHub token, Python deps, data extraction, backend, frontend)
- Project structure
- Tracked projects list
- Configuration instructions
- Extracted metrics description
- Time scope notes
- Backend API section
- Dynamic project addition
- Troubleshooting
- Status indicators

### Prompt 5.2: Create Architecture Documentation

Create `ARCHITECTURE.md` with:
- System design diagram
- Why polyglot architecture
- Data flow explanation
- Component details (Python, Java, React)
- Technology stack
- Deployment options
- Future enhancements
- Performance considerations
- Security considerations

### Prompt 5.3: Create Quick Start Guide

Create `QUICK_START.md` with:
- Prerequisites
- Step-by-step setup
- Running the system
- Verifying installation
- Next steps

### Prompt 5.4: Create Setup Guide

Create `SETUP_GUIDE.md` with:
- Detailed installation instructions
- Environment setup
- Configuration
- Troubleshooting

### Prompt 5.5: Create GitHub Token Guide

Create `HOW_TO_GET_GITHUB_TOKEN.md` with:
- Step-by-step token creation
- Required scopes
- Security best practices

### Prompt 5.6: Create Java/Maven Setup Guide

Create `backend/SETUP_JAVA_MAVEN.md` with:
- Java installation
- Maven installation
- IDE setup
- Running the backend

### Prompt 5.7: Create Add Project API Documentation

Create `ADD_PROJECT_API.md` with:
- API endpoint details
- Request/response examples
- Error handling
- Usage examples

### Prompt 5.8: Create Contributing Guide

Create `CONTRIBUTING.md` with:
- How to contribute
- Code style
- Pull request process
- Issue reporting

### Prompt 5.9: Create Contributor Quickstart

Create `CONTRIBUTOR_QUICKSTART.md` with:
- Quick setup for contributors
- Development workflow
- Testing

### Prompt 5.10: Create Test Documentation

Create `TEST_ADD_PROJECT.md` with:
- Testing the add project feature
- Example test cases
- Expected results

### Prompt 5.11: Create GitHub Setup Guide

Create `GITHUB_SETUP.md` with:
- Repository setup
- Branch protection
- GitHub Actions (future)

### Prompt 5.12: Create Push to GitHub Guide

Create `PUSH_TO_GITHUB.md` with:
- Initial push instructions
- Git workflow
- Best practices

### Prompt 5.13: Create All-Time Data Collection Guide

Create `ALL_TIME_DATA_COLLECTION.md` with:
- Explanation of all-time vs windowed data
- How to reset state for full extraction
- Performance considerations

---

## Phase 6: Data Structure & Examples

### Prompt 6.1: Create Example Data Files

For each project in `data/{project-name}/`, create:

**metadata.json:**
```json
{
  "name": "Project Name",
  "description": "Project description",
  "stars": 1234,
  "forks": 567,
  "language": "Java",
  "license": "Apache-2.0",
  "created_at": "2020-01-01T00:00:00Z",
  "updated_at": "2026-06-25T00:00:00Z",
  "extracted_at": "2026-06-25T17:00:00Z",
  "time_scope": "all-time"
}
```

**contributors.json:**
```json
{
  "total_contributors": 150,
  "company_diversity": 25,
  "top_companies": [
    {"company": "Company A", "commit_count": 500, "percentage": 35.5}
  ],
  "yearly_contributors": [
    {"year": 2026, "contributor_count": 45}
  ],
  "retention_by_quarter": [
    {
      "quarter": "2026-03",
      "active_contributors": 30,
      "new_contributors": 10,
      "returning_contributors": 20
    }
  ],
  "extracted_at": "2026-06-25T17:00:00Z",
  "time_scope": "Last 8 quarters (2024 Q2 - 2026 Q1)"
}
```

**commits.json:**
```json
{
  "total_commits": 5000,
  "quarters": [
    {"quarter": "Q2 2026", "commit_count": 450}
  ],
  "committers": [
    {
      "login": "user1",
      "commit_count": 100,
      "company": "Company A",
      "location": "USA"
    }
  ],
  "extracted_at": "2026-06-25T17:00:00Z",
  "time_scope": "Last 8 quarters (2024 Q2 - 2026 Q1)"
}
```

**issues.json:**
```json
{
  "open_issues": 45,
  "closed_issues": 890,
  "avg_resolution_time_days": 12.5,
  "issue_commenters": [
    {"login": "user1", "comment_count": 50}
  ],
  "extracted_at": "2026-06-25T17:00:00Z",
  "time_scope": "all-time"
}
```

**pull_requests.json:**
```json
{
  "total_pull_requests": 1200,
  "merged_pull_requests": 1050,
  "quarters": [
    {"quarter": "Q2 2026", "pr_count": 85}
  ],
  "extracted_at": "2026-06-25T17:00:00Z",
  "time_scope": "Last 8 quarters (2024 Q2 - 2026 Q1)"
}
```

**releases.json:**
```json
{
  "total_releases": 25,
  "recent_releases": [
    {
      "tag_name": "v1.2.3",
      "name": "Release 1.2.3",
      "published_at": "2026-06-01T00:00:00Z"
    }
  ],
  "extracted_at": "2026-06-25T17:00:00Z",
  "time_scope": "all-time"
}
```

**_state.json:**
```json
{
  "contributors": {
    "known_logins": ["user1", "user2"],
    "last_extracted_at": "2026-06-25T17:00:00Z"
  },
  "commits": {
    "last_git_sync_at": "2026-06-25T17:00:00Z"
  }
}
```

---

## 🎯 Critical Implementation Details

### Caching Strategy

**Git Repository Mirrors:**
- Location: `.cache/repos/{owner}/{repo}/`
- Purpose: Avoid repeated git clones
- Update: Pull latest changes if exists, clone if not
- Benefit: 10x faster subsequent extractions

**User Profile Cache:**
- Location: `.cache/user_profiles.json`
- Structure: `{"username": {"company": "...", "location": "..."}}`
- Purpose: Avoid repeated GitHub API calls for user profiles
- Update: Only fetch if not in cache
- Benefit: Reduces API calls by 90%

**Per-Project State:**
- Location: `data/{project}/_state.json`
- Tracks: Last extraction timestamps, known contributors
- Purpose: Enable incremental updates
- Benefit: Only fetch new data on subsequent runs

### Time Scope Metadata

All JSON files include explicit `time_scope` field:
- `"all-time"` - Data from project inception
- `"Last 8 quarters (2024 Q2 - 2026 Q1)"` - Windowed data

This allows the frontend to display accurate scope information.

### Dynamic Project Addition

**Backend Flow:**
1. Parse GitHub URL to extract owner/repo
2. Generate project ID from repo name
3. Add to `data/projects.json`
4. Trigger Python extraction via ProcessBuilder
5. Return success response with extraction status

**Frontend Flow:**
1. User enters GitHub URL in modal
2. POST to `/api/projects`
3. Show loading state
4. Display success message
5. Reload projects from backend
6. Flash animation on new project row

### Dual Directory Support

Backend supports both `data/` and `projectdata/` directories:
- Configurable via `app.data.directory` property
- Allows flexibility in deployment

### Error Handling

**Python Script:**
- Try/catch around each project extraction
- Continue on failure, log error
- Save partial results

**Backend API:**
- Proper HTTP status codes
- Detailed error messages
- Logging for debugging

**Frontend:**
- Loading states
- Error messages
- Retry functionality

---

## 🚀 Validation Checklist

### Python Script
- [ ] Authenticates with GitHub token
- [ ] Extracts all 6 projects successfully
- [ ] Creates JSON files in correct structure
- [ ] Caches git repos in `.cache/repos/`
- [ ] Caches user profiles in `.cache/user_profiles.json`
- [ ] Creates state files with timestamps
- [ ] Includes time_scope in all JSON files
- [ ] Handles rate limiting gracefully
- [ ] Shows progress bars
- [ ] Completes without errors

### Backend API
- [ ] Starts on port 8080
- [ ] Returns all projects from `/api/projects`
- [ ] Returns metrics for each project
- [ ] Handles missing projects gracefully
- [ ] CORS configured for frontend
- [ ] POST endpoint adds projects
- [ ] Triggers Python extraction
- [ ] Logs requests and errors

### Frontend Dashboard
- [ ] Loads projects from backend
- [ ] Displays overview with summary stats
- [ ] Shows communities table with all metrics
- [ ] Displays commit activity charts
- [ ] Navigates to detail view on click
- [ ] Shows project details with all sections
- [ ] Toggle between yearly and quarterly commits
- [ ] Add project modal works
- [ ] New projects appear with flash animation
- [ ] Responsive design works on mobile

### Documentation
- [ ] README has quick start guide
- [ ] Architecture doc explains design
- [ ] All setup guides are complete
- [ ] API documentation is accurate
- [ ] Contributing guide exists

### Data Structure
- [ ] All projects have complete JSON files
- [ ] State files track extraction progress
- [ ] Time scope metadata is present
- [ ] Data format matches models

---

## 📝 Usage Tips

1. **First Run:** Takes 5-10 minutes per project (cloning repos, fetching data)
2. **Subsequent Runs:** Takes 1-2 minutes (incremental updates only)
3. **Reset State:** Use `reset_commit_state.py` to force full re-extraction
4. **Single Project:** Use `extract_single_project.py` for faster testing
5. **Rate Limits:** GitHub allows 5000 requests/hour with token
6. **Cache Management:** Delete `.cache/` to start fresh (slower)
7. **Data Refresh:** Run Python script, restart backend to see updates
8. **Frontend Dev:** Use `npm run dev` for hot reload
9. **Backend Dev:** Use `mvn spring-boot:run` for auto-restart
10. **Production:** Build frontend with `npm run build`, serve with backend

---

## 🔧 Advanced Features

### Incremental Extraction

**Commit Extraction:**
- First run: Clones repo, extracts all commits
- Subsequent runs: Pulls latest, extracts only new commits
- Tracked via `last_git_sync_at` in state file

**Contributor Extraction:**
- First run: Fetches all contributors
- Subsequent runs: Only fetches new contributors
- Tracked via `known_logins` in state file

### Company Affiliation Detection

**Email Domain Extraction:**
```python
def _extract_company_from_email(self, email: str) -> Optional[str]:
    # Extract domain from email
    # Map common domains to companies
    # Return company name or None
```

**GitHub Profile Enrichment:**
- Fetch user profile from GitHub API
- Extract company field
- Cache for future use

### Quarterly Aggregation

**Commit Quarters:**
```python
quarters = defaultdict(int)
for commit in commits:
    quarter = self._get_quarter_label(commit.date)
    quarters[quarter] += 1
```

**Contributor Retention:**
```python
for quarter in quarters:
    active = set(contributors_in_quarter)
    new = active - previous_quarters_contributors
    returning = active - new
```

### Rate Limiting

**GitHub API:**
- 5000 requests/hour with authentication
- Script includes automatic rate limit checking
- Sleeps if approaching limit

**Best Practices:**
- Use caching to minimize API calls
- Run during off-peak hours
- Use incremental extraction

---

## 🎨 Design Principles

### Python Script
- **Simplicity:** Clear, readable code
- **Robustness:** Handle errors gracefully
- **Efficiency:** Use caching, avoid redundant work
- **Observability:** Progress bars, logging

### Java Backend
- **Type Safety:** Strong typing prevents errors
- **Separation of Concerns:** Controller, Service, Model layers
- **RESTful:** Standard HTTP methods and status codes
- **Configurability:** Properties file for settings

### React Frontend
- **Component-Based:** Reusable, composable components
- **State Management:** React hooks for local state
- **Responsive:** Works on desktop and mobile
- **Accessible:** Keyboard navigation, ARIA labels
- **Professional:** Clean, modern design

---

## 🔐 Security Considerations

### Current (Development)
- GitHub token in config file (not committed)
- CORS configured for localhost
- No authentication on API
- File-based data storage

### Production Recommendations
- Store token in environment variable or secrets manager
- Implement API authentication (JWT, OAuth)
- Add rate limiting per client
- Use HTTPS only
- Validate all inputs
- Sanitize file paths
- Add CSRF protection
- Implement proper logging and monitoring

---

## 📊 Metrics & Monitoring

### Python Script
- Extraction duration per project
- API calls made
- Cache hit rate
- Errors encountered

### Backend API
- Request count per endpoint
- Response times
- Error rates
- Active connections

### Frontend
- Page load time
- API call latency
- User interactions
- Error tracking

---

## 🚀 Deployment Options

### Development
```bash
# Terminal 1: Backend
cd backend && mvn spring-boot:run

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Data extraction (as needed)
cd scripts && python3 extract_github_data.py
```

### Production

**Option 1: Traditional Server**
- Python: Cron job for scheduled extraction
- Backend: JAR file with systemd service
- Frontend: Build and serve with Nginx

**Option 2: Containerized**
```dockerfile
# Python container with cron
# Java container with Spring Boot
# Nginx container for frontend
# Docker Compose for orchestration
```

**Option 3: Cloud Native**
- Python: GitHub Actions (scheduled workflow)
- Backend: Cloud Run / ECS / App Service
- Frontend: Vercel / Netlify / S3 + CloudFront
- Data: Cloud storage bucket

---

## 🎯 Success Criteria

After following all prompts, you should have:

1. ✅ Complete project structure with all directories
2. ✅ Python extraction script that works end-to-end
3. ✅ Java backend API serving all endpoints
4. ✅ React frontend with overview and detail views
5. ✅ Add project functionality working
6. ✅ Comprehensive documentation
7. ✅ Example data for 6 projects
8. ✅ Caching system operational
9. ✅ Incremental extraction working
10. ✅ Professional, responsive UI

**Test by:**
- Running data extraction for all projects
- Starting backend and accessing API
- Opening frontend and navigating
- Adding a new project via UI
- Verifying data appears correctly

---

## 📚 Additional Resources

**GitHub API:**
- https://docs.github.com/en/rest
- https://pygithub.readthedocs.io/

**Spring Boot:**
- https://spring.io/projects/spring-boot
- https://spring.io/guides

**React:**
- https://react.dev/
- https://vitejs.dev/

**Best Practices:**
- RESTful API design
- React component patterns
- Java coding standards
- Python PEP 8 style guide

---

**This regeneration guide captures the complete, production-ready OSS Dashboard system with all features, optimizations, and best practices implemented.**