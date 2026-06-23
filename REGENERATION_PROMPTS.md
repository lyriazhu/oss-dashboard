# OSS Dashboard - Complete Regeneration Prompts

This document contains prompts to regenerate the entire oss-dashboard project from scratch.

## 📋 Overview

The OSS Dashboard monitors contributor activity across multiple open-source GitHub repositories.

**Components:**
1. Python Data Extraction - GitHub API data fetching
2. Java Spring Boot Backend - REST API
3. JSON Data Storage - Project metrics
4. Documentation - Setup guides

---

## Phase 1: Project Foundation

### Prompt 1.1: Initialize Project Structure

Create "oss-dashboard" project with:

scripts/ (Python data extraction)
backend/ (Java Spring Boot API)
data/ (JSON storage)
.github/ (GitHub Actions)
Create .gitignore excluding:
Python: pycache/, *.pyc, venv/, .env
Java: target/, *.class, .jar
Data: data// (keep data/projects.json)
IDE: .vscode/, .idea/, .DS_Store

Add MIT LICENSE.


### Prompt 1.2: Create Project Registry

Create data/projects.json with 6 projects:

Strimzi (strimzi/strimzi-kafka-operator) - CNCF
Apache Camel (apache/camel) - ASF
Apache ActiveMQ (apache/activemq) - ASF
Keycloak (keycloak/keycloak) - CNCF
Apicurio (Apicurio/apicurio-studio) - Independent
3scale (3scale/3scale-operator) - Red Hat
Fields: id, name, github_url, owner, repo, foundation, website, enabled
Add: last_updated, version "1.0.0"


---

## Phase 2: Python Data Extraction

### Prompt 2.1: Create Extraction Script

Create scripts/extract_github_data.py with GitHubDataExtractor class.

Methods:

extract_project_metadata(): stars, forks, description, language, topics
extract_contributors(): with company affiliations
extract_commits(): quarterly counts (8 quarters)
extract_issues(): open/closed, avg resolution time
extract_pull_requests(): quarterly counts
extract_releases(): last 20 releases
Features:

PyGithub library
Read config.yaml
tqdm progress bars
Rate limiting
Save to data/{project-name}/{type}.json
Emoji console output
Token validation
Use type hints, docstrings, PEP 8.


### Prompt 2.2: Create Requirements

Create scripts/requirements.txt:
PyGithub>=2.1.1
PyYAML>=6.0
tqdm>=4.65.0
python-dateutil>=2.8.2


### Prompt 2.3: Create Config Template

Create scripts/config.yaml.example:

GitHub token placeholder with instructions
All 6 projects (name, github_url, owner, repo, foundation, website)
Extraction settings: quarters_back: 8, rate_limit: 5000, max_retries: 3 Include comments.

---

## Phase 3: Java Spring Boot Backend

### Prompt 3.1: Create Maven POM

Create backend/pom.xml:

Spring Boot 3.2.0 parent
Group: com.ossdashboard
Artifact: oss-dashboard-backend
Version: 1.0.0
Java 17
Dependencies: spring-boot-starter-web, devtools, lombok, jackson, actuator, validation, test
Plugin: spring-boot-maven-plugin


### Prompt 3.2: Create Application Properties

Create backend/src/main/resources/application.properties:
spring.application.name=oss-dashboard-backend
server.port=8080
app.data.directory=../data
app.cors.allowed-origins=http://localhost:3000,http://localhost:5173
management.endpoints.web.exposure.include=health,info,metrics
logging.level.com.ossdashboard=DEBUG
spring.jackson.serialization.indent-output=true


### Prompt 3.3: Create Main Application

Create backend/src/main/java/com/ossdashboard/OssDashboardApplication.java:
Standard Spring Boot @SpringBootApplication with main method.


### Prompt 3.4: Create Data Models

Create 8 models in backend/src/main/java/com/ossdashboard/model/:

Project.java - id, name, githubUrl, owner, repo, foundation, website, enabled
ProjectMetadata.java - name, description, stars, forks, language, topics
ContributorData.java - total_contributors, contributors, companies
CommitData.java - total_commits, quarters
IssueData.java - total_open, total_closed, avg_resolution_time_days
PullRequestData.java - total_prs, quarters
ReleaseData.java - total_releases, recent_releases
ProjectMetrics.java - aggregates all above
Use Lombok @Data, @JsonProperty for snake_case
Nested classes: Contributor, QuarterInfo, Release


### Prompt 3.5: Create Data Service

Create backend/src/main/java/com/ossdashboard/service/DataService.java:
@Service with methods:

