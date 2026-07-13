# Open Source Dashboard

Enterprise-grade dashboard to monitor contributor activity and project health metrics across multiple open-source projects. It combines a Python data extraction pipeline, a Java/Spring Boot API, and a React frontend.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install Prerequisites](#2-install-prerequisites)
3. [Clone the Repository](#3-clone-the-repository)
4. [Create a GitHub Token](#4-create-a-github-token)
5. [Configure the Extraction Script](#5-configure-the-extraction-script)
6. [Install Python Dependencies](#6-install-python-dependencies)
7. [Run Data Extraction](#7-run-data-extraction)
8. [Start the Backend API](#8-start-the-backend-api)
9. [Start the Frontend](#9-start-the-frontend)
10. [Adding a New Project](#10-adding-a-new-project)
11. [Refreshing Data](#11-refreshing-data)
12. [Project Structure](#12-project-structure)
13. [Tracked Projects](#13-tracked-projects)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Prerequisites

You need the following tools installed before running the dashboard. If you already have one, skip to the next.

| Tool | Required version | Used for |
|------|-----------------|----------|
| Homebrew | latest | macOS package manager |
| Git | any | cloning the repo |
| Python | 3.8 or higher | data extraction script |
| Java (JDK) | 17 or higher | Spring Boot backend |
| Maven | 3.6 or higher | building/running the backend |
| Node.js | 18 or higher | React frontend |

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

### 2c. Python 3

```bash
python3 --version
```

If you see `Python 3.8` or higher, you are good. If not:

```bash
brew install python3
```

Verify:

```bash
python3 --version   # should show 3.8 or higher
pip3 --version      # should show a pip version
```

---

### 2d. Java 17 (JDK)

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

### 2e. Maven

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

### 2f. Node.js

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

The extraction script calls the GitHub API to fetch contributor, commit, issue, and PR data. Without a token, GitHub limits you to 60 requests per hour — far too few. A token raises this to **5,000 requests per hour**.

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

## 5. Configure the Extraction Script

1. Open `scripts/config.yaml` in a text editor.
2. Find the line:
   ```yaml
   token: "YOUR_GITHUB_TOKEN_HERE"
   ```
3. Replace `YOUR_GITHUB_TOKEN_HERE` with your token:
   ```yaml
   token: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```
4. Save the file.

> **Security**: `config.yaml` is listed in `.gitignore` so it will never be accidentally committed to Git. Never paste your token into any other file that might be committed.

---

## 6. Install Python Dependencies

The extraction script requires several Python libraries. Install them into an isolated virtual environment to avoid conflicts with other Python projects on your machine.

```bash
cd scripts
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

You should see output ending with `Successfully installed ...`.

**What gets installed:**

| Library | Purpose |
|---------|---------|
| `PyGithub` | GitHub REST API client |
| `requests` | HTTP requests |
| `PyYAML` | Reading `config.yaml` |
| `pandas` | Data processing |
| `python-dateutil` | Date/time parsing |
| `playwright` | Scraping adopter lists |
| `beautifulsoup4` | HTML parsing for adopter lists |
| `tqdm` | Progress bars in the terminal |
| `tenacity` | Automatic retry on failures |

> **Playwright browser install** (needed once for adopter scraping):
> ```bash
> python3 -m playwright install chromium
> ```

---

## 7. Run Data Extraction

With the virtual environment still active (`source .venv/bin/activate` if you opened a new terminal), run:

```bash
cd scripts   # if not already there
python3 extract_github_data.py
```

**What happens:**

1. The script authenticates with your GitHub token and shows remaining rate limit.
2. For each project it clones or updates a local git mirror (stored in `.cache/repos/`) — this is the slowest part on the first run.
3. It extracts the following for every project and writes JSON files to `data/<project-name>/`:

   | File | Contents |
   |------|----------|
   | `metadata.json` | Stars, forks, language, licence, creation date |
   | `contributors.json` | All-time contributor list, company affiliations, retention by year and quarter |
   | `commits.json` | Yearly and quarterly commit counts, committer details |
   | `issues.json` | Open/closed counts, monthly and yearly breakdowns, median resolution time |
   | `pull_requests.json` | Monthly and yearly PR counts, merge time metrics |
   | `releases.json` | Full release history, cadence metrics |
   | `cve.json` | CVE counts by month and year from GitHub Advisory Database or Security Advisories |
   | `adopters.json` | Known project adopters scraped from the project's adopters file |

4. Per-project checkpoint state is saved to `data/<project-name>/_state.json` so subsequent runs only re-fetch changed data.

**How long does it take?**

- **First run**: 15–40 minutes depending on project age and size (git history cloning is the bottleneck).
- **Subsequent runs**: 2–5 minutes (git mirrors and user profile cache are reused).

---

## 8. Start the Backend API

The backend is a Java Spring Boot application that reads the JSON files in `data/` and exposes them as a REST API.

Open a **new terminal** (keep the extraction terminal open if it is still running) and run:

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

## 9. Start the Frontend

Open a **third terminal** and run:

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

> The frontend proxies API requests to `http://localhost:8080`, so both the backend (step 8) and the frontend (this step) must be running at the same time.

---

## 10. Adding a New Project

You can add a project directly from the dashboard UI:

1. On the overview page, click **"Add project"**.
2. Paste the GitHub URL (e.g. `https://github.com/owner/repo`).
3. Fill in the foundation name and any optional fields.
4. Click **Save**. The backend registers the project and triggers a data extraction automatically using the GitHub token stored in the dashboard settings.

Alternatively, to add a project manually:

1. Add an entry to `data/projects.json`.
2. Re-run `python3 extract_github_data.py` from the `scripts/` directory.
3. Restart the backend.

---

## 11. Refreshing Data

To pull fresh data for all projects:

```bash
cd scripts
source .venv/bin/activate
python3 extract_github_data.py
```

Or use the **"Refresh all"** button on the overview page of the dashboard (requires the GitHub token to be saved in the dashboard settings).

---

## 12. Project Structure

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
├── scripts/                       # Python data extraction
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

## 13. Tracked Projects

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

## 14. Troubleshooting

### "brew: command not found"
Homebrew is not installed or not on your PATH. Follow [step 2a](#2a-homebrew-macos-only) above.

### "java: command not found" or wrong Java version
Run `brew install openjdk@17` and follow the `sudo ln` and `export PATH` steps in [step 2d](#2d-java-17-jdk).

### "mvn: command not found"
Run `brew install maven`.

### "python3: command not found"
Run `brew install python3`.

### "pip install" fails with permission errors
Never use `sudo pip`. Use a virtual environment instead:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### "Authentication failed: Bad credentials"
- Check that your token is correct in `config.yaml` (no extra spaces or missing quotes).
- Make sure the token has not expired — check at https://github.com/settings/tokens.
- Verify the three required scopes (`public_repo`, `read:org`, `read:user`) are selected.

### "Rate limit exceeded"
- GitHub allows 5,000 API requests per hour with a token. Large projects can approach this limit.
- Wait one hour and re-run. The checkpoint state means the script resumes where it left off.
- Alternatively, create a second GitHub token and swap it into `config.yaml`.

### "Module not found" (Python)
Your virtual environment is not active. Run:
```bash
cd scripts
source .venv/bin/activate
python3 extract_github_data.py
```

### Backend starts but the dashboard shows no data
- Make sure the extraction script completed successfully and `data/` contains project folders.
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

### First data extraction is very slow
This is expected. The script clones full git histories for each project as local mirrors in `.cache/repos/`. Apache Camel's history alone is several hundred MB. Subsequent runs reuse these mirrors and complete much faster.
