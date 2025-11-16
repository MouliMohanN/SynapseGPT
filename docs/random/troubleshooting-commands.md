# React Native Troubleshooting Commands

This document contains common commands to fix React Native module resolution issues and Metro bundler problems.

### Issue: Persistent cache issues

```bash
# Nuclear option - clear everything
rm -rf node_modules
rm -rf ~/.metro
rm -rf /tmp/metro-*
rm -rf /tmp/react-*
npm cache clean --force
watchman watch-del-all
npx metro-cache clear
npx metro --reset-cache
npm install
npx react-native start --reset-cache
```

## Clean-RN

[Clean-RN](https://github.com/mrousavy/clean-rn)
