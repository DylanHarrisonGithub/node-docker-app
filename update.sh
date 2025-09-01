#!/bin/bash

# Get current directory path and name
current_dir=$(pwd)
current_dir_name=$(basename "$current_dir")
parent_dir=$(dirname "$current_dir")

# Define paths
public_backup="$parent_dir/public"
update_script="$current_dir/update.sh"
index_file="$current_dir/index.js"

# Ensure folder ownership is correct
echo "Ensuring folder ownership is correct..."
sudo chown -R root:root .

# Step 1: Backup 'public' folder to parent directory
sudo cp -r "$current_dir/public" "$public_backup"
echo "Backed up 'public' folder to parent directory."

# Step 2: Run sudo git pull
echo "Updating from repository..."
sudo git fetch origin
sudo git reset --hard origin/main
# Check if git pull was successful
if [ $? -ne 0 ]; then
  echo "git pull failed. Exiting."
  exit 1
fi
# Clean untracked files and directories
echo "Cleaning untracked files and directories..."
sudo git clean -fd

# Step 3: Run sudo npm install
echo "Running 'sudo npm install'..."
sudo npm install
if [ $? -ne 0 ]; then
  echo "npm install failed. Exiting."
  exit 1
fi

# Step 4: Ensure update.sh is executable
if [ -f "$update_script" ]; then
  echo "Making update.sh executable..."
  sudo chmod +x "$update_script"
else
  echo "Warning: update.sh not found after pull."
fi

# Step 5: Restore 'public' folder from backup
sudo rm -rf "$current_dir/public"
sudo cp -r "$public_backup" "$current_dir"
echo "Restored 'public' folder to current directory."

# Step 6: Delete backup
sudo rm -rf "$public_backup"
echo "Deleted temporary 'public' folder from parent directory."

# Step 7: Restart app using pm2
if [ -f "$index_file" ]; then
  echo "Restarting PM2 process for index.js..."
  sudo pm2 restart index.js
  sudo pm2 save
  echo "PM2 process restarted and saved."
else
  echo "Warning: index.js not found. Skipping PM2 restart."
fi
