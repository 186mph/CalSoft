#!/bin/bash

# Fix WSL file watching limits for better Vite HMR
echo "Fixing WSL file watching limits..."

# Increase inotify limits
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
echo fs.inotify.max_user_instances=512 | sudo tee -a /etc/sysctl.conf
echo fs.inotify.max_queued_events=524288 | sudo tee -a /etc/sysctl.conf

# Apply the changes
sudo sysctl -p

echo "File watching limits updated!"
echo "You may need to restart WSL for changes to take full effect."
echo "Run: wsl --shutdown in Windows PowerShell, then restart WSL" 