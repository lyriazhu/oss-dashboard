# 🚀 Contributor Quickstart Guide

**Welcome!** This guide is designed for new contributors who are also new to GitHub. We'll walk you through everything step-by-step.

## 📋 What You'll Need

- A computer (Mac, Windows, or Linux)
- Internet connection
- A GitHub account (we'll help you create one!)
- VS Code (we'll help you install it!)

---

## Part 1: Setting Up Your Tools (First Time Only)

### Step 1: Create a GitHub Account

If you don't have a GitHub account yet:

1. Go to https://github.com/signup
2. Enter your email address
3. Create a password
4. Choose a username (this will be your identity on GitHub!)
5. Verify your account (check your email)
6. Complete the setup wizard

**Tip**: Choose a professional username - it will be visible on all your contributions!

### Step 2: Install Git

Git is the tool that tracks changes to code.

**Mac:**
```bash
# Open Terminal (Cmd+Space, type "Terminal")
# Install Homebrew first (if you don't have it)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Git
brew install git
```

**Windows:**
1. Download Git from: https://git-scm.com/download/win
2. Run the installer
3. Use default settings (just keep clicking "Next")

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install git

# Fedora
sudo dnf install git
```

**Verify installation:**
```bash
git --version
# Should show something like: git version 2.x.x
```

### Step 3: Configure Git

Tell Git who you are:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Use the same email you used for GitHub!

### Step 4: Install VS Code

VS Code is a code editor that makes working with code easy.

1. Go to: https://code.visualstudio.com/
2. Download for your operating system
3. Install it (use default settings)
4. Open VS Code

### Step 5: Install Python

This project uses Python for data extraction.

**Mac:**
```bash
brew install python3
```

**Windows:**
1. Go to: https://www.python.org/downloads/
2. Download Python 3.11 or higher
3. Run installer
4. ✅ **IMPORTANT**: Check "Add Python to PATH"
5. Click "Install Now"

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install python3 python3-pip

# Fedora
sudo dnf install python3 python3-pip
```

**Verify installation:**
```bash
python3 --version
# Should show: Python 3.x.x
```

---

## Part 2: Getting the Project Code

### Step 1: Get Access to the Repository

1. Ask the project maintainer to add you as a collaborator
2. You'll receive an email invitation
3. Click the link in the email to accept
4. You now have access to the private repository!

### Step 2: Clone the Repository

"Cloning" means downloading a copy of the project to your computer.

1. **Get the repository URL:**
   - Go to the repository on GitHub
   - Click the green **"Code"** button
   - Copy the HTTPS URL (looks like: `https://github.com/lyriazhu/oss-dashboard.git`)

2. **Open Terminal/Command Prompt:**
   - **Mac**: Cmd+Space, type "Terminal"
   - **Windows**: Win+R, type "cmd"
   - **Linux**: Ctrl+Alt+T

3. **Navigate to where you want the project:**
   ```bash
   cd Desktop
   # This puts the project on your Desktop
   ```

4. **Clone the repository:**
   ```bash
   git clone https://github.com/lyriazhu/oss-dashboard.git
   cd oss-dashboard
   ```

5. **When prompted for credentials:**
   - Username: Your GitHub username
   - Password: Use a Personal Access Token (see below)

### Step 3: Create a Personal Access Token (PAT)

GitHub doesn't accept passwords anymore. You need a token:

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name it: `Git Operations`
4. Expiration: Choose `90 days`
5. Select scopes:
   - ✅ `repo` (Full control of private repositories)
6. Click **"Generate token"**
7. **COPY THE TOKEN** (starts with `ghp_`)
8. Save it somewhere safe (you'll need it for git operations)

**Use this token as your password when git asks for credentials!**

### Step 4: Open the Project in VS Code

```bash
# From the oss-dashboard directory
code .
```

Or manually:
1. Open VS Code
2. File → Open Folder
3. Select the `oss-dashboard` folder
4. Click Open

---

## Part 3: Setting Up the Project

### Step 1: Get Your GitHub API Token

This is different from your PAT - this one is for accessing GitHub's data API.

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name it: `OSS Dashboard Data`
4. Expiration: `90 days`
5. Select scopes:
   - ✅ `public_repo`
   - ✅ `read:org`
   - ✅ `read:user`
6. Click **"Generate token"**
7. **COPY THE TOKEN**

### Step 2: Add Your Token to Config

1. In VS Code, open: `scripts/config.yaml`
2. Find the line: `token: "YOUR_GITHUB_TOKEN_HERE"`
3. Replace with your token: `token: "ghp_xxxxxxxxxxxx"`
4. Save the file (Cmd+S or Ctrl+S)

**⚠️ IMPORTANT**: Never share this token or commit it to git!

### Step 3: Install Python Dependencies

Open VS Code's integrated terminal:
- Terminal → New Terminal (or Ctrl+`)

Run these commands:

```bash
cd scripts
python3 -m pip install -r requirements.txt
```

Wait for installation to complete (2-3 minutes).

### Step 4: Test the Setup

Run the data extraction script:

```bash
python3 extract_github_data.py
```

You should see:
- ✅ Authentication successful
- Progress bars for each project
- Data being saved to `data/` folder
- Faster reruns after the first extraction because caches and checkpoints are reused

**This takes 5-10 minutes on the first run** - be patient!

### Step 5: Start the Backend API

After data extraction succeeds, start the Java backend:

```bash
cd ../backend
mvn spring-boot:run
```

Then open:
- `http://localhost:8080/api/projects`
- `http://localhost:8080/api/projects/strimzi/metrics`

This backend reads the JSON files generated by the Python extractor.

---

## Part 4: Making Your First Contribution

### Understanding the Workflow

1. **Create a branch** - Your own workspace for changes
2. **Make changes** - Edit files, add features, fix bugs
3. **Commit changes** - Save your work with a message
4. **Push to GitHub** - Upload your changes
5. **Create Pull Request** - Ask to merge your changes
6. **Code Review** - Team reviews your changes
7. **Merge** - Your changes become part of the project!

### Step 1: Create a Branch

Always create a new branch for your work:

```bash
# Make sure you're on main branch
git checkout main

# Get latest changes
git pull origin main

# Create your branch
git checkout -b feature/my-first-contribution
```

**Branch naming conventions:**
- `feature/` - New features (e.g., `feature/add-gitlab-support`)
- `fix/` - Bug fixes (e.g., `fix/rate-limit-error`)
- `docs/` - Documentation (e.g., `docs/update-readme`)

### Step 2: Make Your Changes

Edit files in VS Code. For example:
- Fix a typo in README.md
- Add a new project to `data/projects.json`
- Improve documentation

### Step 3: Check What Changed

```bash
# See which files you changed
git status

# See the actual changes
git diff
```

### Step 4: Stage Your Changes

"Staging" means selecting which changes to save:

```bash
# Stage all changes
git add .

# Or stage specific files
git add README.md
git add scripts/config.yaml
```

### Step 5: Commit Your Changes

A commit is like a save point with a message:

```bash
git commit -m "docs: fix typo in README"
```

**Good commit messages:**
- `feat: add support for GitLab projects`
- `fix: resolve rate limiting issue`
- `docs: update setup guide with screenshots`
- `refactor: simplify data extraction logic`

**Bad commit messages:**
- `update`
- `changes`
- `fix stuff`

### Step 6: Push to GitHub

Upload your branch to GitHub:

```bash
git push origin feature/my-first-contribution
```

You'll need to enter:
- Username: Your GitHub username
- Password: Your Personal Access Token (PAT)

### Step 7: Create a Pull Request

1. Go to the repository on GitHub
2. You'll see a banner: **"Compare & pull request"** - click it
3. Fill in the PR form:
   - **Title**: Clear description (e.g., "Add GitLab support")
   - **Description**: 
     - What changes you made
     - Why you made them
     - How to test them
4. Click **"Create pull request"**

### Step 8: Respond to Review Feedback

A maintainer will review your PR and may:
- ✅ Approve it (yay!)
- 💬 Ask questions
- 🔧 Request changes

**If changes are requested:**

1. Make the changes in your local branch
2. Commit them:
   ```bash
   git add .
   git commit -m "address review feedback"
   ```
3. Push again:
   ```bash
   git push origin feature/my-first-contribution
   ```
4. The PR automatically updates!

### Step 9: After Your PR is Merged

Celebrate! 🎉 Then clean up:

```bash
# Switch back to main
git checkout main

# Get the latest (including your merged changes!)
git pull origin main

# Delete your local branch (optional)
git branch -d feature/my-first-contribution
```

---

## Part 5: Common Git Commands

### Daily Workflow

```bash
# Start your day - get latest changes
git checkout main
git pull origin main

# Create a new branch for your work
git checkout -b feature/my-feature

# Check what you changed
git status
git diff

# Save your changes
git add .
git commit -m "description of changes"

# Upload to GitHub
git push origin feature/my-feature

# Switch between branches
git checkout main
git checkout feature/my-feature

# See all branches
git branch
```

### Fixing Mistakes

```bash
# Undo changes to a file (before staging)
git checkout -- filename.txt

# Unstage a file (after git add)
git reset HEAD filename.txt

# Undo last commit (keeps changes)
git reset --soft HEAD~1

# See commit history
git log
git log --oneline
```

### Keeping Your Branch Updated

```bash
# Get latest changes from main
git checkout main
git pull origin main

# Go back to your branch
git checkout feature/my-feature

# Merge main into your branch
git merge main

# Or rebase (cleaner history)
git rebase main
```

---

## Part 6: Project-Specific Guidelines

### Code Style

**Python:**
- Use 4 spaces for indentation
- Follow PEP 8 style guide
- Add docstrings to functions
- Use meaningful variable names

**JavaScript/React:**
- Use 2 spaces for indentation
- Use functional components
- Add PropTypes or TypeScript types

**Markdown:**
- Use clear headings
- Add code blocks with language tags
- Include examples

### Testing Your Changes

Before submitting a PR:

1. **Run the data extraction script if your change affects extracted data:**
   ```bash
   cd scripts
   python3 extract_github_data.py
   ```

2. **Check for errors:**
   - No Python errors
   - Data files created successfully
   - Progress bars work correctly
   - Incremental reruns still behave correctly if your change touched extraction logic

3. **Test the backend if your change affects API models or responses:**
   ```bash
   cd backend
   mvn spring-boot:run
   ```

4. **Verify key endpoints:**
   - `http://localhost:8080/api/projects`
   - `http://localhost:8080/api/projects/strimzi/metrics`
   - `http://localhost:8080/api/projects/strimzi/contributors`

5. **Test the frontend (when available):**
   ```bash
   cd frontend
   npm install
   npm start
   ```

### Adding New Projects

To add a new open-source project to track:

1. Edit `data/projects.json`:
   ```json
   {
     "id": "project-name",
     "name": "Project Name",
     "github_org": "organization",
     "github_repo": "repository",
     "description": "Brief description",
     "category": "category-name"
   }
   ```

2. Run the extraction script:
   ```bash
   cd scripts
   python3 extract_github_data.py
   ```

3. Verify data was extracted in `data/project-name/`

4. Commit and create a PR!

---

## Part 7: Getting Help

### Documentation

- **README.md** - Project overview and local workflow
- **QUICK_START.md** - Fastest path to extracting data and starting the backend
- **backend/README.md** - Backend API usage and endpoint examples
- **backend/SETUP_JAVA_MAVEN.md** - Java/Maven installation and backend startup
- **SETUP_GUIDE.md** - Detailed setup instructions
- **CONTRIBUTING.md** - Full contribution guidelines
- **GITHUB_SETUP.md** - GitHub repository setup

### Common Issues

**"Permission denied" when pushing:**
- Use your Personal Access Token (PAT), not your password
- Verify you have Write access to the repository

**"Module not found" error:**
```bash
cd scripts
python3 -m pip install -r requirements.txt
```

**"Authentication failed":**
- Check your token in `scripts/config.yaml`
- Make sure it has the correct scopes

**"Rate limit exceeded":**
- Wait 1 hour for your rate limit to reset
- Or create a new GitHub token

**"`python` command not found":**
- Use `python3` instead of `python`

**"Backend runs but data is outdated":**
- Rerun `python3 extract_github_data.py`
- Confirm files under `data/` were refreshed
- If needed, inspect per-project `_state.json` files used for incremental extraction

**Git conflicts:**
```bash
# Update your branch with latest main
git checkout main
git pull origin main
git checkout feature/your-branch
git merge main
# Resolve conflicts in VS Code
git add .
git commit -m "resolve merge conflicts"
```

### Where to Ask Questions

1. **GitHub Issues** - For bugs and feature requests
2. **GitHub Discussions** - For general questions
3. **Pull Request Comments** - For questions about your PR
4. **Project Maintainers** - Direct message for private questions

---

## Part 8: Best Practices

### Do's ✅

- **Read existing code** before making changes
- **Ask questions** if you're unsure
- **Test your changes** before submitting
- **Write clear commit messages**
- **Keep PRs focused** - one feature/fix per PR
- **Update documentation** when you change functionality
- **Be patient** - reviews take time
- **Be respectful** - everyone is learning

### Don'ts ❌

- **Don't commit secrets** (tokens, passwords, API keys)
- **Don't push directly to main** - always use branches
- **Don't make huge PRs** - break them into smaller ones
- **Don't ignore review feedback**
- **Don't force push** to shared branches
- **Don't commit generated files** (unless necessary)

### Security

- **Never commit** `scripts/config.yaml` with your token
- **Use `.gitignore`** to exclude sensitive files
- **Rotate tokens** every 90 days
- **Enable 2FA** on your GitHub account
- **Report security issues** privately to maintainers

---

## Part 9: Quick Reference

### Git Cheat Sheet

```bash
# Setup
git clone <url>                    # Download repository
git config --global user.name      # Set your name
git config --global user.email     # Set your email

# Daily workflow
git status                         # Check what changed
git add .                          # Stage all changes
git commit -m "message"            # Save changes
git push origin branch-name        # Upload to GitHub
git pull origin main               # Download latest changes

# Branching
git branch                         # List branches
git checkout -b new-branch         # Create and switch to branch
git checkout branch-name           # Switch to existing branch
git branch -d branch-name          # Delete branch

# Viewing
git log                            # See commit history
git diff                           # See changes
git show commit-hash               # See specific commit

# Undoing
git checkout -- file               # Discard changes to file
git reset HEAD file                # Unstage file
git reset --soft HEAD~1            # Undo last commit
```

### VS Code Shortcuts

**Mac:**
- `Cmd+S` - Save file
- `Cmd+P` - Quick open file
- `Cmd+Shift+P` - Command palette
- `Cmd+`` - Toggle terminal
- `Cmd+/` - Toggle comment

**Windows/Linux:**
- `Ctrl+S` - Save file
- `Ctrl+P` - Quick open file
- `Ctrl+Shift+P` - Command palette
- `Ctrl+`` - Toggle terminal
- `Ctrl+/` - Toggle comment

---

## Part 10: Your First Week

### Day 1: Setup
- ✅ Install tools (Git, VS Code, Python)
- ✅ Clone repository
- ✅ Run data extraction script
- ✅ Explore the codebase

### Day 2: Learn
- ✅ Read all documentation
- ✅ Understand project structure
- ✅ Look at existing issues
- ✅ Review recent pull requests

### Day 3: Small Fix
- ✅ Find a typo or small bug
- ✅ Create a branch
- ✅ Fix it
- ✅ Submit your first PR!

### Day 4-5: Bigger Contribution
- ✅ Pick a "good first issue"
- ✅ Ask questions if needed
- ✅ Implement the fix/feature
- ✅ Test thoroughly
- ✅ Submit PR

### Week 2+: Regular Contributor
- ✅ Take on more complex issues
- ✅ Help review other PRs
- ✅ Suggest improvements
- ✅ Help new contributors

---

## 🎉 Congratulations!

You're now ready to contribute to the OSS Dashboard project! Remember:

- **Everyone was a beginner once** - don't be afraid to ask questions
- **Small contributions matter** - even fixing typos helps!
- **Learning takes time** - be patient with yourself
- **Community is supportive** - we're here to help you succeed

**Welcome to the team!** 🚀

## Part 11: Safety Measures & Mistake Prevention

### 🛡️ For Team Leaders: Protecting Your Repository

If your team is new to coding, here are essential safety measures to prevent accidental mistakes from affecting the main codebase.

#### 1. Branch Protection Rules (CRITICAL!)

**Why it matters:** Prevents anyone from accidentally pushing broken code directly to the main branch.

**How to set up:**

1. Go to your GitHub repository
2. Click **Settings** (top right)
3. Click **Branches** (left sidebar)
4. Click **Add branch protection rule**
5. Configure these settings:

```
Branch name pattern: main

✅ Require a pull request before merging
   ✅ Require approvals: 1 (or 2 for extra safety)
   ✅ Dismiss stale pull request approvals when new commits are pushed
   
✅ Require status checks to pass before merging
   (Enable this if you have automated tests)
   
✅ Require conversation resolution before merging
   (All comments must be resolved)
   
✅ Require linear history
   (Keeps git history clean)
   
✅ Include administrators
   (Rules apply to everyone, even you!)
   
✅ Do not allow bypassing the above settings
```

6. Click **Create** or **Save changes**

**What this does:**
- ❌ Nobody can push directly to `main` (including you!)
- ✅ All changes must go through pull requests
- ✅ Changes must be reviewed and approved
- ✅ You can catch mistakes before they affect the main branch

#### 2. The Pull Request Workflow (Required!)

With branch protection enabled, here's the new workflow:

```
1. Create feature branch → 2. Make changes → 3. Push branch → 4. Create PR → 5. Review → 6. Merge
```

**For contributors:**
```bash
# Create your branch
git checkout -b feature/my-changes

# Make changes and commit
git add .
git commit -m "description"

# Push your branch (NOT to main!)
git push origin feature/my-changes

# Then create a Pull Request on GitHub
```

**For reviewers (you):**
1. Go to the repository on GitHub
2. Click **Pull requests** tab
3. Review the changes
4. Leave comments or request changes
5. Once satisfied, click **Approve** and **Merge**

#### 3. Restoring to Earlier Versions

**Good news:** Git saves everything! You can always go back.

**Method 1: Revert a Specific Commit (Safest)**

This creates a new commit that undoes the bad changes:

```bash
# View commit history
git log --oneline

# Find the bad commit hash (e.g., abc1234)
# Revert it
git revert abc1234

# Push the revert
git push origin main
```

**Method 2: Reset to a Previous Commit (Use with Caution)**

This goes back in time and erases newer commits:

```bash
# View commit history
git log --oneline

# Find the good commit hash (e.g., xyz5678)
# Reset to it
git reset --hard xyz5678

# Force push (only if you're sure!)
git push --force origin main
```

⚠️ **Warning:** `git push --force` can cause problems if others have pulled the bad commits. Use `git revert` instead when possible.

**Method 3: Use GitHub's Web Interface**

1. Go to your repository on GitHub
2. Click **Commits** (above the file list)
3. Find the commit you want to revert
4. Click the `<>` button to browse files at that commit
5. Or click the commit, then click **Revert** button

#### 4. Create a CODEOWNERS File

This automatically requests your review on all pull requests.

**Create `.github/CODEOWNERS`:**

```bash
# In your repository root
mkdir -p .github
```

**Add this content:**

```
# Global owners - require approval from these people for ALL changes
* @your-github-username

# Critical files - extra protection
/scripts/config.yaml @your-github-username @backup-reviewer
/data/projects.json @your-github-username
/.github/workflows/ @your-github-username

# Documentation - can be more relaxed
*.md @your-github-username @doc-team-member
```

Replace `@your-github-username` with your actual GitHub username.

**Commit and push:**
```bash
git add .github/CODEOWNERS
git commit -m "chore: add CODEOWNERS file for code review requirements"
git push origin main
```

#### 5. Set Up Automated Checks (Optional but Recommended)

Create `.github/workflows/pr-checks.yml`:

```yaml
name: Pull Request Checks
on: [pull_request]

jobs:
  validate-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Check Python syntax
        run: |
          cd scripts
          python3 -m py_compile *.py
      
      - name: Install dependencies
        run: |
          cd scripts
          pip install -r requirements.txt
      
      - name: Run basic tests
        run: |
          cd scripts
          python3 -c "import yaml; yaml.safe_load(open('config.yaml.example'))"

  validate-json:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Validate JSON files
        run: |
          for file in data/*.json; do
            if [ -f "$file" ]; then
              python3 -m json.tool "$file" > /dev/null
            fi
          done
```

This automatically checks for syntax errors before allowing merges.

#### 6. Regular Backups

**Create periodic snapshots:**

```bash
# Create a tag for important milestones
git tag -a v1.0 -m "Stable version 1.0 - data extraction working"
git push origin v1.0

# Later, you can always return to this version
git checkout v1.0
```

**Clone a backup copy:**

```bash
# On your local machine or another location
git clone --mirror https://github.com/your-username/oss-dashboard.git oss-dashboard-backup.git
```

#### 7. Team Guidelines to Prevent Mistakes

**Add these rules to your team documentation:**

**✅ DO:**
- Always work in feature branches
- Create pull requests for all changes
- Test changes locally before pushing
- Ask questions when unsure
- Read error messages carefully
- Keep commits small and focused

**❌ DON'T:**
- Never push directly to `main`
- Never use `git push --force` without asking
- Never commit secrets (tokens, passwords)
- Never commit large binary files
- Never delete branches others are using
- Never ignore failing tests

#### 8. Emergency Recovery Procedures

**If someone accidentally pushes bad code:**

1. **Stay calm** - Git can fix almost anything
2. **Identify the problem:**
   ```bash
   git log --oneline
   # Find the bad commit
   ```
3. **Revert the commit:**
   ```bash
   git revert <bad-commit-hash>
   git push origin main
   ```
4. **Communicate with the team:**
   - Let them know what happened
   - Explain what was fixed
   - Use it as a learning opportunity

**If someone accidentally deletes important files:**

```bash
# Files are never truly deleted in Git!
# Find the commit before deletion
git log --all --full-history -- path/to/deleted/file

# Restore the file
git checkout <commit-hash> -- path/to/deleted/file
git commit -m "restore: recover accidentally deleted file"
git push origin main
```

**If the repository is completely broken:**

```bash
# Clone a fresh copy
git clone https://github.com/your-username/oss-dashboard.git oss-dashboard-fresh

# Or reset to last known good state
git reset --hard origin/main
```

#### 9. Monitoring and Alerts

**Set up GitHub notifications:**

1. Go to repository → **Watch** (top right)
2. Select **All Activity**
3. You'll get emails for:
   - New pull requests
   - Comments on PRs
   - Pushes to branches
   - Issues created

**Review activity regularly:**
- Check the **Insights** → **Network** graph
- Review **Commits** page weekly
- Monitor **Pull requests** tab daily

#### 10. Training Your Team

**Before giving access:**

1. Have them read this entire guide
2. Walk through creating a test branch together
3. Practice the PR workflow with a small change
4. Show them how to undo mistakes
5. Give them a "cheat sheet" of safe commands

**Safe commands for beginners:**
```bash
git status              # Check what changed (always safe)
git log                 # View history (always safe)
git diff                # See changes (always safe)
git checkout -b branch  # Create new branch (safe)
git add .               # Stage changes (safe)
git commit -m "msg"     # Save changes (safe)
git push origin branch  # Push to feature branch (safe)
```

**Commands to avoid until experienced:**
```bash
git push --force        # Can overwrite others' work
git reset --hard        # Can lose uncommitted changes
git rebase              # Can create conflicts
git push origin main    # Blocked by branch protection anyway
```

### 🎓 Learning from Mistakes

Remember: Mistakes are learning opportunities!

**When someone makes a mistake:**
1. ✅ Fix it together
2. ✅ Explain what happened
3. ✅ Show how to prevent it next time
4. ✅ Update documentation if needed
5. ❌ Don't blame or criticize

**Common beginner mistakes and fixes:**

| Mistake | How to Fix | Prevention |
|---------|-----------|------------|
| Pushed to wrong branch | `git revert` the commit | Always check `git status` first |
| Committed secrets | Remove from history, rotate secrets | Use `.gitignore`, environment variables |
| Merge conflicts | Resolve in VS Code, commit | Pull latest changes before starting work |
| Lost uncommitted changes | Use `git reflog` to recover | Commit frequently |
| Deleted important file | `git checkout` to restore | Use branch protection |

---

---

## Additional Resources

### Learning Git & GitHub
- [GitHub Skills](https://skills.github.com/) - Interactive tutorials
- [Git Handbook](https://guides.github.com/introduction/git-handbook/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)

### Learning Python
- [Python.org Tutorial](https://docs.python.org/3/tutorial/)
- [Real Python](https://realpython.com/)
- [Python for Beginners](https://www.python.org/about/gettingstarted/)

### Learning React (for frontend)
- [React Tutorial](https://react.dev/learn)
- [React for Beginners](https://reactforbeginners.com/)

### Learning Spring Boot (for backend)
- [Spring Boot Guide](https://spring.io/guides/gs/spring-boot/)
- [Baeldung Spring Tutorials](https://www.baeldung.com/spring-boot)

---

**Questions?** Open an issue or ask in discussions. We're happy to help! 💙