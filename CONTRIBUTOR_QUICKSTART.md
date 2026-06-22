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
   - Copy the HTTPS URL (looks like: `https://github.com/username/oss-dashboard.git`)

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
   git clone https://github.com/USERNAME/oss-dashboard.git
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
pip3 install -r requirements.txt
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

**This takes 5-10 minutes** - be patient!

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

1. **Run the data extraction script:**
   ```bash
   cd scripts
   python3 extract_github_data.py
   ```

2. **Check for errors:**
   - No Python errors
   - Data files created successfully
   - Progress bars work correctly

3. **Test the frontend (when available):**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Test the backend (when available):**
   ```bash
   cd backend
   ./mvnw spring-boot:run
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

- **README.md** - Project overview
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
pip3 install -r requirements.txt
```

**"Authentication failed":**
- Check your token in `scripts/config.yaml`
- Make sure it has the correct scopes

**"Rate limit exceeded":**
- Wait 1 hour for your rate limit to reset
- Or create a new GitHub token

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