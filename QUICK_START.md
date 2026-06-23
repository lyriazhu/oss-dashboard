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
python3 -m pip install -r requirements.txt
```

Wait for installation to complete (you'll see "Successfully installed...").

**Troubleshooting:**
- If `pip` not found, use `python3 -m pip`
- Avoid `sudo pip`; prefer a user install or virtual environment if needed

### ✅ Step 5: Run Data Extraction (5-10 minutes)

In the same terminal, run:

```bash
python3 extract_github_data.py
```

**What you'll see:**
- ✅ Authentication confirmation
- 📊 Progress bars for each project
- ✅ Success messages as data is saved
- ♻️ Faster reruns due to cached git mirrors, cached user profiles, and per-project checkpoints

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
- ✅ Fresh data from all configured projects
- ✅ Data files ready for the backend API

## 🚀 Next Steps

1. **Start the Backend API** (Java Spring Boot)
   - Reads the JSON data from `data/`
   - Exposes REST endpoints
   - Runs on `http://localhost:8080`

   ```bash
   cd ../backend
   mvn spring-boot:run
   ```

2. **Verify the API**
   - `http://localhost:8080/api/projects`
   - `http://localhost:8080/api/projects/strimzi`
   - `http://localhost:8080/api/projects/strimzi/metrics`
   - `http://localhost:8080/api/projects/strimzi/contributors`

3. **Build the Frontend Dashboard** (React)
   - Visualize the backend data
   - Add interactive charts and drill-down views
   - Display metric time scope where relevant

## 📚 Documentation

- `README.md` - Project overview
- `SETUP_GUIDE.md` - Detailed setup instructions
- `HOW_TO_GET_GITHUB_TOKEN.md` - Token creation guide

## 🆘 Having Issues?

### "Authentication failed"
→ Check your token in `config.yaml`

### "Module not found"
→ Run `python3 -m pip install -r requirements.txt` in the `scripts/` folder

### "Rate limit exceeded"
→ Wait 1 hour or create a new token

### "Script is slow"
→ Normal on first run. Later runs should be faster because the extractor reuses cached git history, cached user profiles, and checkpoint state.

## 💡 Tips

- **Re-run anytime**: Just run `python3 extract_github_data.py` again
- **Add projects**: Edit `scripts/config.yaml` to add more repositories
- **Check rate limit**: The script shows how many API requests you have left
- **Time scope matters**: Some metrics are all-time while others are recent-window metrics; generated JSON now includes explicit `time_scope` metadata

---

**Ready to build the dashboard?** Start the backend next, then wire a frontend to the API.