# Open Source Dashboard Project

Enterprise-grade dashboard system to monitor contributor activity and project health metrics across multiple open-source projects.

> **Architecture**: This project uses a polyglot architecture with Python for data extraction and Java/Spring Boot for the API backend. See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## 🚀 Quick Start

### 1. Get Your GitHub Token

Before running the data extraction, you need a GitHub Personal Access Token:

1. Go to GitHub: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: `OSS Dashboard`
4. Select these scopes:
   - ✅ `public_repo` (Access public repositories)
   - ✅ `read:org` (Read organization data)
   - ✅ `read:user` (Read user profile data)
5. Click **"Generate token"**
6. **COPY THE TOKEN** (you won't see it again!)
7. Paste it in `scripts/config.yaml` where it says `YOUR_GITHUB_TOKEN_HERE`

### 2. Install Python Dependencies

```bash
cd scripts
python3 -m pip install -r requirements.txt
```

### 3. Run Data Extraction

```bash
cd scripts
python3 extract_github_data.py
```

This will:
- Extract data from all configured projects
- Save JSON files in the `data/` directory
- Reuse cached local git mirrors and cached GitHub user profiles when available
- Update per-project checkpoint state for incremental reruns
- Show progress bars and status updates

### 4. Start the Backend API

```bash
cd backend
mvn spring-boot:run
```

The API starts on `http://localhost:8080`

## 📁 Project Structure

```
oss-dashboard/
├── data/                          # Extracted data (JSON files)
│   ├── projects.json             # Project registry
│   ├── strimzi/                  # Strimzi project data
│   │   ├── metadata.json
│   │   ├── contributors.json
│   │   ├── commits.json
│   │   ├── issues.json
│   │   ├── pull_requests.json
│   │   └── releases.json
│   └── [other-projects]/         # Same structure for each project
│
├── scripts/                       # Data extraction scripts
│   ├── extract_github_data.py    # Main extraction script
│   ├── config.yaml               # Configuration (add your token here!)
│   └── requirements.txt          # Python dependencies
│
├── backend/                       # Java Spring Boot API ✅
├── frontend/                      # React dashboard (coming soon)
└── .github/workflows/            # GitHub Actions automation (coming soon)
```

## 📊 Tracked Projects

1. **Strimzi** - CNCF Kafka operator
2. **Apache Camel** - Integration framework
3. **Apache ActiveMQ** - Message broker
4. **Keycloak** - Identity and access management
5. **Apicurio** - API design platform
6. **3scale** - API management

## 🔧 Configuration

Edit `scripts/config.yaml` to:
- Add your GitHub token
- Add/remove projects
- Adjust data extraction settings

## 📈 Extracted Metrics

For each project, we extract:

- **Metadata**: Stars, forks, description, creation date, foundation, and related repository details
- **Contributors**: Total count, company affiliations, contribution counts, company diversity, and retention by quarter
- **Commits**: Quarterly commit activity plus aggregated committers enriched with company/location/profile data when available
- **Issues**: Open/closed counts, average resolution time, and issue commenters
- **Pull Requests**: Quarterly PR counts and merge timing metrics
- **Releases**: Release history and cadence metrics

### Time Scope Notes

Some metrics are all-time and others are windowed. The extractor now writes explicit `time_scope` metadata into generated JSON so the dashboard can display scope correctly.

Examples:
- `contributors.json -> total_contributors` is based on all-time GitHub contributor data
- `contributors.json -> retention_by_quarter` is based on the recent git-history window
- `commits.json -> total_commits`, `quarters`, and `committers` are based on the configured recent quarter window

## 🤖 AI-Assisted Development

This project uses AI assistance for:
- GitHub API integration
- Data extraction logic
- Configuration management
- Documentation generation

All AI prompts and techniques are documented for replicability.

## 📝 Next Steps

1. ✅ Set up project structure
2. ✅ Create data extraction scripts
3. ✅ Build Spring Boot backend API
4. ⏳ Create React dashboard frontend
5. ⏳ Set up GitHub Actions automation
6. ⏳ Add AI-powered project onboarding

## 🔌 Backend API

The Java Spring Boot backend is now complete! See [backend/README.md](backend/README.md) for:
- API endpoint documentation
- Setup instructions
- Example API calls
- Development guide

**Quick Start:**
```bash
cd backend
mvn spring-boot:run
```

API runs on `http://localhost:8080`

Typical local workflow:
1. Update `scripts/config.yaml` with your GitHub token
2. Run `python3 extract_github_data.py`
3. Start the backend with `mvn spring-boot:run`
4. Query endpoints under `http://localhost:8080/api/projects`

## 🆘 Troubleshooting

### "Authentication failed"
- Check that your GitHub token is correct in `config.yaml`
- Make sure the token has the required scopes

### "Rate limit exceeded"
- GitHub allows 5,000 requests per hour with authentication
- Wait an hour or use a different token
- The script includes automatic rate limiting

### "Module not found"
- Run `python3 -m pip install -r requirements.txt` in the `scripts/` directory
- Make sure you're using Python 3.8 or higher

### "`python` command not found"
- Use `python3 extract_github_data.py`
- Use `python3 -m pip install -r requirements.txt`

### "Backend starts but data looks stale"
- Rerun `python3 extract_github_data.py` to refresh JSON files in `data/`
- Check per-project files such as `data/strimzi/_state.json` for incremental extraction checkpoints

## 📧 Support

For questions or issues, contact the project team.

---

**Status**: 🟢 Data extraction ready | 🟢 Backend API ready | 🟡 Frontend in progress