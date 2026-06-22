# 🔑 How to Get Your GitHub Personal Access Token

## What is a GitHub Token?

A GitHub token is like a password that lets programs (like our data extraction script) access GitHub's data on your behalf. It's safer than using your actual password because:
- You can delete it anytime
- It only has the permissions you give it
- GitHub can track what it's used for

## Step-by-Step Instructions (With Screenshots Guide)

### Step 1: Go to GitHub Settings

1. Open your web browser
2. Go to: **https://github.com/settings/tokens**
3. Or manually:
   - Go to GitHub.com
   - Click your profile picture (top right)
   - Click **Settings**
   - Scroll down on the left sidebar
   - Click **Developer settings** (at the very bottom)
   - Click **Personal access tokens**
   - Click **Tokens (classic)**

### Step 2: Generate New Token

1. Click the green **"Generate new token"** button (top right)
2. Click **"Generate new token (classic)"**
   - Don't use "Fine-grained tokens" - they're more complicated

### Step 3: Fill Out the Form

**Note (Name):**
- Type: `OSS Dashboard`
- This is just so you remember what it's for

**Expiration:**
- Choose: `90 days`
- After 90 days, you'll need to create a new one (takes 2 minutes)
- You can choose longer if you want

**Select scopes (IMPORTANT!):**

Check these **3 boxes** only:

✅ **repo** section:
   - Check `public_repo` - Access public repositories

✅ **admin:org** section:
   - Check `read:org` - Read organization data

✅ **user** section:
   - Check `read:user` - Read user profile data

**Don't check anything else!** These 3 are all you need.

### Step 4: Generate and Copy Token

1. Scroll to the bottom
2. Click the green **"Generate token"** button
3. You'll see a page with your new token
4. It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
5. **Click the copy button** (📋 icon) next to the token
6. **IMPORTANT**: You can only see this token ONCE!
   - If you close the page, you can't see it again
   - You'll have to create a new one

### Step 5: Save Your Token

**Option 1: Add to config.yaml (Recommended)**

1. Open VS Code
2. Open the file: `oss-dashboard/scripts/config.yaml`
3. Find this line:
   ```yaml
   token: "YOUR_GITHUB_TOKEN_HERE"
   ```
4. Replace `YOUR_GITHUB_TOKEN_HERE` with your actual token:
   ```yaml
   token: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```
5. Save the file (Cmd+S or Ctrl+S)

**Option 2: Save in a text file (Backup)**

1. Open TextEdit (Mac) or Notepad (Windows)
2. Paste your token
3. Save as: `github-token-backup.txt`
4. Keep it somewhere safe (like your Documents folder)
5. **Don't share this file with anyone!**

## ✅ Verify Your Token Works

After adding your token to `config.yaml`, test it:

```bash
cd scripts
python extract_github_data.py
```

If it works, you'll see:
```
✅ Authenticated as: your-github-username
📊 Rate limit: 5000 requests remaining
```

If it doesn't work, you'll see:
```
❌ Authentication failed: Bad credentials
```

## 🔒 Security Tips

**DO:**
- ✅ Keep your token secret (like a password)
- ✅ Add `config.yaml` to `.gitignore` (already done!)
- ✅ Delete old tokens you're not using
- ✅ Create a new token if you think it was exposed

**DON'T:**
- ❌ Share your token with anyone
- ❌ Post it on Slack, email, or GitHub
- ❌ Commit it to Git (config.yaml is in .gitignore)
- ❌ Use the same token for multiple projects

## 🔄 What If I Lose My Token?

No problem! Just create a new one:

1. Go back to: https://github.com/settings/tokens
2. Click **"Generate new token"**
3. Follow the same steps above
4. Replace the old token in `config.yaml` with the new one

## ⏰ What Happens After 90 Days?

Your token will expire and stop working. When that happens:

1. You'll see an error: `Bad credentials`
2. Go to: https://github.com/settings/tokens
3. Delete the old expired token
4. Create a new one (same steps as above)
5. Update `config.yaml` with the new token

## 🆘 Troubleshooting

### "I can't find the token page"

Direct link: https://github.com/settings/tokens

### "I closed the page before copying the token"

No worries! Just:
1. Delete the token you just created
2. Create a new one
3. This time, copy it before closing the page

### "The token doesn't work"

Check that you:
1. Copied the entire token (starts with `ghp_`)
2. Selected the 3 required scopes
3. Pasted it correctly in `config.yaml` (inside the quotes)
4. Saved the file after editing

### "I accidentally committed my token to Git"

1. **Immediately** go to: https://github.com/settings/tokens
2. Delete that token
3. Create a new one
4. Never commit `config.yaml` to Git (it's in `.gitignore`)

## 📊 Rate Limits

With a token, you can make:
- **5,000 requests per hour** (plenty for our needs!)

Without a token:
- Only 60 requests per hour (not enough)

Our script uses about 100-200 requests per project, so a token is essential.

---

**Next Step**: Once you have your token in `config.yaml`, run the data extraction script!