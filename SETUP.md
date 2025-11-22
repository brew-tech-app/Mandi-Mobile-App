# Mandi Mobile App - Setup Guide

## Prerequisites Installation

### 1. Install Node.js
Download and install Node.js (v16 or higher) from [nodejs.org](https://nodejs.org/)

### 2. Install React Native CLI
```bash
npm install -g react-native-cli
```

### 3. iOS Development Setup (macOS only)

#### Install Xcode
1. Install Xcode from Mac App Store
2. Install Xcode Command Line Tools:
```bash
xcode-select --install
```

#### Install CocoaPods
```bash
sudo gem install cocoapods
```

### 4. Android Development Setup

#### Install Android Studio
1. Download from [developer.android.com](https://developer.android.com/studio)
2. During installation, ensure these components are selected:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device

#### Configure Android Environment Variables
Add to your `~/.zshrc` or `~/.bash_profile`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Then reload:
```bash
source ~/.zshrc  # or source ~/.bash_profile
```

## Project Setup

### 1. Clone and Install
```bash
git clone https://github.com/brew-tech-app/Mandi-Mobile-App.git
cd Mandi-Mobile-App
npm install
```

### 2. iOS Setup
```bash
cd ios
pod install
cd ..
```

### 3. Android Setup
No additional steps needed. Gradle will download dependencies on first build.

## Running the App

### Start Metro Bundler
```bash
npm start
```

### Run on iOS
In a new terminal:
```bash
npm run ios
# Or for specific simulator
npm run ios -- --simulator="iPhone 14 Pro"
```

### Run on Android
```bash
# Start an Android emulator first, then:
npm run android
```

## Troubleshooting

### iOS Issues

#### Port 8081 Already in Use
```bash
lsof -ti:8081 | xargs kill -9
```

#### Pod Install Fails
```bash
cd ios
pod deintegrate
pod install
cd ..
```

#### Xcode Build Fails
1. Clean build folder: Product > Clean Build Folder
2. Reset cache:
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### Android Issues

#### Gradle Build Fails
```bash
cd android
./gradlew clean
cd ..
```

#### Metro Bundler Issues
```bash
npm start -- --reset-cache
```

#### ADB Device Not Found
```bash
adb kill-server
adb start-server
adb devices
```

### General Issues

#### Clear Cache
```bash
npm start -- --reset-cache
rm -rf node_modules
npm install
```

#### SQLite Issues
Make sure `react-native-sqlite-storage` is properly linked:
```bash
cd ios && pod install && cd ..
```

For Android, rebuild:
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

## Development Tips

### Hot Reload
- Press `r` in Metro terminal for reload
- Press `d` for developer menu

### Debug Menu
- **iOS**: Cmd + D
- **Android**: Cmd + M (Mac) or Ctrl + M (Windows/Linux)

### React Native Debugger
Install standalone debugger:
```bash
brew install --cask react-native-debugger
```

### VSCode Extensions
Recommended extensions:
- React Native Tools
- ESLint
- Prettier
- TypeScript Hero

## Database Management

### View SQLite Database

#### iOS
Database location:
```
~/Library/Developer/CoreSimulator/Devices/[DEVICE_ID]/data/Containers/Data/Application/[APP_ID]/Documents/mandi_app.db
```

#### Android
```bash
adb shell
run-as com.mandimobileapp
cd databases
sqlite3 mandi_app.db
```

### Reset Database
Use the app's settings or manually delete the database file.

## Building for Production

### iOS

1. Open `ios/MandiMobileApp.xcworkspace` in Xcode
2. Select "Any iOS Device" as target
3. Product > Archive
4. Follow distribution wizard

### Android

```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

## Additional Resources

- [React Native Docs](https://reactnative.dev/)
- [SQLite React Native](https://github.com/andpor/react-native-sqlite-storage)
- [React Navigation](https://reactnavigation.org/)

## Support

For issues:
1. Check troubleshooting section
2. Search existing GitHub issues
3. Create new issue with details
