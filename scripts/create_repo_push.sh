#!/bin/sh
# Helper: create a GitHub repo with gh and push current project
set -e

echo "This will create a GitHub repository for the current folder and push the code."
read -p "Repository name (default: flowmodoro): " repo
repo=${repo:-flowmodoro}
read -p "Description (optional): " desc

# ensure git initialized
if [ ! -d .git ]; then
  git init
  git add .
  git commit -m "Initial commit"
else
  echo "Git already initialized."
fi

# create via gh and push
if command -v gh >/dev/null 2>&1; then
  gh repo create "$repo" --public --source=. --push --description "$desc"
  echo "Repository created and pushed: $(gh repo view --json url -q .url)"
else
  echo "gh CLI not found. Install gh and authenticate (gh auth login) before running this script."
  exit 1
fi
