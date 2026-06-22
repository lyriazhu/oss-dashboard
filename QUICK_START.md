# ⚡ Quick Start - Get Running in 5 Minutes!

## 📋 Checklist

Follow these steps in order:

### ✅ Step 1: Open in VS Code (30 seconds)

1. Open VS Code
2. File → Open Folder
3. Select `oss-dashboard` from your Desktop
4. Click Open

### ✅ Step 2: Get GitHub Token (2 minutes)

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name it: `OSS Dashboard`
4. Expiration: `90 days`
5. Check these 3 boxes:
   - ✅ `public_repo`
   - ✅ `read:org`
   - ✅ `read:user`
6. Click "Generate token"
7. **Copy the token** (starts with `ghp_`)

📖 **Need help?** See `HOW_TO_GET_GITHUB_TOKEN.md` for detailed instructions with screenshots.

### ✅ Step 3: Add Token to Config (30 seconds)

1. In VS Code, open: `scripts/config.yaml`
2. Find line: `token: "YOUR_GITHUB_TOKEN_HERE"`
3. Replace with your token: `token: "ghp_xxxxxxxxxxxx"`
4. Save file (Cmd+S or Ctrl+S)

### ✅ Step 4: Install Python Libraries (2 minutes)

Open VS Code terminal (Terminal → New Terminal) and run:

```bash
cd scripts
pip install -r requirements.txt
```

Wait for installation to complete (you'll see "Successfully installed...").

**Troubleshooting:**
- If `pip` not found, try `pip3`
- If permission denied, try `sudo pip install -r requirements.txt`

### ✅ Step 5: Run Data Extraction (5-10 minutes)

In the same terminal, run:

```bash
python extract_github_data.py
```

**What you'll see:**
- ✅ Authentication confirmation
- 📊 Progress bars for each project
- ✅ Success messages as data is saved

**This extracts data from:**
1. Strimzi
2. Apache Camel
3. Apache ActiveMQ
4. Keycloak
5. Apicurio
6. 3scale

### ✅ Step 6: Check Your Data

After the script finishes, look in the `data/` folder. You should see:

```
data/
├── strimzi/
│   ├── metadata.json
│   ├── contributors.json
│   ├── commits.json
│   ├── issues.json
│   ├── pull_requests.json
│   └── releases.json
├── apache-camel/
├── apache-activemq/
├── keycloak/
├── apicurio/
└── 3scale/
```

Click on any `.json` file to view the data!

## 🎉 Success!

You now have:
- ✅ Complete project structure
- ✅ Working data extraction script
- ✅ Fresh data from all 6 projects
- ✅ Automated refresh workflow (GitHub Actions)

## 🚀 Next Steps

1. **Build the Backend API** (Java Spring Boot)
   - Reads the JSON data
   - Exposes REST endpoints
   - Runs on Tomcat

2. **Build the Frontend Dashboard** (React)
   - Visualizes the data
   - Interactive charts and graphs
   - Drill-down into each project

3. **Deploy to Production**
   - Containerize with Docker/Podman
   - Deploy to IBM infrastructure
   - Set up automatic data refresh

## 📚 Documentation

- `README.md` - Project overview
- `SETUP_GUIDE.md` - Detailed setup instructions
- `HOW_TO_GET_GITHUB_TOKEN.md` - Token creation guide

## 🆘 Having Issues?

### "Authentication failed"
→ Check your token in `config.yaml`

### "Module not found"
→ Run `pip install -r requirements.txt` in the `scripts/` folder

### "Rate limit exceeded"
→ Wait 1 hour or create a new token

### "Script is slow"
→ Normal! Large projects take time. Watch the progress bars.

## 💡 Tips

- **Re-run anytime**: Just run `python extract_github_data.py` again
- **Add projects**: Edit `scripts/config.yaml` to add more repositories
- **Check rate limit**: The script shows how many API requests you have left
- **Automatic updates**: GitHub Actions will refresh data every 3 days

---

**Ready to build the dashboard?** Let's create the backend and frontend next!