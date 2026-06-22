# 🏗️ Architecture Overview

## System Design

The OSS Dashboard uses a **polyglot architecture** - combining Python and Java to leverage the strengths of each language.

```
┌─────────────────┐
│  GitHub API     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Python Data Extraction Script  │  ← Runs periodically (cron/GitHub Actions)
│  (scripts/extract_github_data.py)│
└────────┬────────────────────────┘
         │
         ▼ Writes JSON files
┌─────────────────┐
│  data/ folder   │
│  - projects.json│
│  - strimzi/     │
│  - keycloak/    │
│  - etc.         │
└────────┬────────┘
         │
         ▼ Reads JSON files
┌─────────────────────────────────┐
│  Java Spring Boot Backend API   │  ← Always running
│  (backend/)                      │
└────────┬────────────────────────┘
         │
         ▼ REST API
┌─────────────────┐
│  React Frontend │  ← Coming soon
│  (frontend/)    │
└─────────────────┘
```

## Why This Design?

### Python for Data Extraction

**Advantages:**
- **Rich GitHub API libraries**: PyGithub, requests make API integration simple
- **Rapid development**: Quick to write and modify extraction logic
- **Excellent for scripting**: Perfect for scheduled/automated tasks
- **Data processing**: Pandas, NumPy for data manipulation
- **Easy deployment**: Can run as cron job or GitHub Action

**Use Cases:**
- Extracting data from GitHub API
- Processing and transforming data
- Scheduled data refresh tasks
- One-time data migrations

### Java (Spring Boot) for Backend API

**Advantages:**
- **Production-ready**: Battle-tested for enterprise applications
- **Type safety**: Compile-time error checking prevents runtime issues
- **Performance**: Fast, efficient for serving API requests
- **Ecosystem**: Rich Spring ecosystem (Security, Data, Cloud)
- **Scalability**: Easy to scale horizontally
- **Maintainability**: Strong typing makes refactoring safer

**Use Cases:**
- Serving REST API endpoints
- Real-time data access
- Business logic and validation
- Authentication/authorization (future)
- Database integration (future)

## Data Flow

### 1. Data Extraction (Python)

```bash
cd scripts
python extract_github_data.py
```

**What happens:**
1. Reads `config.yaml` for project list and GitHub token
2. For each project:
   - Fetches metadata (stars, forks, description)
   - Fetches contributors and company affiliations
   - Fetches commit history (quarterly aggregation)
   - Fetches issues (open/closed counts, resolution time)
   - Fetches pull requests (quarterly counts)
   - Fetches releases (recent releases)
3. Writes JSON files to `data/{project-name}/` directory
4. Updates `data/projects.json` registry

**Output:**
```
data/
├── projects.json
├── strimzi/
│   ├── metadata.json
│   ├── contributors.json
│   ├── commits.json
│   ├── issues.json
│   ├── pull_requests.json
│   └── releases.json
└── [other-projects]/
```

### 2. API Service (Java)

```bash
cd backend
mvn spring-boot:run
```

**What happens:**
1. Spring Boot application starts on port 8080
2. `DataService` reads JSON files from `data/` directory
3. REST endpoints expose data through HTTP API
4. CORS configured for frontend access
5. Actuator provides health checks

**Endpoints:**
- `GET /api/projects` - List all projects
- `GET /api/projects/{id}` - Get project details
- `GET /api/projects/{id}/metrics` - Get all metrics
- `GET /api/projects/{id}/metadata` - Get metadata only
- `GET /api/projects/{id}/contributors` - Get contributors only

## Component Details

### Python Script Components

**File:** `scripts/extract_github_data.py`

```python
# Key components:
- GitHubDataExtractor class
  - authenticate(): Validates GitHub token
  - extract_all_projects(): Main orchestration
  - extract_project_data(): Per-project extraction
  - extract_metadata(): Repository info
  - extract_contributors(): Contributor stats
  - extract_commits(): Commit history
  - extract_issues(): Issue metrics
  - extract_pull_requests(): PR data
  - extract_releases(): Release history
```

**Configuration:** `scripts/config.yaml`
```yaml
github:
  token: "YOUR_TOKEN"
projects:
  - id: strimzi
    name: Strimzi
    owner: strimzi
    repo: strimzi-kafka-operator
```

### Java Backend Components

**Main Application:** `OssDashboardApplication.java`
- Spring Boot entry point
- Auto-configuration

**Controller:** `ProjectController.java`
- REST endpoint definitions
- Request/response handling
- Error handling

**Service:** `DataService.java`
- Business logic
- JSON file reading
- Data aggregation

