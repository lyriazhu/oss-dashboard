# OSS Dashboard Backend

Spring Boot REST API for the Open Source Dashboard project.

## 🚀 Quick Start

### Prerequisites

- Java 17 or higher
- Maven 3.6+
- Data files in `../data/` directory (run the Python extraction script first)

If you have not generated data yet:

```bash
cd ../scripts
python3 -m pip install -r requirements.txt
python3 extract_github_data.py
cd ../backend
```

### Running the Application

```bash
# From the backend directory
mvn spring-boot:run
```

The API will start on `http://localhost:8080`

### Building the Application

```bash
# Build JAR file
mvn clean package

# Run the JAR
java -jar target/oss-dashboard-backend-1.0.0.jar
```

## 📡 API Endpoints

### Projects

- **GET** `/api/projects` - Get all projects
  - Returns: Array of project objects with basic info
  
- **POST** `/api/projects` - Add a new project 🆕
  - Request body: `{ "github_url": "https://github.com/owner/repo", "foundation": "Optional", "website": "Optional" }`
  - Returns: Project object with extraction status
  - Automatically triggers data extraction
  - See [ADD_PROJECT_API.md](../ADD_PROJECT_API.md) for details
  
- **GET** `/api/projects/{projectId}` - Get a specific project
  - Returns: Single project object
  - Example: `/api/projects/strimzi`
  
- **GET** `/api/projects/{projectId}/metrics` - Get complete metrics for a project
  - Returns: All metrics (metadata, contributors, commits, issues, PRs, releases)
  - Example: `/api/projects/strimzi/metrics`
  
- **GET** `/api/projects/{projectId}/metadata` - Get metadata (stars, forks, etc.)
  - Returns: Repository metadata only
  - Example: `/api/projects/keycloak/metadata`
  
- **GET** `/api/projects/{projectId}/contributors` - Get contributor data
  - Returns: Contributor statistics, company affiliations, diversity, and retention metadata
  - Example: `/api/projects/apache-camel/contributors`

### Health Check

- **GET** `/actuator/health` - Application health status
- **GET** `/actuator/info` - Application information

## 📋 Example API Calls

### Get All Projects
```bash
curl http://localhost:8080/api/projects
```

### Add a New Project 🆕
```bash
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "github_url": "https://github.com/kubernetes/kubernetes",
    "foundation": "CNCF",
    "website": "https://kubernetes.io"
  }'
```

### Get Strimzi Metrics
```bash
curl http://localhost:8080/api/projects/strimzi/metrics
```

### Get Keycloak Contributors
```bash
curl http://localhost:8080/api/projects/keycloak/contributors
```

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/ossdashboard/
│   │   │   ├── OssDashboardApplication.java    # Main application
│   │   │   ├── config/
│   │   │   │   └── CorsConfig.java             # CORS configuration
│   │   │   ├── controller/
│   │   │   │   └── ProjectController.java      # REST endpoints
│   │   │   ├── service/
│   │   │   │   └── DataService.java            # Business logic
│   │   │   └── model/                          # Data models
│   │   │       ├── Project.java
│   │   │       ├── ProjectMetrics.java
│   │   │       ├── ProjectMetadata.java
│   │   │       ├── ContributorData.java
│   │   │       ├── CommitData.java
│   │   │       ├── IssueData.java
│   │   │       ├── PullRequestData.java
│   │   │       └── ReleaseData.java
│   │   └── resources/
│   │       └── application.properties          # Configuration
│   └── test/                                   # Unit tests (coming soon)
└── pom.xml                                     # Maven configuration
```

## ⚙️ Configuration

Edit `src/main/resources/application.properties`:

```properties
# Server port
server.port=8080

# Data directory (relative to project root)
app.data.directory=../data

# CORS allowed origins (for frontend)
app.cors.allowed-origins=http://localhost:3000,http://localhost:5173
```

## 🔧 Development

### Data Flow

1. `scripts/extract_github_data.py` fetches GitHub data and writes JSON into `../data/`
2. The extractor also maintains caches and incremental checkpoint state for faster reruns
3. This Spring Boot backend reads those JSON files and exposes them through REST endpoints

### Time Scope Metadata

Not all metrics use the same time window. Generated JSON now includes explicit `time_scope` fields so frontend consumers can label metrics correctly.

Examples:
- Contributor totals are based on all-time GitHub contributor data
- Contributor retention is based on a recent git-history window
- Commit totals, quarter buckets, and committers are based on the configured recent quarter window

### Hot Reload

Spring Boot DevTools is included for automatic restart on code changes.

### Adding New Endpoints

1. Add method to `DataService.java`
2. Add endpoint to `ProjectController.java`
3. Test with curl or Postman

### Adding New Data Models

1. Create model class in `model/` package
2. Use `@Data`, `@NoArgsConstructor`, `@AllArgsConstructor` from Lombok
3. Use `@JsonProperty` for snake_case JSON fields

## 🧪 Testing

```bash
# Run tests
mvn test

