###############################################################################
# OSS Dashboard – Local Dev Environment Bootstrap
#
# This Terraform configuration installs all prerequisites for the
# OSS Dashboard project on a macOS machine using Homebrew.
#
# Prerequisites (required before running this):
#   - macOS with Homebrew already installed (https://brew.sh)
#   - Terraform >= 1.6 installed  (brew install terraform)
#
# Usage:
#   cd setup
#   terraform init
#   terraform apply
###############################################################################

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

###############################################################################
# Variables
###############################################################################

variable "github_token" {
  description = "Your GitHub Personal Access Token (classic) with public_repo, read:org, read:user scopes."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^ghp_[A-Za-z0-9]{36,}$", var.github_token))
    error_message = "Provide a valid GitHub classic PAT beginning with 'ghp_'."
  }
}

variable "repo_url" {
  description = "Git URL of the oss-dashboard repository to clone."
  type        = string
  default     = "https://github.com/your-org/oss-dashboard.git"
}

variable "install_dir" {
  description = "Absolute path where the repository will be cloned."
  type        = string
  default     = "~/oss-dashboard"
}

###############################################################################
# Local values – derived paths and version requirements
###############################################################################

locals {
  repo_dir        = var.install_dir
  scripts_dir     = "${local.repo_dir}/scripts"
  frontend_dir    = "${local.repo_dir}/frontend"
  backend_dir     = "${local.repo_dir}/backend"

  # Minimum versions expressed as simple checks in shell
  node_min_major  = 18
  java_min_major  = 17
  python_min_minor = "3.8"
  maven_min_major = 3
}

###############################################################################
# Step 1 – Verify Homebrew is present
###############################################################################

resource "null_resource" "check_homebrew" {
  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      echo "==> Checking Homebrew..."
      if ! command -v brew &>/dev/null; then
        echo ""
        echo "ERROR: Homebrew is not installed or not on PATH."
        echo "Install it first:"
        echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        echo "Then re-run: terraform apply"
        exit 1
      fi
      echo "  Homebrew $(brew --version | head -1) found."
    EOT
  }
}

###############################################################################
# Step 2 – Install system packages via Homebrew (idempotent)
###############################################################################

resource "null_resource" "install_git" {
  depends_on = [null_resource.check_homebrew]

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      echo "==> Git..."
      if command -v git &>/dev/null; then
        echo "  git already installed: $(git --version)"
      else
        brew install git
      fi
    EOT
  }
}

resource "null_resource" "install_python" {
  depends_on = [null_resource.check_homebrew]

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      echo "==> Python 3..."
      if command -v python3 &>/dev/null; then
        PYVER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
        echo "  python3 $PYVER already installed."
      else
        brew install python3
      fi
    EOT
  }
}

resource "null_resource" "install_java" {
  depends_on = [null_resource.check_homebrew]

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      echo "==> Java 17 (JDK)..."
      JAVA_OK=false
      if command -v java &>/dev/null; then
        JVER=$(java -version 2>&1 | awk -F'"' '/version/ {print $2}' | cut -d. -f1)
        if [ "$JVER" -ge "${local.java_min_major}" ] 2>/dev/null; then
          echo "  Java $JVER already satisfies >= ${local.java_min_major}."
          JAVA_OK=true
        fi
      fi
      if [ "$JAVA_OK" = "false" ]; then
        brew install openjdk@17
        # Symlink so the system JVM finder picks it up
        sudo ln -sfn "$(brew --prefix openjdk@17)/libexec/openjdk.jdk" \
          /Library/Java/JavaVirtualMachines/openjdk-17.jdk 2>/dev/null || true
        # Persist PATH update for the current user's default shell config
        SHELL_RC="$HOME/.zshrc"
        JAVA_PATH_LINE='export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"'
        if ! grep -qF "$JAVA_PATH_LINE" "$SHELL_RC" 2>/dev/null; then
          echo "$JAVA_PATH_LINE" >> "$SHELL_RC"
          echo "  Added Java to PATH in $SHELL_RC"
        fi
        export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
        echo "  Java $(java -version 2>&1 | head -1) installed."
      fi
    EOT
  }
}

resource "null_resource" "install_maven" {
  depends_on = [null_resource.install_java]

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      echo "==> Maven..."
      if command -v mvn &>/dev/null; then
        echo "  $(mvn --version | head -1) already installed."
      else
        brew install maven
      fi
    EOT
  }
}

