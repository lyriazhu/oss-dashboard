# OSS Dashboard - Complete Regeneration Prompts

This document contains comprehensive prompts to regenerate the entire oss-dashboard project from scratch, capturing all architectural nuances and implementation details.

## 📋 Overview

The OSS Dashboard is an enterprise-grade system that monitors contributor activity and project health metrics across multiple open-source GitHub repositories using a polyglot architecture.

**Architecture:**
- **Python** - Data extraction from GitHub API (scripting, scheduled tasks)
- **Java Spring Boot** - Production-ready REST API backend
- **React + Vite** - Modern frontend dashboard with IBM Carbon Design System
- **JSON** - File-based data storage with caching and incremental updates

**Key Features:**
- Dynamic project addition via REST API
- Intelligent caching (git mirrors, user profiles, per-project state)
- Incremental data extraction with checkpoints
- Time-scoped metrics with explicit metadata
- Real-time dashboard with interactive visualizations

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
      "foundation": "Apache Software Foundation",
      "website": "https://camel.apache.org",
      "enabled": true
    },
    {
      "id": "apache-activemq",
      "name": "Apache ActiveMQ",
      "github_url": "https://github.com/apache/activemq",
      "owner": "apache",
      "repo": "activemq",
      "foundation": "Apache Software Foundation",
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
  ],
  "last_updated": "2026-06-24T00:00:00Z",
  "version": "1.0.0"
}
```

Also create `projectdata/projects.json` with identical content (dual directory support).

---

## Phase 2: Python Data Extraction System

### Prompt 2.1: Create Main Extraction Script

Create `scripts/extract_github_data.py` with `GitHubDataExtractor` class.

**Key Features:**
- Intelligent caching system (git mirrors, user profiles, per-project state)
- Incremental extraction with checkpoints
- Time-scoped metrics with explicit metadata
- Rate limiting and progress tracking
- Company affiliation detection
- Quarterly aggregation (configurable quarters_back)

**Class Structure:**
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
    def _get_or_clone_repo(self, owner: str, repo: str) -> Path
    def _sync_git_repo(self, repo_path: Path)
    def _get_user_profile(self, login: str) -> Dict[str, Optional[str]]
    def authenticate(self) -> bool
    def extract_project_metadata(self, project: Dict) -> Dict
    def extract_contributors(self, project: Dict, state: Dict) -> Dict
    def extract_commits(self, project: Dict, state: Dict) -> Dict
    def extract_issues(self, project: Dict) -> Dict
    def extract_pull_requests(self, project: Dict) -> Dict
    def extract_releases(self, project: Dict) -> Dict
    def extract_project_data(self, project: Dict)
    def extract_all_projects(self)
```

**Critical Implementation Details:**

1. **Caching System:**
   - Git mirrors in `.cache/repos/{owner}/{repo}/`
   - User profiles in `.cache/user_profiles.json`
   - Per-project state in `data/{project}/_state.json`

2. **State Management:**
   ```python
   state = {
       "contributors": {
           "known_logins": [],
           "last_extracted_at": "ISO-8601-timestamp"
       },
       "commits": {
           "last_git_sync_at": "ISO-8601-timestamp"
       }
   }
   ```

3. **Time Scope Metadata:**
   All JSON outputs must include:
   ```python
   {
       "time_scope": {
           "type": "all-time" | "recent-window",
           "description": "Detailed explanation",
           "window_quarters": 8  # if recent-window
       }
   }
   ```

4. **Company Detection:**
   - Extract from GitHub user profile `company` field
   - Clean and normalize company names
   - Track company diversity metrics

5. **Quarterly Aggregation:**
   - Configurable `quarters_back` (default: 8)
   - Calculate quarter boundaries dynamically
   - Aggregate commits, PRs, contributors per quarter

**Use:**
- PyGithub for GitHub API
- subprocess for git operations
- tqdm for progress bars
- Type hints throughout
- Comprehensive docstrings
- PEP 8 style
- Emoji console output (✅, 📊, ⚠️, ❌)

### Prompt 2.2: Create Requirements File