getAllProjects(): List<Project>
getProjectById(String): Project
getProjectMetrics(String): ProjectMetrics
getProjectMetadata(String): ProjectMetadata
getProjectContributors(String): ContributorData
loadJsonFile<T>(): helper
Use @Value for data directory, Jackson ObjectMapper, @Slf4j
Error handling and null checks.


### Prompt 3.6: Create REST Controller

Create backend/src/main/java/com/ossdashboard/controller/ProjectController.java:
@RestController @RequestMapping("/api/projects")

Endpoints:

GET /api/projects
GET /api/projects/{id}
GET /api/projects/{id}/metrics
GET /api/projects/{id}/metadata
GET /api/projects/{id}/contributors
Return ResponseEntity, handle errors (404, 500)
Use @RequiredArgsConstructor, @Slf4j


### Prompt 3.7: Create CORS Config

Create backend/src/main/java/com/ossdashboard/config/CorsConfig.java:
@Configuration implementing WebMvcConfigurer
Override addCorsMappings
Allow origins from properties, methods: GET/POST/PUT/DELETE


---

## Phase 4: Documentation

### Prompt 4.1: Create Main README

Create README.md:

Project overview
Quick start (token, install, run)
Project structure
6 tracked projects
Extracted metrics
Troubleshooting
Next steps

### Prompt 4.2: Create Quick Start

Create QUICK_START.md:
Step-by-step with checkboxes:

Open in VS Code
Get GitHub token
Add to config.yaml
Install Python deps
Run extraction
Check data/
Start backend
Test endpoints
Include time estimates and common errors.


### Prompt 4.3: Create Setup Guide

Create SETUP_GUIDE.md:

Why GitHub token needed
Install Python/Java
Data structure explanation
Configure projects
Run extraction
Rate limits
FAQ

### Prompt 4.4: Create Token Guide

Create HOW_TO_GET_GITHUB_TOKEN.md:

Navigate to GitHub settings
Generate token (classic)
Select scopes: public_repo, read:org, read:user
Copy token
Add to config.yaml
Security best practices

### Prompt 4.5: Create Backend README

Create backend/README.md:

Prerequisites (Java 17, Maven)
Running: mvn spring-boot:run
API endpoints with examples
Configuration
Development tips
Troubleshooting

### Prompt 4.6: Create Java Setup Guide

Create backend/SETUP_JAVA_MAVEN.md:

Install Java 17 (macOS/Windows/Linux)
Install Maven
Verify: java -version, mvn -version
IDE setup (IntelliJ, VS Code, Eclipse)
Troubleshooting

### Prompt 4.7: Create Contributing Guide

Create CONTRIBUTING.md:

Getting started (fork, clone, branch)
Code style (PEP 8, Google Java Style)
Testing
PR process
Code of conduct reference

### Prompt 4.8: Create Contributor Quickstart

Create CONTRIBUTOR_QUICKSTART.md:

5-minute setup
Making changes (Python/Java/docs)
Testing changes
Submitting PRs Keep concise and actionable.

---

## Phase 5: Additional Files

### Prompt 5.1: Create GitHub Setup Guide

Create GITHUB_SETUP.md:

GitHub App creation (future)
Webhooks setup (future)
GitHub Actions (future)
Security best practices

### Prompt 5.2: Create Push Guide

Create PUSH_TO_GITHUB.md:

Initial setup (git init, add remote)
First push
Ongoing updates
Best practices
Troubleshooting

---

## 🎯 Validation Checklist

### Python Script
- [ ] Runs without errors
- [ ] Extracts all 6 projects
- [ ] Creates JSON files
- [ ] Shows progress bars
- [ ] Handles rate limiting

### Backend API
- [ ] Compiles: mvn clean package
- [ ] Starts: mvn spring-boot:run
- [ ] All 5 endpoints work
- [ ] Returns proper JSON
- [ ] Handles missing data

### Documentation
- [ ] All markdown files present
- [ ] Links work
- [ ] Instructions clear
- [ ] Examples accurate

### Data Structure
- [ ] projects.json exists
- [ ] Each project has 6 JSON files
- [ ] JSON valid and formatted

---

## 🚀 Usage Tips

1. Start with Phase 1 - foundation first
2. Test incrementally - don't wait
3. Use validation checklist
4. Customize for your AI assistant
5. Document changes

---

## 📝 Notes

- Prompts designed for AI coding assistants
- Adjust detail level as needed
- Can combine prompts for efficiency
- Test each component before next
- Keep original as reference

---

**OSS Dashboard Project**
**Version: 1.0.0**
**Last Updated: 2026-06-23**