resource "null_resource" "install_node" {
  depends_on = [null_resource.check_homebrew]

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      echo "==> Node.js..."
      if command -v node &>/dev/null; then
        NVER=$(node --version | sed 's/v//' | cut -d. -f1)
        if [ "$NVER" -ge "${local.node_min_major}" ] 2>/dev/null; then
          echo "  Node.js v$NVER already satisfies >= ${local.node_min_major}."
        else
          echo "  Node.js v$NVER is below ${local.node_min_major} — upgrading..."
          brew upgrade node || brew install node
        fi
      else
        brew install node
      fi
    EOT
  }
}

###############################################################################
# Step 3 – Clone the repository
###############################################################################

resource "null_resource" "clone_repo" {
  depends_on = [null_resource.install_git]

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      DEST="${local.repo_dir}"
      DEST_EXPANDED=$(eval echo "$DEST")
      echo "==> Cloning repository to $DEST_EXPANDED..."
      if [ -d "$DEST_EXPANDED/.git" ]; then
        echo "  Repository already exists — running git pull instead."
        git -C "$DEST_EXPANDED" pull --ff-only
      else
        git clone "${var.repo_url}" "$DEST_EXPANDED"
      fi
    EOT
  }
}

###############################################################################
# Step 4 – Write GitHub token into scripts/config.yaml
###############################################################################

resource "null_resource" "configure_token" {
  depends_on = [null_resource.clone_repo]

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    # Token is injected via environment variable to avoid it appearing in the
    # Terraform state plan output (the env var is still in state — use a remote
    # backend with encryption for production-grade secret handling).
    environment = {
      GITHUB_TOKEN = var.github_token
    }
    command = <<-EOT
      SCRIPTS=$(eval echo "${local.scripts_dir}")
      CONFIG="$SCRIPTS/config.yaml"
      echo "==> Writing GitHub token to $CONFIG..."
      if [ ! -f "$CONFIG" ]; then
        echo "  WARNING: $CONFIG not found. Skipping token injection."
        exit 0
      fi
      # Replace the placeholder value only — leave all other config intact
      sed -i.bak "s|token: \"YOUR_GITHUB_TOKEN_HERE\"|token: \"$GITHUB_TOKEN\"|g" "$CONFIG"
      rm -f "$CONFIG.bak"
      echo "  Token written."
    EOT
  }
}

###############################################################################
# Step 5 – Set up Python virtual environment and install dependencies
###############################################################################

resource "null_resource" "python_venv" {
  depends_on = [null_resource.install_python, null_resource.clone_repo]

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      SCRIPTS=$(eval echo "${local.scripts_dir}")
      echo "==> Creating Python virtual environment in $SCRIPTS/.venv..."
      python3 -m venv "$SCRIPTS/.venv"
      "$SCRIPTS/.venv/bin/pip" install --upgrade pip --quiet
      echo "==> Installing Python dependencies from requirements.txt..."
      "$SCRIPTS/.venv/bin/pip" install -r "$SCRIPTS/requirements.txt"
      echo "==> Installing Playwright Chromium browser..."
      "$SCRIPTS/.venv/bin/python" -m playwright install chromium
      echo "  Python environment ready."
    EOT
  }
}

###############################################################################
# Step 6 – Install frontend Node dependencies
###############################################################################

resource "null_resource" "npm_install" {
  depends_on = [null_resource.install_node, null_resource.clone_repo]

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      FRONTEND=$(eval echo "${local.frontend_dir}")
      echo "==> Running npm install in $FRONTEND..."
      npm install --prefix "$FRONTEND"
      echo "  Frontend dependencies installed."
    EOT
  }
}

###############################################################################
# Step 7 – Pre-fetch Maven dependencies (optional warm-up)
###############################################################################

resource "null_resource" "maven_dependencies" {
  depends_on = [null_resource.install_maven, null_resource.clone_repo]

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      BACKEND=$(eval echo "${local.backend_dir}")
      echo "==> Downloading Maven dependencies for backend..."
      # 'dependency:resolve' downloads deps without running a full build
      export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
      mvn -f "$BACKEND/pom.xml" dependency:resolve --quiet
      echo "  Maven dependencies ready."
    EOT
  }
}

###############################################################################
# Outputs
###############################################################################

output "next_steps" {
  value = <<-EOT

  ✅  All dependencies installed successfully.

  To run the dashboard, open three terminals:

  Terminal 1 – Data extraction:
    cd ${local.scripts_dir}
    source .venv/bin/activate
    python3 extract_github_data.py

  Terminal 2 – Backend API (after extraction completes):
    cd ${local.backend_dir}
    mvn spring-boot:run

  Terminal 3 – Frontend dev server:
    cd ${local.frontend_dir}
    npm run dev
    # Open http://localhost:5173

  EOT
}
