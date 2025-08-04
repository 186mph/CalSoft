# Hot Module Replacement (HMR) Fix Guide for WSL

## Problem
Changes to files require manual dev server restart instead of automatic hot reload.

## Root Causes
1. **WSL File Watching Limits**: WSL has low default limits for file watching
2. **Vite HMR Configuration**: Default settings don't work well with WSL
3. **File System Issues**: WSL file system can have permission/access issues

## Solutions Applied

### 1. Updated Vite Configuration (`vite.config.ts`)
- Added `usePolling: true` for WSL file watching
- Set separate HMR port (5176)
- Added polling interval (1 second)
- Enabled error overlay

### 2. Fixed WSL File Watching Limits
- Increased `max_user_watches` to 524288
- Increased `max_user_instances` to 512
- Increased `max_queued_events` to 524288

### 3. Added New NPM Scripts
- `npm run dev:hmr` - Force HMR restart
- `npm run dev:clean` - Clear cache and restart

## Quick Fixes

### If HMR stops working:
1. **Clear Vite cache**: `rm -rf node_modules/.vite`
2. **Restart with force**: `npm run dev:hmr`
3. **Clean restart**: `npm run dev:clean`

### If still not working:
1. **Kill all Vite processes**: `pkill -f "vite"`
2. **Clear cache**: `rm -rf node_modules/.vite`
3. **Restart WSL**: `wsl --shutdown` (in Windows PowerShell)
4. **Restart dev server**: `npm run dev`

## Prevention Tips

1. **Use WSL2**: Ensure you're using WSL2, not WSL1
2. **Project Location**: Keep project in WSL filesystem (`/home/...`) not Windows filesystem (`/mnt/c/...`)
3. **Regular Restarts**: Restart WSL weekly to clear any accumulated issues
4. **Monitor Resources**: Check if WSL is running out of memory

## Troubleshooting

### Check if HMR is working:
1. Open browser dev tools
2. Look for WebSocket connection to `ws://localhost:5176`
3. Check console for HMR messages

### Check file watching:
```bash
# Check current limits
cat /proc/sys/fs/inotify/max_user_watches
cat /proc/sys/fs/inotify/max_user_instances

# Should show: 524288 and 512
```

### If limits are still low:
```bash
# Re-run the fix script
./fix-wsl-limits.sh
```

## Alternative Solutions

### Option 1: Use Windows Terminal + WSL
- Better integration with Windows
- More stable file watching

### Option 2: Move Project to WSL Filesystem
```bash
# Copy project to WSL home directory
cp -r /mnt/c/Users/samge/OneDrive/Desktop/Active-Website-Software ~/Active-Website-Software
cd ~/Active-Website-Software
npm run dev
```

### Option 3: Use Docker Development
- More isolated environment
- Consistent across different systems

## Expected Behavior After Fix
- File changes should trigger automatic browser refresh
- Console should show HMR messages
- No need to manually restart dev server
- Faster development workflow 