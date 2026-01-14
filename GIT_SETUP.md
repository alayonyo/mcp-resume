# Git Configuration Guide

This guide provides instructions for configuring git credentials and SSH access
for this repository using the `alayonyo` GitHub account.

## Overview

This repository is configured to use:

- **GitHub Account**: `alayonyo`
- **Git User**: `alayonyo`
- **Git Email**: `yonatanayalon1@gmail.com`
- **Authentication**: HTTPS with GitHub CLI (recommended) or SSH

## Current Configuration

The repository is currently set up with:

```bash
git config --local user.name "alayonyo"
git config --local user.email "yonatanayalon1@gmail.com"
git remote: https://github.com/alayonyo/mcp-resume.git
```

## Authentication Methods

### Method 1: HTTPS with GitHub CLI (Recommended)

This is the simplest and most reliable method, especially when you have multiple
GitHub accounts.

#### Prerequisites

- GitHub CLI installed (`brew install gh`)

#### Setup Steps

1. **Configure local git user:**

```bash
cd /Users/yonatan.ayalon/projects/new_app_1/my-mcp
git config --local user.name "alayonyo"
git config --local user.email "yonatanayalon1@gmail.com"
```

2. **Set remote to HTTPS:**

```bash
git remote set-url origin https://github.com/alayonyo/mcp-resume.git
```

3. **Authenticate with GitHub CLI:**

```bash
gh auth login --hostname github.com --git-protocol https --web
```

- Choose "Login with a web browser"
- Copy the one-time code
- Complete authentication in browser as **alayonyo**

4. **Verify authentication:**

```bash
gh auth status
```

5. **Push your changes:**

```bash
git push
```

### Method 2: SSH Key Authentication

If you prefer SSH, you need a unique SSH key that is registered **only** with
the `alayonyo` account.

#### Prerequisites

- SSH key in `/Users/yonatan.ayalon/projects/new_app_1/resume/`

#### Important SSH Key Rule

⚠️ **Critical**: An SSH key can authenticate as only one GitHub account. If your
SSH key is registered with multiple accounts, GitHub will always use the first
account it finds.

#### Setup Steps

1. **Generate a new SSH key (if needed):**

```bash
cd /Users/yonatan.ayalon/projects/new_app_1/resume
ssh-keygen -t ed25519 -C "yonatanayalon1@gmail.com" -f id_alayonyo_ed25519 -N ""
```

2. **Copy the public key:**

```bash
cat /Users/yonatan.ayalon/projects/new_app_1/resume/id_alayonyo_ed25519.pub
```

3. **Register the key with GitHub:**

   - Login to GitHub as **alayonyo**
   - Go to https://github.com/settings/keys
   - Click "New SSH key"
   - Paste the public key
   - Title it: "MCP Resume Repository"
   - Save

4. **Remove from other accounts (if applicable):**

   - If this key exists on any other GitHub account, remove it
   - SSH keys must be unique to one account

5. **Configure local repository:**

```bash
cd /Users/yonatan.ayalon/projects/new_app_1/my-mcp
git config --local user.name "alayonyo"
git config --local user.email "yonatanayalon1@gmail.com"
git config --local core.sshCommand "ssh -i /Users/yonatan.ayalon/projects/new_app_1/resume/id_alayonyo_ed25519 -F /dev/null"
git remote set-url origin git@github.com:alayonyo/mcp-resume.git
```

6. **Test SSH connection:**

```bash
ssh -i /Users/yonatan.ayalon/projects/new_app_1/resume/id_alayonyo_ed25519 -T git@github.com
```

- Should output: `Hi alayonyo! You've successfully authenticated...`
- If it shows a different username, the key is registered to the wrong account

7. **Push your changes:**

```bash
git push
```

## Troubleshooting

### Error: "Permission denied" or "403"

- **Cause**: Wrong account credentials cached
- **Fix**: Use GitHub CLI method or ensure SSH key is registered to correct
  account

### Error: "Could not resolve hostname github-resume"

- **Cause**: SSH config alias issue
- **Fix**: Switch to HTTPS method or update SSH config

### SSH authenticates as wrong user

- **Cause**: SSH key is registered to another GitHub account
- **Fix**:
  1. Remove the key from the other account at https://github.com/settings/keys
  2. Ensure it's only registered to `alayonyo` account

### Error: "No 'Access-Control-Allow-Origin' header"

- **Cause**: CORS configuration issue in production
- **Fix**: Already fixed in `api/index.js` and `vercel.json` - redeploy to
  Vercel

## AI Assistant Instructions

When helping with git configuration for this repository:

1. **Always use local config** - Never modify global git config
2. **Verify the target account** - Confirm operations are for `alayonyo`
3. **Check authentication status** first before attempting pushes
4. **Prefer GitHub CLI (HTTPS)** over SSH when multiple accounts exist
5. **Test connection** before pushing changes
6. **Use these commands** to verify setup:
   ```bash
   git config --local --list | grep -E "(user\.|remote\.)"
   gh auth status
   ```

## Quick Reference Commands

### Check current configuration

```bash
git config --local user.name
git config --local user.email
git remote -v
gh auth status
```

### Reset to HTTPS (recommended)

```bash
git config --local --unset core.sshCommand
git remote set-url origin https://github.com/alayonyo/mcp-resume.git
gh auth login --hostname github.com --git-protocol https --web
```

### Reset to SSH

```bash
git config --local core.sshCommand "ssh -i /Users/yonatan.ayalon/projects/new_app_1/resume/id_alayonyo_ed25519 -F /dev/null"
git remote set-url origin git@github.com:alayonyo/mcp-resume.git
```

### Test authentication

```bash
# For HTTPS (GitHub CLI)
gh auth status

# For SSH
ssh -i /Users/yonatan.ayalon/projects/new_app_1/resume/id_alayonyo_ed25519 -T git@github.com
```

## Summary

✅ **Repository**: https://github.com/alayonyo/mcp-resume  
✅ **Local User**: `alayonyo <yonatanayalon1@gmail.com>`  
✅ **Recommended Auth**: GitHub CLI (HTTPS)  
✅ **SSH Key Location**: `/Users/yonatan.ayalon/projects/new_app_1/resume/`

---

**Last Updated**: January 13, 2026
