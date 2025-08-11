# HMR Quick Fix Guide

## 🚀 Quick Commands

```bash
# Check HMR status
npm run hmr:check

# Clear cache and restart
npm run dev:clean

# Force restart with HMR
npm run dev:hmr

# Kill all Vite processes and restart
pkill -f "vite" && npm run dev

# Complete reset
npm run dev:reset
```

## 🔧 Common Issues & Solutions

### Issue: Changes not showing up
**Solution:** `npm run dev:clean`

### Issue: HMR port not accessible
**Solution:** `pkill -f "vite" && npm run dev:hmr`

### Issue: Browser not refreshing
**Solution:** 
1. Open browser dev tools
2. Check Network tab for `ws://localhost:5176`
3. Look for HMR messages in console

### Issue: WSL file watching limits
**Solution:** `./fix-wsl-limits.sh`

## 📋 HMR Checklist

- [ ] WSL file watching limits are set (524288, 512)
- [ ] Vite is running on port 5175
- [ ] HMR is running on port 5176
- [ ] Browser shows WebSocket connection
- [ ] Console shows HMR messages when saving files

## 🎯 Expected Behavior

When you save a file:
1. Browser should automatically refresh
2. Console should show: `[vite] hot updated: /path/to/file`
3. No manual restart needed

## 🆘 Emergency Fix

If nothing works:
```bash
# 1. Kill everything
pkill -f "vite"

# 2. Clear all caches
rm -rf node_modules/.vite

# 3. Restart WSL (in Windows PowerShell)
wsl --shutdown

# 4. Restart dev server
npm run dev
```

## 📞 Troubleshooting

Run `npm run hmr:check` for detailed diagnostics! 