Create `scripts/requirements.txt`:
```
PyGithub>=2.1.1
PyYAML>=6.0
tqdm>=4.65.0
python-dateutil>=2.8.2
```

### Prompt 2.3: Create Configuration Template

Create `scripts/config.yaml.example`:

```yaml
# GitHub API Configuration
github:
  # Get your token from: https://github.com/settings/tokens
  # Required scopes: public_repo, read:org, read:user
  token: "YOUR_GITHUB_TOKEN_HERE"

# Data Extraction Settings
extraction:
  quarters_back: 8        # Number of quarters to analyze
  rate_limit: 5000        # GitHub API rate limit
  max_retries: 3          # Retry failed requests
  cache_enabled: true     # Use git mirrors and profile cache
  incremental: true       # Use per-project checkpoints

# Projects to Track
projects:
  - id: strimzi
    name: Strimzi
    github_url: https://github.com/strimzi/strimzi-kafka-operator
    owner: strimzi
    repo: strimzi-kafka-operator
    foundation: CNCF
    website: https://strimzi.io
    enabled: true

  - id: apache-camel
    name: Apache Camel
    github_url: https://github.com/apache/camel
    owner: apache
    repo: camel
    foundation: Apache Software Foundation
    website: https://camel.apache.org
    enabled: true

  - id: apache-activemq
    name: Apache ActiveMQ
    github_url: https://github.com/apache/activemq
    owner: apache
    repo: activemq
    foundation: Apache Software Foundation
    website: https://activemq.apache.org
    enabled: true

  - id: keycloak
    name: Keycloak
    github_url: https://github.com/keycloak/keycloak
    owner: keycloak
    repo: keycloak
    foundation: CNCF
    website: https://www.keycloak.org
    enabled: true

  - id: apicurio
    name: Apicurio
    github_url: https://github.com/Apicurio/apicurio-studio
    owner: Apicurio
    repo: apicurio-studio
    foundation: Independent
    website: https://www.apicur.io
    enabled: true

  - id: 3scale
    name: 3scale
    github_url: https://github.com/3scale/3scale-operator
    owner: 3scale
    repo: 3scale-operator
    foundation: Red Hat
    website: https://www.3scale.net
    enabled: true
```

### Prompt 2.4: Create Single Project Extraction Script

Create `scripts/extract_single_project.py` for extracting one project at a time:

```python
#!/usr/bin/env python3
"""Extract data for a single project by ID"""
import sys
from extract_github_data import GitHubDataExtractor

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 extract_single_project.py <project-id>")
        sys.exit(1)
    
    project_id = sys.argv[1]
    extractor = GitHubDataExtractor()
    
    # Find project in config
    project = next((p for p in extractor.config['projects'] if p['id'] == project_id), None)
    if not project:
        print(f"❌ Project '{project_id}' not found in config")
        sys.exit(1)
    
    print(f"📊 Extracting data for {project['name']}...")
    extractor.extract_project_data(project)
    print(f"✅ Extraction complete for {project['name']}")
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
# Application
spring.application.name=oss-dashboard-backend
server.port=8080

# Data Directory (supports both data/ and projectdata/)
app.data.directory=../data
app.data.directory.fallback=../projectdata

# CORS Configuration
app.cors.allowed-origins=http://localhost:3000,http://localhost:5173,http://localhost:5174

# Actuator
management.endpoints.web.exposure.include=health,info,metrics
management.endpoint.health.show-details=always

# Logging
logging.level.com.ossdashboard=DEBUG
logging.level.org.springframework.web=INFO

# Jackson JSON
spring.jackson.serialization.indent-output=true
spring.jackson.serialization.write-dates-as-timestamps=false
spring.jackson.default-property-inclusion=non_null
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

Create 10 model classes in `backend/src/main/java/com/ossdashboard/model/`:

**1. Project.java** - Project definition
```java
@JsonIgnoreProperties(ignoreUnknown = true)
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

**2. ProjectMetadata.java** - Repository metadata with time_scope
```java
public class ProjectMetadata {
    private String name;
    private String description;
    private Integer stars;
    private Integer forks;
    private String language;
    private List<String> topics;
    @JsonProperty("created_at")
    private String createdAt;
    @JsonProperty("updated_at")
    private String updatedAt;
    @JsonProperty("time_scope")
    private TimeScope timeScope;
    // Nested TimeScope class
}
```