# Run with coverage
mvn test jacoco:report
```

## 📦 Dependencies

- **Spring Boot 3.2.0** - Framework
- **Spring Web** - REST API
- **Spring DevTools** - Hot reload
- **Lombok** - Reduce boilerplate
- **Jackson** - JSON processing
- **Spring Actuator** - Health checks

## 🐛 Troubleshooting

### "Cannot find data directory"
- Ensure you've run the Python extraction script first
- Check `app.data.directory` in `application.properties`
- Verify `../data/projects.json` exists

### "API starts but metrics are outdated"
- Rerun `python3 extract_github_data.py` from the `scripts/` directory
- Confirm project JSON files under `../data/` were updated
- Check per-project `_state.json` files if you are validating incremental extraction behavior

### "Port 8080 already in use"
- Change port in `application.properties`: `server.port=8081`
- Or kill the process using port 8080

### "CORS errors from frontend"
- Add your frontend URL to `app.cors.allowed-origins`
- Restart the backend after changes

## 🚀 Next Steps

- [ ] Add caching for better performance
- [ ] Add database support for historical data
- [ ] Add authentication/authorization
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Add comprehensive unit tests
- [ ] Add integration tests
- [ ] Add Docker support
- [ ] Add CI/CD pipeline

## 📝 API Response Examples

### GET /api/projects
```json
[
  {
    "id": "strimzi",
    "name": "Strimzi",
    "githubUrl": "https://github.com/strimzi/strimzi-kafka-operator",
    "owner": "strimzi",
    "repo": "strimzi-kafka-operator",
    "foundation": "CNCF",
    "website": "https://strimzi.io",
    "enabled": true
  },
  {
    "id": "keycloak",
    "name": "Keycloak",
    "githubUrl": "https://github.com/keycloak/keycloak",
    "owner": "keycloak",
    "repo": "keycloak",
    "foundation": "CNCF",
    "website": "https://www.keycloak.org",
    "enabled": true
  }
]
```

### GET /api/projects/strimzi/metadata
```json
{
  "name": "strimzi-kafka-operator",
  "full_name": "strimzi/strimzi-kafka-operator",
  "description": "Apache Kafka running on Kubernetes",
  "stars": 4500,
  "forks": 1200,
  "language": "Java",
  "topics": ["kafka", "kubernetes", "operator"],
  "created_at": "2017-09-01T12:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### GET /api/projects/strimzi/contributors
```json
{
  "total_contributors": 250,
  "contributors": [
    {
      "login": "user1",
      "contributions": 1500,
      "company": "Red Hat",
      "location": "Boston, MA",
      "profile_url": "https://github.com/user1"
    }
  ],
  "company_diversity": {
    "top_companies": [
      {
        "company": "Red Hat",
        "contributors": 45
      }
    ]
  },
  "retention_by_quarter": [
    {
      "quarter": "2024-Q1",
      "new_contributors": 12,
      "retained_next_quarter": 7,
      "retention_rate": 0.58
    }
  ],
  "time_scope": {
    "contributors": "all_time_github_contributors",
    "retention_by_quarter": "last_12_months_from_git_history"
  },
  "extracted_at": "2024-01-15T10:00:00Z"
}
```

### GET /api/projects/strimzi/metrics
```json
{
  "projectId": "strimzi",
  "projectName": "Strimzi",
  "metadata": { /* metadata object */ },
  "contributors": { /* contributors object */ },
  "commits": {
    "total_commits": 5000,
    "quarters": [
      {
        "quarter": "Q1 2024",
        "start_date": "2024-01-01",
        "end_date": "2024-03-31",
        "commit_count": 450
      }
    ],
    "committers": [
      {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "commit_count": 120,
        "company": "Red Hat",
        "location": "Raleigh, NC"
      }
    ],
    "time_scope": {
      "total_commits": "last_4_quarters",
      "quarters": "last_4_quarters",
      "committers": "last_4_quarters_from_git_history"
    }
  },
  "issues": {
    "total_open": 120,
    "total_closed": 2500,
    "total_issues": 2620,
    "avg_resolution_time_days": 15.5
  },
  "pullRequests": {
    "total_prs": 3000,
    "quarters": [
      {
        "quarter": "Q1 2024",
        "pr_count": 250
      }
    ]
  },
  "releases": {
    "total_releases": 45,
    "recent_releases": [
      {
        "tag_name": "v0.40.0",
        "name": "Release 0.40.0",
        "published_at": "2024-01-10T12:00:00Z",
        "prerelease": false,
        "draft": false
      }
    ]
  }
}
```

---

**Built with Spring Boot 3.2.0 and Java 17**