#!/bin/bash

echo "🔧 HMR Troubleshooting Script"
echo "=============================="

# Check WSL file watching limits
echo "📊 Checking WSL file watching limits..."
max_watches=$(cat /proc/sys/fs/inotify/max_user_watches)
max_instances=$(cat /proc/sys/fs/inotify/max_user_instances)

echo "  max_user_watches: $max_watches (should be 524288)"
echo "  max_user_instances: $max_instances (should be 512)"

if [ "$max_watches" -lt 524288 ] || [ "$max_instances" -lt 512 ]; then
    echo "⚠️  File watching limits are too low!"
    echo "   Running fix-wsl-limits.sh..."
    ./fix-wsl-limits.sh
else
    echo "✅ File watching limits are correct"
fi

# Check if Vite is running
echo ""
echo "🚀 Checking Vite processes..."
vite_processes=$(pgrep -f "vite" | wc -l)
echo "  Vite processes running: $vite_processes"

if [ "$vite_processes" -gt 0 ]; then
    echo "  Vite processes found:"
    pgrep -f "vite" | xargs ps -p
fi

# Check Vite cache
echo ""
echo "🗂️  Checking Vite cache..."
if [ -d "node_modules/.vite" ]; then
    cache_size=$(du -sh node_modules/.vite 2>/dev/null | cut -f1)
    echo "  Vite cache size: $cache_size"
else
    echo "  No Vite cache found"
fi

# Check for common issues
echo ""
echo "🔍 Checking for common issues..."

# Check if project is in Windows filesystem
if [[ "$PWD" == /mnt/* ]]; then
    echo "⚠️  Project is in Windows filesystem (/mnt/). This can cause HMR issues."
    echo "   Consider moving to WSL filesystem: cp -r . ~/Active-Website-Software"
else
    echo "✅ Project is in WSL filesystem"
fi

# Check available memory
echo ""
echo "💾 Checking system resources..."
free_mem=$(free -m | awk 'NR==2{printf "%.1f", $7/1024}')
echo "  Available memory: ${free_mem}GB"

if (( $(echo "$free_mem < 1" | bc -l) )); then
    echo "⚠️  Low memory available. Consider restarting WSL."
fi

# Check network connectivity for HMR
echo ""
echo "🌐 Checking HMR connectivity..."
if curl -s http://localhost:5176 > /dev/null 2>&1; then
    echo "✅ HMR port 5176 is accessible"
else
    echo "❌ HMR port 5176 is not accessible"
fi

# Provide solutions
echo ""
echo "🛠️  Quick Fixes:"
echo "  1. Clear cache: npm run dev:clean"
echo "  2. Force restart: npm run dev:hmr"
echo "  3. Kill all Vite: pkill -f 'vite' && npm run dev"
echo "  4. Restart WSL: wsl --shutdown (in Windows PowerShell)"
echo "  5. Check browser console for HMR errors"

echo ""
echo "📋 Next Steps:"
echo "  1. Try: npm run dev:clean"
echo "  2. Open browser dev tools and check for HMR WebSocket connection"
echo "  3. Look for 'ws://localhost:5176' in Network tab"
echo "  4. Check console for HMR messages when you save files"

echo ""
echo "✅ HMR troubleshooting complete!" 