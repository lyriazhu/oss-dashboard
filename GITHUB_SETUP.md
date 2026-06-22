# 🚀 GitHub Setup Guide for Private Repository

This guide will walk you through setting up your private GitHub repository and adding contributors.

## Step 1: Create a Private GitHub Repository

### Option A: Using GitHub Web Interface (Recommended)

1. **Go to GitHub**: Open https://github.com/new in your browser

2. **Fill in repository details**:
   - **Repository name**: `oss-dashboard`
   - **Description**: `Enterprise-grade dashboard to monitor contributor activity and project health metrics across open-source projects`
   - **Visibility**: Select **Private** ⚠️ (Important!)
   - **Initialize repository**: 
     - ❌ Do NOT check "Add a README file"
     - ❌ Do NOT add .gitignore
     - ❌ Do NOT choose a license
     - (We already have these files locally)

3. **Click "Create repository"**

4. **Copy the repository URL** that appears (it will look like):
   ```
   https://github.com/YOUR-USERNAME/oss-dashboard.git
   ```

### Option B: Using GitHub CLI (Alternative)

If you have GitHub CLI installed:

```bash
gh repo create oss-dashboard --private --source=. --remote=origin
```

## Step 2: Connect Your Local Repository to GitHub

In your terminal (in the oss-dashboard directory), run:

```bash
# Add the remote repository (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/oss-dashboard.git

# Verify the remote was added
git remote -v

# Push your code to GitHub
git push -u origin main
```

**If you get an error about authentication:**
- GitHub no longer accepts passwords for git operations
- You need to use a Personal Access Token (PAT) or SSH key

**To use a Personal Access Token:**
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: `Git Operations`
4. Select scopes: `repo` (full control of private repositories)
5. Click "Generate token"
6. Copy the token
7. When prompted for password during `git push`, paste the token instead

## Step 3: Verify Your Repository

1. Go to your repository on GitHub: `https://github.com/YOUR-USERNAME/oss-dashboard`
2. You should see:
   - 🔒 **Private** badge
   - All your files (README.md, scripts/, data/, etc.)
   - Your commit message
   - 12 files committed

## Step 4: Add Contributors

### Invite Individual Contributors

1. **Go to your repository** on GitHub
2. Click **Settings** (top right)
3. Click **Collaborators** (left sidebar)
4. Click **Add people**
5. Enter their GitHub username or email
6. Select their permission level:
   - **Read**: Can view and clone the repository
   - **Triage**: Can manage issues and pull requests
   - **Write**: Can push to the repository
   - **Maintain**: Can manage the repository without access to sensitive settings
   - **Admin**: Full access including settings

7. Click **Add [username] to this repository**
8. They'll receive an email invitation

### Recommended Permission Levels

For a private project:
- **Core team members**: Write or Maintain access
- **Reviewers**: Triage access
- **Read-only access**: Read access

### Create a Team (For Organizations)

If this is under a GitHub Organization:

1. Go to your organization page
2. Click **Teams** tab
3. Click **New team**
4. Name it (e.g., "OSS Dashboard Team")
5. Add team members
6. Go to your repository → Settings → Collaborators and teams
7. Add the team with appropriate permissions

## Step 5: Set Up Branch Protection (Recommended)

Protect your main branch to require reviews before merging:

1. Go to **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Branch name pattern: `main`
4. Enable these settings:
   - ✅ **Require a pull request before merging**
     - ✅ Require approvals: 1 (or more)
   - ✅ **Require status checks to pass before merging** (if you have CI/CD)
   - ✅ **Require conversation resolution before merging**
   - ✅ **Include administrators** (applies rules to admins too)
5. Click **Create**

This ensures:
- No one can push directly to main
- All changes go through pull requests
- Changes are reviewed before merging

## Step 6: Configure Repository Settings

### General Settings

1. Go to **Settings** → **General**
2. **Features**: Enable/disable as needed
   - ✅ Issues (for bug tracking)
   - ✅ Projects (for project management)
   - ✅ Discussions (for team communication)
   - ❌ Wiki (optional)
3. **Pull Requests**:
   - ✅ Allow squash merging (keeps history clean)
   - ✅ Automatically delete head branches (cleanup after merge)

### Security Settings

1. Go to **Settings** → **Security**
2. **Secrets and variables** → **Actions**
3. Add your GitHub token as a secret:
   - Name: `GH_TOKEN`
   - Value: Your GitHub Personal Access Token
   - This allows GitHub Actions to run the data refresh workflow

## Step 7: Share Repository Access

### Share with Contributors

Send them:
1. **Repository URL**: `https://github.com/YOUR-USERNAME/oss-dashboard`
2. **Setup instructions**: Point them to `SETUP_GUIDE.md`
3. **Contributing guidelines**: Point them to `CONTRIBUTING.md`

### What Contributors Need to Do

1. **Accept the invitation** (they'll receive an email)
2. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/oss-dashboard.git
   cd oss-dashboard
   ```
3. **Follow the setup guide** to get their environment ready
4. **Create a branch** for their work:
   ```bash
   git checkout -b feature/their-feature-name
   ```
5. **Make changes and push**:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/their-feature-name
   ```
6. **Create a pull request** on GitHub

## Step 8: Set Up GitHub Actions (Optional)

Your repository already has a workflow file (`.github/workflows/data_refresh.yml`).

To enable it:
1. Add the `GH_TOKEN` secret (see Security Settings above)
2. The workflow will run automatically on schedule
3. Check **Actions** tab to see workflow runs

## Quick Reference Commands

```bash
# Clone the repository (for contributors)
git clone https://github.com/YOUR-USERNAME/oss-dashboard.git

# Check remote
git remote -v

# Pull latest changes
git pull origin main

# Create a new branch
git checkout -b feature/my-feature

# Push changes
git add .
git commit -m "My changes"
git push origin feature/my-feature

# Update from main
git checkout main
git pull origin main
git checkout feature/my-feature
git merge main
```

## Troubleshooting

### "Permission denied" when pushing
- Check that you're using a Personal Access Token, not your password
- Verify you have Write access to the repository

### "Repository not found"
- Verify the repository URL is correct
- Check that you have access to the private repository
- Make sure you're logged into the correct GitHub account

### Contributors can't see the repository
- Verify they accepted the invitation
- Check they're logged into the correct GitHub account
- Confirm the repository is shared with them in Settings → Collaborators

## Security Best Practices

1. **Never commit secrets**:
   - GitHub tokens
   - API keys
   - Passwords
   - Use `.gitignore` to exclude `config.yaml`

2. **Use branch protection**:
   - Require pull request reviews
   - Prevent direct pushes to main

3. **Regular access reviews**:
   - Periodically review who has access
   - Remove access for inactive contributors

4. **Enable two-factor authentication**:
   - Require 2FA for all contributors
   - Settings → Security → Two-factor authentication

---

**Next Steps**: Once your repository is set up, contributors can start working on features, bug fixes, and improvements!