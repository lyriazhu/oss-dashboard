# Installing Java and Maven on macOS

## Quick Installation (Recommended)

Run these commands in your terminal:

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Java 17
brew install openjdk@17

# Link Java so it's available system-wide
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

# Install Maven
brew install maven

# Verify installations
java -version
mvn -version
```

## Step-by-Step Instructions

### 1. Install Homebrew (if needed)

Check if you have Homebrew:
```bash
brew --version
```

If not installed, run:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the on-screen instructions. You may need to add Homebrew to your PATH.

### 2. Install Java 17

```bash
# Install OpenJDK 17
brew install openjdk@17

# Create symlink for system Java
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

# Add to your shell profile (choose one based on your shell)
# For zsh (default on macOS):
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# For bash:
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.bash_profile
source ~/.bash_profile
```

### 3. Install Maven

```bash
brew install maven
```

### 4. Verify Installations

```bash
# Check Java version (should show 17.x.x)
java -version

# Check Maven version (should show 3.x.x)
mvn -version
```

Expected output for Java:
```
openjdk version "17.0.x" 2024-xx-xx
OpenJDK Runtime Environment (build 17.0.x+x)
OpenJDK 64-Bit Server VM (build 17.0.x+x, mixed mode, sharing)
```

Expected output for Maven:
```
Apache Maven 3.x.x
Maven home: /opt/homebrew/Cellar/maven/3.x.x/libexec
Java version: 17.0.x, vendor: Homebrew
```

## Alternative: Manual Installation

### Java (Manual)

1. Download from: https://adoptium.net/temurin/releases/?version=17
2. Choose macOS, x64 or ARM64 (M1/M2/M3)
3. Download and run the .pkg installer
4. Follow installation wizard

### Maven (Manual)

1. Download from: https://maven.apache.org/download.cgi
2. Extract to `/opt/maven`
3. Add to PATH in `~/.zshrc`:
   ```bash
   export PATH="/opt/maven/bin:$PATH"
   ```

## Troubleshooting

### "command not found: brew"
- Install Homebrew first (see step 1)
- Make sure to follow the post-installation instructions to add Homebrew to PATH

### "command not found: java" after installation
- Close and reopen your terminal
- Or run: `source ~/.zshrc` (or `source ~/.bash_profile`)
- Check if Java is in PATH: `echo $PATH`

### "command not found: mvn" after installation
- Close and reopen your terminal
- Or run: `source ~/.zshrc`
- Verify Maven location: `which mvn`

### Permission denied errors
- Use `sudo` for system-level operations
- Make sure you have admin rights on your Mac

## After Installation

Once Java and Maven are installed, the normal local workflow is:

1. Generate or refresh dashboard data with the Python extractor
2. Start the Spring Boot backend
3. Query the API from your browser, curl, or a frontend app

### Generate Data First

The backend reads JSON files from `../data`, so run the extractor before starting the API:

```bash
cd /Users/lyriazhu/Desktop/oss-dashboard/scripts
python3 -m pip install -r requirements.txt
python3 extract_github_data.py
```

### Start the Backend

```bash
cd /Users/lyriazhu/Desktop/oss-dashboard/backend
mvn spring-boot:run
```

The API will start on http://localhost:8080

### Verify the Backend

```bash
curl http://localhost:8080/api/projects
curl http://localhost:8080/api/projects/strimzi/metrics
```

## Quick Test

Verify Maven and Java can build the backend:

```bash
cd /Users/lyriazhu/Desktop/oss-dashboard/backend
mvn clean compile
```

If successful, you'll see "BUILD SUCCESS" at the end.

## Common Next Step

If the backend starts but the dashboard data looks old, rerun:

```bash
cd /Users/lyriazhu/Desktop/oss-dashboard/scripts
python3 extract_github_data.py
```

The extractor now supports cached git mirrors, cached user profiles, and per-project checkpoint state for faster reruns.