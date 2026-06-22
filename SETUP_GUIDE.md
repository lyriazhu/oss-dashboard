# 🚀 Complete Setup Guide

## Step-by-Step Instructions for Getting Started

### Step 1: Open the Project in VS Code

1. Open VS Code
2. Click **File** → **Open Folder**
3. Navigate to your Desktop and select the `oss-dashboard` folder
4. Click **Open**

### Step 2: Get Your GitHub Token

**Why do you need this?**
GitHub limits how many times you can ask for data without a token. A token lets you make 5,000 requests per hour instead of just 60.

**How to get it:**

1. Open your web browser and go to: https://github.com/settings/tokens
2. Click the green **"Generate new token"** button
3. Click **"Generate new token (classic)"**
4. Fill in the form:
   - **Note**: Type `OSS Dashboard` (this is just a name for you to remember)
   - **Expiration**: Choose `90 days` (you can always create a new one later)
   - **Select scopes**: Check these three boxes:
     - ✅ `public_repo`
     - ✅ `read:org`
     - ✅ `read:user`
5. Scroll down and click **"Generate token"**
6. **IMPORTANT**: Copy the token that appears (it looks like `ghp_xxxxxxxxxxxx`)
   - You won't be able to see it again!
   - If you lose it, you'll need to create a new one

### Step 3: Add Your Token to the Config File

1. In VS Code, open the file: `scripts/config.yaml`
2. Find the line that says: `token: "YOUR_GITHUB_TOKEN_HERE"`
3. Replace `YOUR_GITHUB_TOKEN_HERE` with your actual token
4. It should look like: `token: "ghp_xxxxxxxxxxxx"`
5. Save the file (Cmd+S on Mac, Ctrl+S on Windows)

### Step 4: Install Python Dependencies

**What are dependencies?**
These are helper tools (libraries) that the Python script needs to work. Think of them like apps on your phone - you need to install them once before you can use them.

**How to install:**

1. In VS Code, open a new terminal:
   - Click **Terminal** → **New Terminal** (or press Ctrl+`)
2. Type these commands one at a time:

```bash
cd scripts
pip install -r requirements.txt
```

**What this does:**
- `cd scripts` - Goes into the scripts folder
- `pip install -r requirements.txt` - Installs all the required Python libraries

**Wait time:** This takes about 2-3 minutes. You'll see lots of text scrolling by - that's normal!

### Step 5: Run the Data Extraction Script

Now you're ready to extract data from GitHub!

**In the terminal, type:**

```bash
python extract_github_data.py
```

**What will happen:**
1. The script checks your GitHub token ✅
2. It shows you how many API requests you have left
3. It processes each project one by one:
   - Strimzi
   - Apache Camel
   - Apache ActiveMQ
   - Keycloak
   - Apicurio
   - 3scale
4. For each project, it extracts:
   - Basic info (stars, forks, description)
   - Contributors and their companies
   - Commit history
   - Issues
   - Pull requests
   - Releases
5. Progress bars show you how far along it is
6. Data is saved to JSON files in the `data/` folder

**How long does it take?**
- About 5-10 minutes for all 6 projects
- Depends on how big each project is

### Step 6: Check Your Data

After the script finishes, you should see new folders in the `data/` directory:

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

**To view the data:**
1. In VS Code, click on any `.json` file
2. You'll see nicely formatted data about that project

## 🎉 Success!

You've successfully extracted data from GitHub!

### Step 7: Set Up the Backend API (Optional)

The backend API is built with Java and Spring Boot. If you want to run it:

**Prerequisites:**
- Java 17 or higher
- Maven 3.6+

**Installation (macOS):**
```bash
# Install Java and Maven using Homebrew
brew install openjdk@17 maven

# Link Java
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

# Verify installations
java -version
mvn -version
```

**Run the Backend:**
```bash
cd backend
mvn spring-boot:run
```

The API will start on `http://localhost:8080`

**Test the API:**
```bash
# Get all projects
curl http://localhost:8080/api/projects

# Get Strimzi metrics
curl http://localhost:8080/api/projects/strimzi/metrics
```

See [backend/README.md](backend/README.md) for complete API documentation.

### Next Steps

1. ✅ Data extraction complete
2. ✅ Backend API ready (optional)
3. ⏳ Build the frontend dashboard (React)
4. ⏳ Set up automatic data refresh (GitHub Actions)

## ❓ Common Questions

### "I don't have Python installed"

Check if you have Python:
```bash
python --version
```

If you see "command not found", install Python:
- **Mac**: `brew install python3` (if you have Homebrew)
- **Windows**: Download from https://www.python.org/downloads/

### "pip: command not found"

Try using `pip3` instead:
```bash
pip3 install -r requirements.txt
```

### "Permission denied"

Try adding `sudo` (Mac/Linux):
```bash
sudo pip install -r requirements.txt
```

### "The script is taking forever"

This is normal! Large projects like Apache Camel have thousands of contributors. The script includes:
- Progress bars so you can see it's working
- Automatic rate limiting to avoid hitting GitHub's limits
- Retry logic if something fails

### "Rate limit exceeded"

If you see this error:
1. Wait 1 hour for your rate limit to reset
2. Or create a new GitHub token
3. The script will tell you how many requests you have left

## 🔄 Running Again

To refresh the data later:

```bash
cd scripts
python extract_github_data.py
```

The script will overwrite the old data with fresh data from GitHub.

## 📊 Understanding the Data

### metadata.json
Basic project info: stars, forks, description, when it was created

### contributors.json
Who contributes to the project and what companies they work for

### commits.json
How many code changes were made each quarter

### issues.json
How many bugs/features are open vs. closed, how long they take to fix

### pull_requests.json
How many code contributions are submitted each quarter

### releases.json
When new versions are released

## 🆘 Still Stuck?

If something isn't working:
1. Check that your GitHub token is correct in `config.yaml`
2. Make sure you're in the `scripts/` directory when running commands
3. Check that all dependencies installed successfully
4. Look at the error message - it usually tells you what's wrong

---

**Next**: Once you have data, we'll build the dashboard to visualize it!