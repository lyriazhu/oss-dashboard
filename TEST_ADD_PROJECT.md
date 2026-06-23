# Testing the Add Project Feature

## Prerequisites

1. Backend is running: `cd backend && mvn spring-boot:run`
2. GitHub token is configured in `scripts/config.yaml`

## Test Steps

### 1. Test Invalid GitHub URL

```bash
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "github_url": "not-a-valid-url"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid GitHub URL format. Expected: https://github.com/owner/repo",
  "project": null,
  "extractionStatus": null
}
```

### 2. Test Adding a Valid Project

```bash
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "github_url": "https://github.com/prometheus/prometheus",
    "foundation": "CNCF",
    "website": "https://prometheus.io"
  }'
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Project added successfully",
  "project": {
    "id": "prometheus",
    "name": "prometheus",
    "github_url": "https://github.com/prometheus/prometheus",
    "owner": "prometheus",
    "repo": "prometheus",
    "foundation": "CNCF",
    "website": "https://prometheus.io",
    "enabled": true
  },
  "extractionStatus": "Data extraction started. This may take several minutes."
}
```

### 3. Verify Project Was Added

```bash
curl http://localhost:8080/api/projects | jq '.[] | select(.id == "prometheus")'
```

**Expected:** Should return the prometheus project object

### 4. Check projects.json File

```bash
cat data/projects.json | jq '.projects[] | select(.id == "prometheus")'
```

**Expected:** Should show the prometheus project in the JSON file

### 5. Test Duplicate Project

Try adding the same project again:

```bash
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "github_url": "https://github.com/prometheus/prometheus"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Project with ID 'prometheus' already exists",
  "project": null,
  "extractionStatus": null
}
```

### 6. Wait for Data Extraction

Data extraction runs in the background. Check for data files:

```bash
# Wait 2-5 minutes, then check:
ls -la data/prometheus/

# Should see:
# metadata.json
# contributors.json
# commits.json
# issues.json
# pull_requests.json
# releases.json
```

### 7. Verify Data is Accessible

```bash
# Get project metadata
curl http://localhost:8080/api/projects/prometheus/metadata

# Get project metrics
curl http://localhost:8080/api/projects/prometheus/metrics
```

**Expected:** Should return the extracted data

## Test Different URL Formats

### With .git extension
```bash
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "github_url": "https://github.com/grafana/grafana.git"
  }'
```

### Without https://
```bash
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "github_url": "github.com/etcd-io/etcd"
  }'
```

### With trailing slash
```bash
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "github_url": "https://github.com/helm/helm/"
  }'
```

All should work correctly!

## Cleanup Test Projects

To remove test projects, manually edit `data/projects.json` and remove the test entries, then delete the corresponding data directories:

```bash
# Remove from projects.json (manual edit)
# Then delete data directories:
rm -rf data/prometheus
rm -rf data/grafana
rm -rf data/etcd
rm -rf data/helm
```

## Troubleshooting

### Data extraction doesn't start
- Check backend logs for errors
- Verify `scripts/extract_github_data.py` exists
- Try running manually: `cd scripts && python3 extract_github_data.py`

### Backend returns 500 error
- Check backend logs
- Verify `data/projects.json` is valid JSON
- Ensure data directory is writable

### Project added but no data appears
- Data extraction takes time (2-30 minutes depending on project size)
- Check if Python script is running: `ps aux | grep extract_github_data`
- Check for errors in terminal where backend is running

---

**Made with Bob**