**3. ContributorData.java** - Contributor statistics with time_scope
```java
public class ContributorData {
    @JsonProperty("total_contributors")
    private Integer totalContributors;
    private List<Contributor> contributors;
    private List<Company> companies;
    @JsonProperty("retention_by_quarter")
    private List<RetentionQuarter> retentionByQuarter;
    @JsonProperty("time_scope")
    private TimeScope timeScope;
    
    // Nested classes: Contributor, Company, RetentionQuarter
}
```

**4. CommitData.java** - Commit history with time_scope
```java
public class CommitData {
    @JsonProperty("total_commits")
    private Integer totalCommits;
    private List<QuarterInfo> quarters;
    private List<Committer> committers;
    @JsonProperty("time_scope")
    private TimeScope timeScope;
    
    // Nested classes: QuarterInfo, Committer
}
```

**5. IssueData.java** - Issue metrics
```java
public class IssueData {
    @JsonProperty("total_open")
    private Integer totalOpen;
    @JsonProperty("total_closed")
    private Integer totalClosed;
    @JsonProperty("avg_resolution_time_days")
    private Double avgResolutionTimeDays;
    private List<IssueCommenter> commenters;
    @JsonProperty("time_scope")
    private TimeScope timeScope;
}
```

**6. PullRequestData.java** - PR data
```java
public class PullRequestData {
    @JsonProperty("total_prs")
    private Integer totalPrs;
    private List<QuarterInfo> quarters;
    @JsonProperty("time_scope")
    private TimeScope timeScope;
}
```

**7. ReleaseData.java** - Release information
```java
public class ReleaseData {
    @JsonProperty("total_releases")
    private Integer totalReleases;
    @JsonProperty("recent_releases")
    private List<Release> recentReleases;
    @JsonProperty("time_scope")
    private TimeScope timeScope;
    
    // Nested Release class
}
```

**8. ProjectMetrics.java** - Aggregates all metrics
```java
public class ProjectMetrics {
    private ProjectMetadata metadata;
    private ContributorData contributors;
    private CommitData commits;
    private IssueData issues;
    @JsonProperty("pull_requests")
    private PullRequestData pullRequests;
    private ReleaseData releases;
}
```

**9. AddProjectRequest.java** - Request for adding projects
```java
public class AddProjectRequest {
    @JsonProperty("github_url")
    private String githubUrl;
    private String foundation;
    private String website;
    // Getters and setters
}
```

**10. AddProjectResponse.java** - Response for adding projects
```java
public class AddProjectResponse {
    private Boolean success;
    private String message;
    private Project project;
    private String extractionStatus;
    // Constructor, getters, setters
}
```

**Important:** Use `@JsonProperty` for snake_case JSON fields, `@JsonIgnoreProperties(ignoreUnknown = true)` for flexibility.

### Prompt 3.5: Create Data Service

Create `backend/src/main/java/com/ossdashboard/service/DataService.java`:

**Key Methods:**
- `getAllProjects()` - Load from projects.json (try data/, fallback to projectdata/)
- `getProjectById(String id)` - Find specific project
- `getProjectMetrics(String id)` - Load all 6 JSON files and aggregate
- `getProjectMetadata(String id)` - Load metadata.json
- `getProjectContributors(String id)` - Load contributors.json
- `addProject(AddProjectRequest)` - Add to projects.json
- `parseGithubUrl(String url)` - Extract owner/repo from GitHub URL
- `triggerDataExtraction(String projectId)` - Execute Python script
- `loadJsonFile<T>(Path, Class<T>)` - Generic JSON loader

**Implementation Details:**
- Use `@Value("${app.data.directory}")` for data path
- Support dual directory structure (data/ and projectdata/)
- Jackson ObjectMapper for JSON parsing
- Comprehensive error handling
- Logging with SLF4J
- Validate project existence before operations

### Prompt 3.6: Create REST Controller

Create `backend/src/main/java/com/ossdashboard/controller/ProjectController.java`:

**Endpoints:**
1. `GET /api/projects` - List all projects
2. `GET /api/projects/{id}` - Get specific project
3. `GET /api/projects/{id}/metrics` - Get complete metrics
4. `GET /api/projects/{id}/metadata` - Get metadata only
5. `GET /api/projects/{id}/contributors` - Get contributors only
6. `POST /api/projects` - Add new project dynamically

**Features:**
- Return `ResponseEntity` with proper HTTP status codes
- Handle 404 for missing projects
- Handle 500 for server errors
- Validate input for POST endpoint
- Log all requests
- Use constructor injection

### Prompt 3.7: Create CORS Configuration

Create `backend/src/main/java/com/ossdashboard/config/CorsConfig.java`:

```java
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
- Prerequisites (Java 17, Maven 3.6+)
- Quick start commands
- API endpoint documentation with curl examples
- Configuration options
- Development tips
- Troubleshooting section

---

## Phase 4: React Frontend Dashboard

### Prompt 4.1: Initialize Frontend Project

Create `frontend/` with Vite + React:

```bash
npm create vite@latest frontend -- --template react
cd frontend
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
        changeOrigin: true
      }
    }
  }
})
```

### Prompt 4.4: Create API Client

Create `frontend/src/api.js`:

**Functions:**
- `fetchProjects()` - GET /api/projects
- `fetchProjectMetrics(id)` - GET /api/projects/{id}/metrics
- `addProject(githubUrl, foundation, website)` - POST /api/projects
- `transformProjectData(project, metrics)` - Transform backend data for UI

**Features:**
- Async/await with error handling
- Transform snake_case to camelCase
- Handle time_scope metadata
- Retry logic for failed requests

### Prompt 4.5: Create Main App Component

Create `frontend/src/App.jsx`:

**State Management:**
- `data` - Project data object
- `order` - Project display order
- `loading` - Loading state
- `error` - Error messages
- `view` - 'overview' | 'detail'
- `selectedKey` - Currently selected project
- `navCollapsed` - Side navigation state
- `modalOpen` - Add project modal state
- `flashKey` - Highlight newly added project

**Features:**
- Load projects on mount
- Handle view switching
- Manage modal state
- Flash animation for new projects

### Prompt 4.6: Create UI Components

Create 6 components in `frontend/src/components/`:

**1. UIShellHeader.jsx** - Top navigation bar
- Logo and title
- Add project button
- Navigation toggle

**2. SideNav.jsx** - Project navigation sidebar
- List all projects
- Highlight selected project
- Collapsible design
- Flash animation for new projects

**3. Overview.jsx** - Dashboard overview page
- Grid of project cards
- Key metrics display
- Click to view details

**4. Detail.jsx** - Project detail page
- Comprehensive metrics
- Charts and visualizations
- Time scope indicators
- Back to overview button

**5. AddProjectModal.jsx** - Add project dialog
- GitHub URL input with validation
- Optional foundation and website fields
- Submit and cancel buttons
- Success/error feedback

**6. ui.jsx** - Reusable UI components
- Card, Button, Input, Modal, etc.
- Consistent styling
- Accessibility features

### Prompt 4.7: Create Styles

Create `frontend/src/index.css`:
- CSS reset
- CSS variables for theming
- Responsive grid layouts
- Animation keyframes
- Component-specific styles

### Prompt 4.8: Create Frontend README

Create `frontend/README.md` with:
- Technology stack (React, Vite)
- Development setup
- Available scripts
- Project structure
- Component documentation
- Styling guidelines

---

## Phase 5: Comprehensive Documentation

### Prompt 5.1: Create Main README

Create `README.md` with:
- Project overview and architecture diagram
- Quick start (5-minute setup)
- Project structure
- Tracked projects list
- Extracted metrics with time scope notes
- Technology stack
- API documentation link
- Troubleshooting
- Development workflow
- Next steps

### Prompt 5.2: Create Architecture Documentation

Create `ARCHITECTURE.md` with:
- System design diagram
- Why polyglot architecture?
- Data flow explanation
- Component details (Python, Java, React)
- Technology stack rationale
- Deployment options
- Performance considerations
- Security considerations
- Future enhancements

### Prompt 5.3: Create Quick Start Guide

Create `QUICK_START.md` with:
- Step-by-step checklist format
- Time estimates for each step
- GitHub token setup
- Python dependencies installation
- Data extraction
- Backend startup
- Frontend startup
- Verification steps
- Common issues and solutions

### Prompt 5.4: Create Setup Guide

Create `SETUP_GUIDE.md` with:
- Detailed prerequisites
- Environment setup
- Configuration options
- Data structure explanation
- Running extraction
- Rate limits and best practices
- FAQ section

### Prompt 5.5: Create GitHub Token Guide

Create `HOW_TO_GET_GITHUB_TOKEN.md` with:
- Step-by-step instructions
- Required scopes explanation
- Security best practices
- Token rotation guidelines
- Troubleshooting token issues

### Prompt 5.6: Create Java/Maven Setup Guide

Create `backend/SETUP_JAVA_MAVEN.md` with:
- Install Java 17 (macOS, Windows, Linux)
- Install Maven 3.6+
- Verify installations
- IDE setup (IntelliJ, VS Code, Eclipse)
- Common issues and solutions

### Prompt 5.7: Create Add Project API Documentation

Create `ADD_PROJECT_API.md` with:
- API endpoint specification
- Request/response examples
- Supported GitHub URL formats
- Usage examples (curl, JavaScript, Python)
- Data extraction process timeline
- Error handling
- Best practices
- Security considerations
- Integration with frontend
- Troubleshooting

### Prompt 5.8: Create Contributing Guide

Create `CONTRIBUTING.md` with:
- Getting started (fork, clone, branch)
- Code style guidelines (PEP 8, Google Java Style)
- Testing requirements
- Pull request process
- Code review guidelines
- Code of conduct reference

### Prompt 5.9: Create Contributor Quickstart

Create `CONTRIBUTOR_QUICKSTART.md` with:
- 5-minute contributor setup
- Making changes (Python/Java/React/docs)
- Testing changes locally
- Submitting pull requests
- Getting help

### Prompt 5.10: Create Test Documentation

Create `TEST_ADD_PROJECT.md` with:
- Manual testing steps for add project API
- Automated test examples
- Expected outcomes
- Troubleshooting test failures

### Prompt 5.11: Create GitHub Setup Guide

Create `GITHUB_SETUP.md` with:
- GitHub App creation (future)
- Webhooks setup (future)
- GitHub Actions workflows (future)
- Security best practices

### Prompt 5.12: Create Push to GitHub Guide

Create `PUSH_TO_GITHUB.md` with:
- Initial repository setup
- First push commands
- Ongoing updates workflow
- Branch management
- Best practices

---

## Phase 6: Data Structure & Examples

### Prompt 6.1: Create Example Data Files

For each project, create 7 JSON files in `data/{project-id}/`:

**1. _state.json** - Extraction state
```json
{
  "contributors": {
    "known_logins": ["user1", "user2"],
    "last_extracted_at": "2026-06-24T10:00:00Z"
  },
  "commits": {
    "last_git_sync_at": "2026-06-24T10:00:00Z"
  }
}
```

**2. metadata.json** - Repository metadata
```json
{
  "name": "Project Name",
  "description": "Project description",
  "stars": 5000,
  "forks": 1000,
  "language": "Java",
  "topics": ["kafka", "kubernetes"],
  "created_at": "2017-01-01T00:00:00Z",
  "updated_at": "2026-06-24T00:00:00Z",
  "time_scope": {
    "type": "all-time",
    "description": "Repository metadata is all-time cumulative"
  }
}
```

**3. contributors.json** - Contributor data with time_scope
```json
{
  "total_contributors": 250,
  "contributors": [
    {
      "login": "user1",
      "contributions": 500,
      "company": "Red Hat",
      "location": "USA"
    }
  ],
  "companies": [
    {
      "name": "Red Hat",
      "contributor_count": 50,
      "contribution_count": 5000
    }
  ],
  "retention_by_quarter": [],
  "time_scope": {
    "type": "mixed",
    "description": "total_contributors is all-time; retention_by_quarter is recent 8 quarters"
  }
}
```

**4. commits.json** - Commit history with time_scope
```json
{
  "total_commits": 10000,
  "quarters": [
    {
      "quarter": "Q1 2026",
      "start_date": "2026-01-01",
      "end_date": "2026-03-31",
      "commit_count": 500,
      "contributor_count": 50
    }
  ],
  "committers": [],
  "time_scope": {
    "type": "recent-window",
    "description": "Commit data based on recent 8 quarters of git history",
    "window_quarters": 8
  }
}
```

**5. issues.json** - Issue metrics
**6. pull_requests.json** - PR data
**7. releases.json** - Release information

All with appropriate time_scope metadata.

---

## 🎯 Critical Implementation Details

### Caching Strategy

**Git Mirrors:**
- Clone once to `.cache/repos/{owner}/{repo}/`
- Sync with `git fetch --all` on subsequent runs
- Dramatically speeds up commit analysis

**User Profiles:**
- Cache in `.cache/user_profiles.json`
- Avoid redundant GitHub API calls
- Include company, location, name, email

**Per-Project State:**
- Track extraction progress in `_state.json`
- Enable incremental updates
- Store known contributor logins
- Track last sync timestamps

### Time Scope Metadata

**Critical:** Every JSON file must include explicit time_scope:

```json
{
  "time_scope": {
    "type": "all-time" | "recent-window" | "mixed",
    "description": "Human-readable explanation",
    "window_quarters": 8  // if recent-window
  }
}
```

This allows the frontend to display accurate metric context.

### Dynamic Project Addition

**Flow:**
1. User submits GitHub URL via frontend modal
2. POST /api/projects validates and parses URL
3. Backend adds project to projects.json
4. Backend triggers Python extraction script
5. Frontend polls for data availability
6. New project appears in dashboard

### Dual Directory Support

Support both `data/` and `projectdata/` directories:
- Backend checks data/ first, falls back to projectdata/
- Python script writes to data/ by default
- Allows flexibility in deployment

### Error Handling

**Python:**
- Graceful degradation on API failures
- Retry logic with exponential backoff
- Clear error messages with emoji
- Continue processing other projects on failure

**Java:**
- Return proper HTTP status codes
- Detailed error messages in responses
- Log all errors with context
- Handle missing files gracefully

**React:**
- Display user-friendly error messages
- Retry failed requests
- Loading states for async operations
- Fallback UI for missing data

---

## 🚀 Validation Checklist

### Python Script
- [ ] Authenticates with GitHub token
- [ ] Extracts all 6 projects successfully
- [ ] Creates all 7 JSON files per project
- [ ] Shows progress bars with tqdm
- [ ] Handles rate limiting gracefully
- [ ] Uses cached git mirrors
- [ ] Uses cached user profiles
- [ ] Saves per-project state
- [ ] Includes time_scope in all outputs
- [ ] Completes in reasonable time (faster on reruns)

### Backend API
- [ ] Compiles: `mvn clean package`
- [ ] Starts: `mvn spring-boot:run`
- [ ] All 6 endpoints respond correctly
- [ ] Returns proper JSON with snake_case
- [ ] Handles missing projects (404)
- [ ] Handles server errors (500)
- [ ] CORS configured correctly
- [ ] Supports dual directory structure
- [ ] POST /api/projects works
- [ ] Triggers Python extraction

### Frontend Dashboard
- [ ] Starts: `npm run dev`
- [ ] Loads projects from backend
- [ ] Displays overview page
- [ ] Shows project details
- [ ] Add project modal works
- [ ] Validates GitHub URLs
- [ ] Displays time scope indicators
- [ ] Responsive design
- [ ] Error handling works
- [ ] Flash animation for new projects

### Documentation
- [ ] All markdown files present
- [ ] Links work correctly
- [ ] Instructions are clear
- [ ] Examples are accurate
- [ ] Code snippets are correct
- [ ] Architecture diagrams included

### Data Structure
- [ ] projects.json exists in both directories
- [ ] Each project has 7 JSON files
- [ ] JSON is valid and formatted
- [ ] time_scope metadata present
- [ ] _state.json tracks progress

---

## 📝 Usage Tips

1. **Start with Phase 1** - Foundation is critical
2. **Test incrementally** - Don't wait until the end
3. **Use validation checklist** - Verify each component
4. **Customize for your AI** - Adjust detail level as needed
5. **Document changes** - Keep regeneration prompts updated
6. **Cache is key** - Implement caching early for performance
7. **Time scope matters** - Always include explicit metadata
8. **Error handling** - Build it in from the start
9. **Dual directory** - Support both data/ and projectdata/
10. **Dynamic addition** - Test the add project API thoroughly

---

## 🔧 Advanced Features

### Incremental Extraction
- Use per-project state to track progress
- Only fetch new data since last run
- Dramatically reduces API calls
- Faster iteration during development

### Company Affiliation Detection
- Extract from GitHub user profiles
- Clean and normalize company names
- Track company diversity metrics
- Identify corporate vs. independent contributors

### Quarterly Aggregation
- Configurable time windows
- Dynamic quarter boundary calculation
- Aggregate commits, PRs, contributors
- Track trends over time

### Rate Limiting
- Respect GitHub API limits (5000/hour)
- Automatic backoff on rate limit
- Display remaining quota
- Prioritize critical data

---

## 🎨 Design Principles

### Python Script
- **Idempotent**: Safe to run multiple times
- **Incremental**: Use caching and state
- **Resilient**: Handle failures gracefully
- **Observable**: Clear progress and logging
- **Configurable**: YAML-based configuration

### Java Backend
- **Stateless**: No session state
- **RESTful**: Standard HTTP methods
- **Type-safe**: Compile-time checking
- **Scalable**: Horizontal scaling ready
- **Observable**: Actuator endpoints

### React Frontend
- **Responsive**: Mobile-first design
- **Interactive**: Real-time updates
- **Accessible**: WCAG compliance
- **Performant**: Lazy loading, code splitting
- **User-friendly**: Clear feedback and errors

---

## 🔐 Security Considerations

### Current (Development)
- GitHub token in config file (not committed)
- CORS configured for localhost
- No authentication on API
- Public data only

### Production Recommendations
- Use environment variables for secrets
- Implement API authentication (JWT)
- Add rate limiting per client
- Input validation and sanitization
- HTTPS only
- Secrets management (Vault, AWS Secrets Manager)
- Audit logging
- Regular security updates

---

## 📊 Metrics & Monitoring

### Python Script
- Execution time per project
- API calls made
- Cache hit rate
- Errors encountered
- Data freshness

### Backend API
- Request latency
- Error rates
- Cache hit rate
- Memory usage
- Active connections

### Frontend
- Page load time
- API response time
- Error rates
- User interactions
- Browser compatibility

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

**Option 1: Traditional**
- Python: Cron job on server
- Java: JAR with systemd service
- React: Nginx serving static files

**Option 2: Containerized**
- Python: Docker + cron
- Java: Docker container
- React: Docker container
- Orchestration: Docker Compose or Kubernetes

**Option 3: Cloud Native**
- Python: GitHub Actions (scheduled)
- Java: Cloud Run / ECS / App Service
- React: Vercel / Netlify / S3 + CloudFront
- Data: Cloud storage bucket

---

## 🎯 Success Criteria

A successful regeneration should produce:

1. **Functional Python script** that extracts data from GitHub
2. **Working Java backend** that serves REST API
3. **Interactive React frontend** that displays data
4. **Comprehensive documentation** for all components
5. **Proper caching** for performance
6. **Time scope metadata** in all outputs
7. **Dynamic project addition** via API
8. **Error handling** throughout
9. **Dual directory support** for flexibility
10. **Production-ready architecture** for scaling

---

## 📚 Additional Resources

- **GitHub API Docs**: https://docs.github.com/en/rest
- **Spring Boot Docs**: https://spring.io/projects/spring-boot
- **React Docs**: https://react.dev
- **Vite Docs**: https://vitejs.dev
- **PyGithub Docs**: https://pygithub.readthedocs.io

---

**OSS Dashboard Project**
**Version: 2.0.0**
**Last Updated: 2026-06-24**
**Architecture: Polyglot (Python + Java + React)**
**Made with Bob** ✨