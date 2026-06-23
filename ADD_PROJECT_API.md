# Add Project API Documentation

## Overview

The OSS Dashboard now supports dynamically adding new projects via a REST API endpoint. Users can provide a GitHub repository URL, and the system will:

1. Parse the GitHub URL to extract owner and repository information
2. Add the project to `data/projects.json`
3. Automatically trigger data extraction for the new project
4. Create a new dashboard page for the project

## API Endpoint

### Add New Project

**Endpoint:** `POST /api/projects`

**Request Body:**
```json
{
  "github_url": "https://github.com/owner/repository",
  "foundation": "Optional - e.g., CNCF, Apache Software Foundation",
  "website": "Optional - project website URL"
}
```

**Response (Success - 201 Created):**
```json
{
  "success": true,
  "message": "Project added successfully",
  "project": {
    "id": "repository",
    "name": "Repository",
    "github_url": "https://github.com/owner/repository",
    "owner": "owner",
    "repo": "repository",
    "foundation": "Independent",
    "website": null,
    "enabled": true
  },
  "extractionStatus": "Data extraction started. This may take several minutes."
}
```

**Response (Error - 400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid GitHub URL format. Expected: https://github.com/owner/repo",
  "project": null,
  "extractionStatus": null
}
```

**Response (Error - 400 Bad Request - Duplicate):**
```json
{
  "success": false,
  "message": "Project with ID 'repository' already exists",
  "project": null,
  "extractionStatus": null
}
```

## Supported GitHub URL Formats

The API accepts various GitHub URL formats:

- `https://github.com/owner/repo`
- `https://github.com/owner/repo.git`
- `http://github.com/owner/repo`
- `github.com/owner/repo`

## Usage Examples

### Using cURL

```bash
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "github_url": "https://github.com/kubernetes/kubernetes",
    "foundation": "CNCF",
    "website": "https://kubernetes.io"
  }'
```

### Using JavaScript (fetch)

```javascript
fetch('http://localhost:8080/api/projects', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    github_url: 'https://github.com/kubernetes/kubernetes',
    foundation: 'CNCF',
    website: 'https://kubernetes.io'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

### Using Python (requests)

```python
import requests

url = "http://localhost:8080/api/projects"
payload = {
    "github_url": "https://github.com/kubernetes/kubernetes",
    "foundation": "CNCF",
    "website": "https://kubernetes.io"
}

response = requests.post(url, json=payload)
print(response.json())
```

## Data Extraction Process

When a new project is added:

1. **Immediate Actions:**
   - Project is added to `data/projects.json`
   - Project ID is generated from the repository name
   - API returns success response immediately

2. **Background Process:**
   - Python data extraction script is triggered automatically
   - The script extracts:
     - Project metadata (stars, forks, description)
     - Contributors and company affiliations
     - Commit history (quarterly aggregation)
     - Issues (open/closed counts, resolution time)
     - Pull requests (quarterly counts)
     - Releases (recent releases)
   - Data is saved to `data/{project-id}/` directory

3. **Timeline:**
   - Small projects: 2-5 minutes
   - Medium projects: 5-15 minutes
   - Large projects: 15-30 minutes

## Project ID Generation

The project ID is automatically generated from the repository name:
- Converted to lowercase
- Special characters replaced with hyphens
- Example: `strimzi-kafka-operator` → `strimzi-kafka-operator`
- Example: `My_Cool_Project` → `my-cool-project`

## Accessing New Project Data

After data extraction completes, the project data is available via:

- **Get all projects:** `GET /api/projects`
- **Get specific project:** `GET /api/projects/{projectId}`
- **Get project metrics:** `GET /api/projects/{projectId}/metrics`
- **Get project metadata:** `GET /api/projects/{projectId}/metadata`
- **Get project contributors:** `GET /api/projects/{projectId}/contributors`

## Manual Data Extraction

If automatic data extraction fails, you can manually trigger it:

```bash
cd scripts
python3 extract_github_data.py
```

The script will automatically detect the new project in `projects.json` and extract its data.

## Error Handling

### Common Errors

1. **Invalid GitHub URL**
   - Ensure the URL follows the format: `https://github.com/owner/repo`
   - Check for typos in the URL

2. **Project Already Exists**
   - Each repository can only be added once
   - Check existing projects: `GET /api/projects`

3. **Data Extraction Failed**
   - Check GitHub token in `scripts/config.yaml`
   - Verify GitHub API rate limits
   - Run extraction manually if needed

4. **GitHub API Rate Limit**
   - GitHub allows 5,000 requests per hour with authentication
   - Wait an hour or use a different token

## Best Practices

1. **Provide Complete Information:**
   - Include foundation and website when known
   - This improves dashboard display quality

2. **Verify Project Exists:**
   - Check that the GitHub repository exists and is public
   - Private repositories are not supported

3. **Monitor Extraction:**
   - Check backend logs for extraction progress
   - Verify data files are created in `data/{project-id}/`

4. **Rate Limiting:**
   - Avoid adding many projects simultaneously
   - Space out additions to respect GitHub API limits

## Integration with Frontend

When building a frontend, create a form with:

1. **Required Field:**
   - GitHub URL input (with validation)

2. **Optional Fields:**
   - Foundation dropdown or text input
   - Website URL input

3. **User Feedback:**
   - Show success message with extraction status
   - Display error messages clearly
   - Provide link to view the new project once data is ready

4. **Example UI Flow:**
   ```
   [Add Project Button] → [Modal/Form] → [Submit] → [Success Message] → [Redirect to Projects List]
   ```

## Security Considerations

### Current Implementation (Development)

- No authentication required
- All endpoints are public
- Suitable for development/internal use only

### Production Recommendations

1. **Add Authentication:**
   - Require API key or JWT token
   - Implement user roles (admin can add projects)

2. **Rate Limiting:**
   - Limit requests per IP/user
   - Prevent abuse and spam

3. **Input Validation:**
   - Validate GitHub URLs server-side
   - Sanitize all user inputs
   - Check repository accessibility before adding

4. **Audit Logging:**
   - Log all project additions
   - Track who added what and when

## Troubleshooting

### Backend Not Starting

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

### Python Script Not Found

Ensure the scripts directory exists relative to the data directory:
```
oss-dashboard/
├── data/
├── scripts/
│   └── extract_github_data.py
└── backend/
```

### Data Not Appearing

1. Check if extraction completed:
   ```bash
   ls -la data/{project-id}/
   ```

2. Verify all JSON files exist:
   - metadata.json
   - contributors.json
   - commits.json
   - issues.json
   - pull_requests.json
   - releases.json

3. Restart backend to reload data:
   ```bash
   cd backend
   mvn spring-boot:run
   ```

## Future Enhancements

Potential improvements for this feature:

1. **Async Job Queue:**
   - Use message queue (RabbitMQ, Redis) for extraction jobs
   - Provide job status endpoint
   - Send notifications when extraction completes

2. **Webhook Support:**
   - Notify external systems when project is added
   - Trigger CI/CD pipelines

3. **Batch Import:**
   - Support adding multiple projects at once
   - Import from CSV or JSON file

4. **Project Validation:**
   - Check if repository exists before adding
   - Verify repository is public
   - Fetch basic metadata during addition

5. **Project Management:**
   - Update project information
   - Disable/enable projects
   - Delete projects

## Support

For issues or questions:
- Check backend logs: `backend/logs/`
- Check Python script output
- Review this documentation
- Contact the development team

---

**Made with Bob**