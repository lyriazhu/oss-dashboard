# 🚀 How to Push Your Code to GitHub

Your repository is ready to push! Follow these steps:

## Quick Push Instructions

You need to authenticate with GitHub. Here are your options:

### Option 1: Use GitHub CLI (Easiest - Recommended)

If you have GitHub CLI installed:

```bash
# Login to GitHub (one-time setup)
gh auth login

# Push your code
git push -u origin main
```

### Option 2: Use Personal Access Token

1. **Create a Personal Access Token**:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name: `Git Push Token`
   - Select scope: ✅ `repo` (full control of private repositories)
   - Click "Generate token"
   - **Copy the token** (starts with `ghp_`)

2. **Push with token**:
   ```bash
   git push -u origin main
   ```
   
   When prompted:
   - **Username**: `lyriazhu`
   - **Password**: Paste your token (not your GitHub password!)

### Option 3: Use SSH (Most Secure)

1. **Check if you have SSH keys**:
   ```bash
   ls -la ~/.ssh
   ```

2. **If no SSH key exists, create one**:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # Press Enter to accept default location
   # Press Enter twice for no passphrase (or set one)
   ```

3. **Add SSH key to GitHub**:
   ```bash
   # Copy your public key
   cat ~/.ssh/id_ed25519.pub
   ```
   
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Title: `MacBook` (or whatever you want)
   - Paste the key
   - Click "Add SSH key"

4. **Change remote to SSH**:
   ```bash
   git remote set-url origin git@github.com:lyriazhu/oss-dashboard.git
   ```

5. **Push**:
   ```bash
   git push -u origin main
   ```

## After Successful Push

Once you've pushed successfully, you can:

1. **View your repository**: https://github.com/lyriazhu/oss-dashboard

2. **Add contributors**:
   - Go to: https://github.com/lyriazhu/oss-dashboard/settings/access
   - Click "Add people"
   - Enter their GitHub username
   - Choose permission level:
     - **Write**: Can push code and create branches
     - **Maintain**: Can manage issues and PRs
     - **Admin**: Full access

3. **Set up branch protection** (recommended):
   - Go to: https://github.com/lyriazhu/oss-dashboard/settings/branches
   - Click "Add branch protection rule"
   - Branch name: `main`
   - Enable: "Require a pull request before merging"
   - Enable: "Require approvals" (set to 1)

## Troubleshooting

### "Authentication failed"
- Make sure you're using a Personal Access Token, not your password
- Verify the token has `repo` scope

### "Permission denied (publickey)"
- Your SSH key isn't set up correctly
- Use Option 1 or 2 instead

### "Repository not found"
- Verify the repository exists: https://github.com/lyriazhu/oss-dashboard
- Check you're logged into the correct GitHub account

## Quick Reference

```bash
# Check current remote
git remote -v

# Check what will be pushed
git log origin/main..main

# Push to GitHub
git push -u origin main

# Pull latest changes (after push)
git pull origin main
```

---

**Need help?** The easiest method is Option 1 (GitHub CLI). Install it with:
```bash
brew install gh  # On macOS