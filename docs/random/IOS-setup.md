# iOS Setup Guide for ExploreRN

A comprehensive guide to configure iOS development environment for the ExploreRN React Native project.

## Overview

This guide walks you through setting up a complete iOS development environment, from installing Xcode to running your React Native app on iOS simulators.

## Prerequisites

- **macOS** (iOS development is only supported on Mac)
- **Apple ID** (required for Xcode download)
- **15GB+ free disk space** (for Xcode installation)
- **Stable internet connection** (Xcode is ~15GB download)

## What's Included

After completing this setup, you'll have:
- ✅ Xcode with iOS SDK and simulators
- ✅ CocoaPods dependency manager
- ✅ All iOS project dependencies installed
- ✅ React Native app running on iOS simulator

## Setup Instructions

### Step 1: Install Xcode

Xcode is Apple's IDE that provides iOS SDK, simulators, and build tools.

**Install from App Store (Recommended):**

1. Open Mac App Store (`Cmd + Space` → "App Store")
2. Search for "Xcode" and install the official Apple app
3. Launch Xcode after installation to accept license and install additional components

**Alternative: Download from [Apple Developer Portal](https://developer.apple.com/xcode/)**

**Configure Xcode:**
```bash
# Set Xcode as active developer directory
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

# Verify installation
xcodebuild -version
```

### Step 2: Install CocoaPods

CocoaPods manages iOS dependencies (similar to npm for Node.js).

```bash
# Install via Homebrew (recommended)
brew install cocoapods

# Verify installation
pod --version
```

### Step 3: Install iOS Dependencies

Install the project's iOS dependencies:

```bash
# Navigate to iOS directory and install dependencies
cd ios && pod install
```

> **Important:** Always use `.xcworkspace` (not `.xcodeproj`) to open the project in Xcode after running `pod install`.

### Step 4: Run the App

Run your React Native app on iOS simulator:

```bash
# From project root directory
npm run ios

# Or specify a simulator
react-native run-ios --simulator="iPhone 15 Pro"
```

The first run will:
- Launch the iOS simulator
- Build and install the app
- Start the Metro bundler
- Open the app automatically

## ✅ Verification

Verify your setup is working correctly:

```bash
# Check Xcode installation
xcodebuild -version

# Check CocoaPods installation
pod --version

# List available simulators
xcrun simctl list devices

# Test the complete setup
npm run ios
```

## Available Scripts

Useful npm scripts for iOS development:

```bash
npm run ios                    # Run app on simulator
npm run build:debug:ios        # Build debug version
npm run build:release:ios      # Build release version  
npm run fingerprint:ios        # Generate build fingerprint
npm run detox:test:ios         # Run end-to-end tests
```

## Troubleshooting

**Common Issues & Solutions:**

| Issue | Solution |
|-------|----------|
| "No bundle URL present" | Start Metro: `npm start --reset-cache` |
| Build errors after new deps | Update pods: `cd ios && pod install` |
| Simulator not launching | Open Simulator app manually |
| Xcode license errors | Accept license: `sudo xcodebuild -license accept` |
| Clean build needed | Clean: `cd ios && xcodebuild clean` |

**Additional Resources:**
- [React Native iOS Setup](https://reactnative.dev/docs/environment-setup)
- [CocoaPods Guide](https://guides.cocoapods.org/using/troubleshooting)
- [Xcode Documentation](https://developer.apple.com/documentation/xcode)

---

## ✅ Setup Summary

**Environment Ready:**
- ✓ Xcode 26.0 (Build 17A324)
- ✓ CocoaPods 1.16.2  
- ✓ 84 iOS dependencies installed
- ✓ React Native 0.80.1 on iOS

*Setup completed: September 19, 2025*
