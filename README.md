# Open Source Dashboard Project

Enterprise-grade dashboard system to monitor contributor activity and project health metrics across multiple open-source projects.

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
pip install -r requirements.txt
```

### 3. Run Data Extraction

```bash
cd scripts
python extract_github_data.py
```

This will:
- Extract data from all 6 configured projects
- Save JSON files in the `data/` directory
- Show progress bars and status updates

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
├── backend/                       # Java Spring Boot API (coming soon)
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

- **Metadata**: Stars, forks, description, creation date
- **Contributors**: Total count, company affiliations, contribution counts
- **Commits**: Quarterly commit activity
- **Issues**: Open/closed counts, average resolution time
- **Pull Requests**: Quarterly PR counts
- **Releases**: Release history and cadence

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
3. ⏳ Build Spring Boot backend API
4. ⏳ Create React dashboard frontend
5. ⏳ Set up GitHub Actions automation
6. ⏳ Add AI-powered project onboarding

## 🆘 Troubleshooting

### "Authentication failed"
- Check that your GitHub token is correct in `config.yaml`
- Make sure the token has the required scopes

### "Rate limit exceeded"
- GitHub allows 5,000 requests per hour with authentication
- Wait an hour or use a different token
- The script includes automatic rate limiting

### "Module not found"
- Run `pip install -r requirements.txt` in the `scripts/` directory
- Make sure you're using Python 3.8 or higher

## 📧 Support

For questions or issues, contact the project team.

---

**Status**: 🟢 Data extraction ready | 🟡 Backend in progress | 🟡 Frontend in progress