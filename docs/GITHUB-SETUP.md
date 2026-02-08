# GitHub Repository Setup Guide

This guide will help you upload your Batak Tournament project to GitHub.

## Prerequisites

- Git installed on your machine
- GitHub account
- Local project directory: `/Users/mesahin/batak`

## Step 1: Create GitHub Repository

### Option A: Using GitHub Web Interface

1. Go to https://github.com/new
2. Fill in the repository details:
   - **Repository name:** `batak`
   - **Description:** `Batak Tournament Game - Multiplayer Turkish trick-taking card game with cNFT rewards`
   - **Visibility:** Private (recommended) or Public
   - **DO NOT** initialize with README, .gitignore, or license (we already have them)
3. Click "Create repository"

### Option B: Using GitHub CLI

```bash
# Install GitHub CLI if not already installed
brew install gh  # macOS
# or
sudo apt install gh  # Linux

# Login to GitHub
gh auth login

# Create repository
gh repo create batak --private --description "Batak Tournament Game - Multiplayer Turkish trick-taking card game with cNFT rewards"
```

## Step 2: Initialize Git in Your Project

```bash
# Navigate to project directory
cd /Users/mesahin/batak

# Check if git is already initialized
ls -la .git

# If not initialized, initialize git
git init
```

## Step 3: Create .gitignore

Create a `.gitignore` file in your project root if it doesn't exist:

```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.log

# Environment variables
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Database (local)
server/data/*.db
server/data/*.db-shm
server/data/*.db-wal

# Docker volumes
server/data/

# SSH keys
*.pem
*.key
id_ed25519*
id_rsa*

# Backups
backups/
*.backup

# Logs
logs/
*.log

# Certificates (local only)
*.crt
*.key
*.pem

# Test coverage
coverage/
.nyc_output/

# Temporary files
tmp/
temp/
EOF
```

## Step 4: Stage and Commit Files

```bash
# Add all files to git
git add .

# Check what will be committed
git status

# Commit changes
git commit -m "Initial commit: Batak Tournament game with VPS deployment setup"
```

## Step 5: Add Remote Repository

### Using HTTPS

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/batak.git

# Or if you already have a remote, update it
git remote set-url origin https://github.com/YOUR_USERNAME/batak.git
```

### Using SSH (Recommended)

```bash
# Setup SSH key for GitHub if not already done
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add SSH key to GitHub:
# 1. Copy public key: cat ~/.ssh/id_ed25519.pub
# 2. Go to https://github.com/settings/keys
# 3. Click "New SSH key"
# 4. Paste your public key

# Add remote using SSH
git remote add origin git@github.com:YOUR_USERNAME/batak.git

# Or update existing remote
git remote set-url origin git@github.com:YOUR_USERNAME/batak.git
```

## Step 6: Push to GitHub

### First Push (Sets Upstream Branch)

```bash
# Push main branch to GitHub
git push -u origin main

# Or if you're on master branch
git push -u origin master
```

### If you encounter branch name issues

```bash
# Check current branch
git branch

# Rename master to main if needed
git branch -M main

# Then push
git push -u origin main
```

## Step 7: Verify Repository

1. Go to https://github.com/YOUR_USERNAME/batak
2. Verify all files are present
3. Check that the `.github/workflows/deploy.yml` file exists

## Step 8: Setup GitHub Actions Secrets

For auto-deployment to work, you need to add secrets to GitHub:

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add the following secrets:

   **Required Secrets:**
   - `HETZNER_HOST`: Your VPS IP address (e.g., `123.45.67.89`)
   - `HETZNER_USER`: `batak` (the user we created on VPS)
   - `SSH_PRIVATE_KEY`: Your private SSH key content

   **To get SSH_PRIVATE_KEY:**
   ```bash
   # On your local machine
   cat ~/.ssh/id_ed25519
   # OR if you created a key specifically for VPS
   cat ~/.ssh/batak_vps_key
   ```

   Copy the ENTIRE output including the `BEGIN` and `END` lines.

## Step 9: Test GitHub Actions

1. Make a small change to a file (e.g., update README.md)
2. Commit and push:
   ```bash
   git add README.md
   git commit -m "Test GitHub Actions"
   git push
   ```
3. Go to https://github.com/YOUR_USERNAME/batak/actions
4. Verify the workflow runs

## Troubleshooting

### Error: "Repository not found"

```bash
# Verify remote URL
git remote -v

# Update if incorrect
git remote set-url origin git@github.com:YOUR_USERNAME/batak.git
```

### Error: "Permission denied (publickey)"

```bash
# Test SSH connection to GitHub
ssh -T git@github.com

# If fails, setup SSH key properly
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub  # Add this to GitHub
```

### Error: "failed to push some refs"

```bash
# Pull first if there are remote changes
git pull origin main --rebase

# Then push
git push origin main
```

### Large Files Issue

If you have large files (>100MB), use Git LFS:

```bash
# Install Git LFS
brew install git-lfs  # macOS
# or
sudo apt install git-lfs  # Linux

# Initialize Git LFS
git lfs install

# Track large files
git lfs track "*.db"
git lfs track "*.jar"

# Commit .gitattributes
git add .gitattributes
git commit -m "Add Git LFS"
git push
```

## Next Steps

After successfully pushing to GitHub:

1. **Clone on VPS:**
   ```bash
   ssh batak@s.batakci.xyz
   cd ~/app
   git clone git@github.com:YOUR_USERNAME/batak.git .
   ```

2. **Setup Environment:**
   ```bash
   cp .env.production.example .env
   vim .env  # Edit configuration
   ```

3. **Deploy:**
   ```bash
   docker compose up -d
   ```

## Quick Reference Commands

```bash
# Status
git status

# Add all changes
git add .

# Commit
git commit -m "Your message"

# Push
git push

# Pull latest changes
git pull

# Check remote
git remote -v

# View logs
git log --oneline -10
```

---

**Note:** If you encounter any issues during this process, feel free to ask for help!