**Models:** `model/` package
- `Project.java` - Project definition
- `ProjectMetrics.java` - Complete metrics wrapper
- `ProjectMetadata.java` - Repository metadata
- `ContributorData.java` - Contributor statistics
- `CommitData.java` - Commit history
- `IssueData.java` - Issue metrics
- `PullRequestData.java` - PR data
- `ReleaseData.java` - Release information

**Configuration:** `application.properties`
```properties
server.port=8080
app.data.directory=../data
app.cors.allowed-origins=http://localhost:3000
```

## Technology Stack

### Python Stack
- **Python 3.8+**: Core language
- **PyGithub**: GitHub API wrapper
- **requests**: HTTP client
- **PyYAML**: Configuration parsing
- **tqdm**: Progress bars

### Java Stack
- **Java 17**: Core language (LTS version)
- **Spring Boot 3.2.0**: Application framework
- **Spring Web**: REST API
- **Jackson**: JSON processing
- **Lombok**: Reduce boilerplate
- **Maven**: Build tool

## Deployment Options

### Development
```bash
# Terminal 1: Run backend
cd backend && mvn spring-boot:run

# Terminal 2: Run data extraction (as needed)
cd scripts && python extract_github_data.py
```

### Production (Future)

**Option 1: Traditional Deployment**
- Python script: Cron job on server
- Java backend: JAR file with systemd service
- Frontend: Nginx serving static files

**Option 2: Containerized**
- Python script: Docker container with cron
- Java backend: Docker container
- Frontend: Docker container
- Orchestration: Docker Compose or Kubernetes

**Option 3: Cloud Native**
- Python script: GitHub Actions (scheduled workflow)
- Java backend: Cloud Run / ECS / App Service
- Frontend: Vercel / Netlify / S3 + CloudFront
- Data storage: Cloud storage bucket

## Future Enhancements

### Short Term
- [ ] Add database for historical data tracking
- [ ] Add caching layer (Redis) for better performance
- [ ] Add API authentication
- [ ] Add rate limiting
- [ ] Add comprehensive tests

### Long Term
- [ ] Real-time data updates (WebSockets)
- [ ] Advanced analytics and trends
- [ ] Machine learning for predictions
- [ ] Multi-tenant support
- [ ] GraphQL API option

## Why Not Just Python or Just Java?

### Why Not Python-Only?
- Python web frameworks (Flask/Django) work, but:
  - Less type safety for large codebases
  - Slower performance for high-traffic APIs
  - Less mature enterprise tooling
  - Harder to scale horizontally

### Why Not Java-Only?
- Java can call GitHub API, but:
  - More verbose for scripting tasks
  - Fewer GitHub-specific libraries
  - Overkill for simple data extraction
  - Slower development for one-off scripts

### Best of Both Worlds
- **Python**: Quick scripts, data extraction, automation
- **Java**: Robust API, type safety, performance, scalability
- **Result**: Maintainable, scalable, developer-friendly

## Development Workflow

### Adding a New Project

1. **Update Python config:**
   ```yaml
   # scripts/config.yaml
   projects:
     - id: new-project
       name: New Project
       owner: org-name
       repo: repo-name
   ```

2. **Run extraction:**
   ```bash
   cd scripts
   python extract_github_data.py
   ```

3. **Backend automatically picks it up:**
   - No code changes needed
   - Restart backend to see new project

### Adding a New Metric

1. **Update Python script:**
   - Add extraction method
   - Save to new JSON file

2. **Update Java models:**
   - Create new model class
   - Add to `ProjectMetrics`

3. **Update Java service:**
   - Add method to load new data

4. **Update Java controller:**
   - Add new endpoint (optional)

## Performance Considerations

### Python Script
- **Rate limiting**: Respects GitHub API limits (5000/hour)
- **Caching**: Reuses data within same run
- **Parallel processing**: Can be added for multiple projects
- **Incremental updates**: Future enhancement

### Java Backend
- **File I/O**: Reads JSON files on demand
- **Memory**: Keeps data in memory after first read
- **Caching**: Can add Redis for better performance
- **Horizontal scaling**: Stateless, can run multiple instances

## Security Considerations

### Current
- GitHub token in config file (not committed)
- CORS configured for specific origins
- No authentication on API (development only)

### Future
- API authentication (JWT tokens)
- Rate limiting per client
- Input validation and sanitization
- HTTPS only in production
- Secrets management (Vault, AWS Secrets Manager)

---

**This architecture balances simplicity, maintainability, and scalability while using each language for what it does best.**