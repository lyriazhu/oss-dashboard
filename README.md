# Open Source Dashboard

A scalable, low-maintenance, replicable dashboard to track contributors and other project health metrics across different open-source projects.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install Prerequisites](#2-install-prerequisites)
3. [Clone the Repository](#3-clone-the-repository)
4. [Create a GitHub Token](#4-create-a-github-token)
5. [Start the Backend API](#5-start-the-backend-api)
6. [Start the Frontend](#6-start-the-frontend)
7. [Run Initial Data Extraction](#7-run-initial-data-extraction)
8. [Adding a New Project](#8-adding-a-new-project)
9. [Refreshing Data](#9-refreshing-data)
10. [Project Structure](#10-project-structure)
11. [Tracked Projects](#11-tracked-projects)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

You need the following tools installed before running the dashboard. If you already have one, skip to the next.

| Tool | Required version | Used for |
|------|-----------------|----------|
| Homebrew | latest | macOS package manager |
| Git | any | cloning the repo |
| Java (JDK) | 17 or higher | Spring Boot backend |
| Maven | 3.6 or higher | building/running the backend |
| Node.js | 18 or higher | React frontend |

> **No Python setup required.** Data extraction is triggered directly from the dashboard UI using the buttons described in steps 7–9.

---

## 2. Install Prerequisites

Work through these steps in order. Each step checks whether a tool is already present before installing it.

### 2a. Homebrew (macOS only)

Homebrew is a package manager for macOS. Everything else can be installed through it.

```bash
# Check if Homebrew is already installed
brew --version
```

If you see `command not found`, install it:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow any on-screen instructions (you may be asked for your Mac password). When it finishes, run:

```bash
brew --version
```

You should see something like `Homebrew 4.x.x`.

> **Apple Silicon (M1/M2/M3 Mac)?** After installing Homebrew, run the two `eval` lines it prints at the end of the install log to add Homebrew to your PATH. They look like:
> ```bash
> echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
> eval "$(/opt/homebrew/bin/brew shellenv)"
> ```

---

### 2b. Git

```bash
git --version
```

If not installed:

```bash
brew install git
```

---

### 2c. Java 17 (JDK)

```bash
java -version
```

If you see `openjdk 17` or higher, skip ahead. If not:

```bash
brew install openjdk@17
```

After installation, Homebrew will print a `sudo ln -sfn ...` command. Run it to make Java available system-wide. It looks like:

```bash
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
```

Then add Java to your PATH for the current session:

```bash
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
```

To make this permanent, add the same line to `~/.zshrc` (or `~/.bash_profile`):

```bash
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Verify:

```bash
java -version   # should show openjdk 17.x.x
```

---

### 2d. Maven

```bash
mvn -version
```

If not installed:

```bash
brew install maven
```

Verify:

```bash
mvn -version   # should show Apache Maven 3.x.x
```

---

### 2e. Node.js

```bash
node --version
```

If you see `v18` or higher, skip ahead. If not:

```bash
brew install node
```

Verify:

```bash
node --version   # should show v18.x.x or higher
npm --version    # should show 9.x.x or higher
```

---

## 3. Clone the Repository

If you received the project as a zip file, unzip it and skip this step. Otherwise:

```bash
git clone https://github.com/your-org/oss-dashboard.git
cd oss-dashboard
```

---

## 4. Create a GitHub Token

The dashboard calls the GitHub API to fetch contributor, commit, issue, and PR data. Without a token, GitHub limits you to 60 requests per hour — far too few. A token raises this to **5,000 requests per hour**.

### Step-by-step

1. Open your browser and go to: **https://github.com/settings/tokens**
   - Or navigate manually: GitHub → Profile picture (top right) → **Settings** → **Developer settings** (bottom of left sidebar) → **Personal access tokens** → **Tokens (classic)**

2. Click **"Generate new token"** → **"Generate new token (classic)"**
   > Do not use Fine-grained tokens — they require additional repository configuration.

3. Fill in the form:
   - **Note**: `OSS Dashboard` (a label so you can identify it later)
   - **Expiration**: `90 days` (or longer — you can always regenerate)

4. Select **exactly these three scopes** and nothing else:

   | Section | Scope to check | What it does |
   |---------|---------------|--------------|
   | `repo` | ✅ `public_repo` | Read public repository data |
   | `admin:org` | ✅ `read:org` | Read organisation membership |
   | `user` | ✅ `read:user` | Read contributor profile data |

5. Click the green **"Generate token"** button at the bottom.

6. **Copy the token immediately.** It starts with `ghp_` and looks like:
   ```
   ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   > ⚠️ You will **never** be able to see this token again after you leave the page. If you lose it, delete it and create a new one.

---

## 5. Start the Backend API

The backend is a Java Spring Boot application that reads the JSON files in `data/` and exposes them as a REST API.

Open a terminal and run:

```bash
cd backend
mvn spring-boot:run
```

Maven will download dependencies on the first run (~1–2 minutes). Once you see:

```
Started OssDashboardApplication in X.XXX seconds
```

the API is running at **http://localhost:8080**.

**Verify it works:**

```bash
curl http://localhost:8080/api/projects
```

You should see a JSON array of all tracked projects.

---

## 6. Start the Frontend

Open a **second terminal** and run:

```bash
cd frontend
npm install      # first time only — installs React, Vite, etc.
npm run dev
```

Once you see:

```
  ➜  Local:   http://localhost:5173/
```

open **http://localhost:5173** in your browser. The dashboard loads automatically.

> The frontend proxies API requests to `http://localhost:8080`, so both the backend (step 5) and the frontend (this step) must be running at the same time.

---

## 7. Run Initial Data Extraction *(optional)*

> **You can skip this step for now.** The dashboard will open and function without any extraction having been run — it will simply show no data, or show previously cached data if any exists. You can trigger an extraction at any time from the UI.

> ⚠️ **This step can take a long time.** The first extraction clones full git histories for every tracked project and may take **15–40 minutes**. You do not need to wait for it to finish before using the rest of the dashboard.

When you are ready to populate the dashboard with fresh data, use the **"Refresh all"** button:

1. In the top-right area of the overview page, click **"Refresh all"**.
2. A modal will appear asking for your GitHub personal access token. Paste the token you created in step 4 and click **"Refresh all"**.
3. The backend will extract data for every project in the background. A progress indicator is shown for each project.

**How long does it take?**

- **First run**: 15–40 minutes depending on project age and size (git history cloning is the bottleneck).
- **Subsequent runs**: 2–5 minutes (git mirrors and user profile cache are reused).

> Your token is saved in your browser's local storage and restored automatically on future visits — you will not need to re-enter it each time.

---

## 8. Adding a New Project

You can add any public GitHub repository or organisation directly from the dashboard:

1. On the overview page, click **"Add project"**.
2. Paste your GitHub token (pre-filled if you have used the dashboard before).
3. Choose whether to add a **Single repository** or an **Entire project** (org / user).
4. Paste the GitHub URL (e.g. `https://github.com/owner/repo`).
5. Select the issue tracker — **GitHub Issues** or **Jira** — and fill in any required fields.
6. Click **Add**. The backend registers the project and triggers data extraction automatically.

A progress toast will appear while the extraction runs. Once it completes, the project row appears in the Communities table.

---

## 9. Refreshing Data

To pull fresh data for all projects, click the **"Refresh all"** button on the overview page. The modal will ask for your GitHub token (pre-filled if already saved). Click **"Refresh all"** to start a background extraction for every project.

---

## 10. Project Structure

```
oss-dashboard/
├── data/                          # Extracted JSON data (one folder per project)
│   ├── projects.json              # Project registry
│   └── <project-name>/
│       ├── metadata.json
│       ├── contributors.json
│       ├── commits.json
│       ├── issues.json
│       ├── pull_requests.json
│       ├── releases.json
│       ├── cve.json
│       ├── adopters.json
│       └── _state.json            # Incremental extraction checkpoint
│
├── scripts/                       # Python data extraction (invoked by the backend)
│   ├── extract_github_data.py     # Main extraction script
│   ├── config.yaml                # GitHub token + project list
│   └── requirements.txt           # Python dependencies
│
├── backend/                       # Java Spring Boot API
│   ├── src/main/java/...
│   └── pom.xml
│
├── frontend/                      # React + Vite dashboard
│   ├── src/
│   └── package.json
│
└── .cache/                        # Local git mirrors and user profile cache (auto-generated)
```

---

## 11. Tracked Projects

| Project | Foundation | Issue source |
|---------|-----------|-------------|
| Strimzi | CNCF | GitHub Issues |
| Apache Camel | Apache Software Foundation | Jira |
| Apache Artemis | Apache Software Foundation | Jira |
| Keycloak | CNCF | GitHub Issues |
| Apicurio Registry | Independent | GitHub Issues |
| Debezium | Commonhaus Foundation | GitHub Issues |
| Quarkus | Independent | GitHub Issues |
| Wildfly | Commonhaus Foundation | Jira |
| 3scale Operator | Red Hat | GitHub Issues |
| Tomcat | Apache Software Foundation | GitHub Issues |
| Kroxylicious | Independent | GitHub Issues |
| StreamsHub | Independent | GitHub Issues |

---

## 12. Troubleshooting

### "brew: command not found"
Homebrew is not installed or not on your PATH. Follow [step 2a](#2a-homebrew-macos-only) above.

### "java: command not found" or wrong Java version
Run `brew install openjdk@17` and follow the `sudo ln` and `export PATH` steps in [step 2c](#2c-java-17-jdk).

### "mvn: command not found"
Run `brew install maven`.

### Backend starts but the dashboard shows no data
- Click **"Refresh all"** on the overview page to trigger the first data extraction.
- If extraction has already run, check that `data/` contains project folders.
- The backend reads files at startup — if you added data after starting the backend, restart it.
- Check `http://localhost:8080/api/projects` in your browser to confirm the API is serving data.

### Frontend shows "Cannot connect to API"
- The backend must be running on port 8080 before opening the frontend.
- Run `mvn spring-boot:run` in the `backend/` directory first.

### "Port 8080 already in use"
Another process is using port 8080. Find and stop it:
```bash
lsof -i :8080
kill -9 <PID>
```
Then restart the backend.

### "Authentication failed: Bad credentials" during extraction
- Make sure the token entered in the dashboard is correct (no extra spaces).
- Make sure the token has not expired — check at https://github.com/settings/tokens.
- Verify the three required scopes (`public_repo`, `read:org`, `read:user`) are selected.

### "Rate limit exceeded" during extraction
- GitHub allows 5,000 API requests per hour with a token. Large projects can approach this limit.
- Wait one hour and click **"Refresh all"** again. The checkpoint state means extraction resumes where it left off.
- Alternatively, create a second GitHub token and use it in the refresh modal.

### First data extraction is very slow
This is expected. The backend clones full git histories for each project as local mirrors in `.cache/repos/`. Apache Camel's history alone is several hundred MB. Subsequent refreshes reuse these mirrors and complete much faster.
