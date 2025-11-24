# Platform Compatibility Setup

## Current Configuration

### ✅ React Native & Core Dependencies
- **React Native**: 0.73.11 (Stable, production-ready)
- **React**: 18.2.0
- **Node**: 25.2.1
- **Java**: OpenJDK 17 (for Android builds)

### ✅ Android Configuration
- **Android SDK**: 34 (Compile & Target)
- **Min SDK**: 23 (Android 6.0+)
- **Build Tools**: 34.0.0
- **Android Gradle Plugin**: 8.3.0
- **Gradle**: 8.6
- **Kotlin**: 1.9.0
- **NDK**: 25.1.8937393
- **Google Services**: 4.4.1

**Android Dependencies Installed:**
- Platform 34 & 36
- Build Tools 36.0.0
- Command Line Tools
- NDK 25.1.8937393, 27.1.12297006, 27.2.12479018
- CMake 3.22.1

### ✅ iOS Configuration
- **iOS Deployment Target**: 15.0+
- **Xcode**: 26.1.1 (active) & 15.4 (available)
- **CocoaPods**: 79 pods installed
- **Supported Devices**: iOS 15.0 and above

**Key iOS Pods:**
- React Native 0.73.11
- Firebase (12.4.0)
- Hermes Engine
- All navigation & UI libraries

### ✅ Firebase Integration
- **Firebase App**: 23.5.0
- **Firebase Auth**: 23.5.0
- **Firebase Firestore**: 23.5.0
- **Firebase BOM**: 34.4.0
- Configured for both platforms

### ✅ Navigation & UI Libraries
- **React Navigation**: 6.x
  - Bottom Tabs: 6.5.11
  - Stack Navigator: 6.3.20
- **React Native Paper**: 5.11.1
- **React Native Screens**: 3.29.0 (compatible with both platforms)
- **React Native Gesture Handler**: 2.14.0 (compatible with both platforms)
- **React Native Safe Area Context**: 4.8.2
- **React Native Vector Icons**: 10.3.0

### ✅ Storage
- **AsyncStorage**: 1.24.0
- **SQLite Storage**: 6.0.1

## Build Commands

### Android
```bash
# Set Java 17
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export PATH="$JAVA_HOME/bin:$PATH"

# Load Android SDK
source ~/.zshrc.android

# Run on Android
npm run android

# Or use the helper script
./run-android.sh
```

### iOS
```bash
# Install pods (first time or after dependency changes)
cd ios && pod install && cd ..

# Run on iOS simulator
npm run ios

# Or specify a simulator
npx react-native run-ios --simulator="iPhone 15 Pro"
```

## Environment Setup Files

### Android Environment (~/.zshrc.android)
```bash
# Android SDK
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$ANDROID_HOME/platform-tools:$PATH"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
export PATH="$ANDROID_HOME/build-tools/36.0.0:$PATH"

# Java 17 for Android development
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
export PATH="$JAVA_HOME/bin:$PATH"
```

Load it: `source ~/.zshrc.android`

### iOS Environment (ios/.xcode.env.local)
```bash
export NODE_BINARY=/opt/homebrew/Cellar/node/25.2.1/bin/node
```

## Platform-Specific Notes

### Android
- ✅ Command-line tools only (no Android Studio required)
- ✅ Java 17 required for Gradle 8.6
- ✅ Emulator support via command-line
- ✅ Physical device support via adb
- ⚠️ First build takes 5-10 minutes (downloads dependencies)
- ⚠️ Requires accepting SDK licenses

### iOS
- ✅ CocoaPods configured and working
- ✅ Xcode 15.4 & 26.1.1 available
- ✅ Hermes engine enabled
- ✅ Firebase integration working
- ⚠️ iOS simulators require iOS 17.5+ runtime
- ⚠️ Physical device requires iOS 17.5+ platform in Xcode
- ⚠️ Xcode 26.1.1 has compatibility patches in Podfile

## Features Implemented

### Authentication
- Email/Password signup with Firebase
- GSTIN validation (15 characters, uniqueness check)
- Firm name, email, phone validation
- User model with Firestore integration

### Database
- SQLite for local storage
- Firestore for cloud sync
- Repository pattern for data access
- Transaction models (Buy/Sell/Lend/Expense)

### Navigation
- Stack navigation
- Bottom tabs navigation
- Type-safe navigation with TypeScript

### UI Components
- Custom buttons and inputs
- Transaction cards
- Summary cards
- Floating action button
- Material Design theme

## Development Workflow

1. **Start Metro Bundler**:
   ```bash
   npm start
   ```

2. **Run on Android**:
   ```bash
   export JAVA_HOME=/opt/homebrew/opt/openjdk@17
   export PATH="$JAVA_HOME/bin:$PATH"
   source ~/.zshrc.android
   npm run android
   ```

3. **Run on iOS**:
   ```bash
   npm run ios
   ```

4. **Clean Build** (if needed):
   ```bash
   # Android
   cd android && ./gradlew clean && cd ..
   
   # iOS
   cd ios && rm -rf Pods Podfile.lock build && pod install && cd ..
   ```

## Troubleshooting

### Android Build Issues
- **Java version**: Ensure Java 17 is active (`java -version`)
- **Gradle cache**: Run `cd android && ./gradlew clean`
- **Dependencies**: Re-sync with `npm install`

### iOS Build Issues
- **Pods**: Run `cd ios && pod install --repo-update`
- **Xcode**: Switch with `sudo xcode-select --switch /Applications/Xcode-15.4.app`
- **Cache**: Clean with `cd ios && rm -rf build && cd ..`

### Common Issues
- **Metro bundler**: Kill existing process on port 8081
- **Node modules**: Remove and reinstall (`rm -rf node_modules && npm install`)
- **Simulators**: Ensure iOS runtime matches Xcode version

## Version Compatibility Matrix

| Component | Version | Android | iOS | Status |
|-----------|---------|---------|-----|--------|
| React Native | 0.73.11 | ✅ | ✅ | Stable |
| React | 18.2.0 | ✅ | ✅ | Stable |
| Firebase | 23.5.0 | ✅ | ✅ | Working |
| Navigation | 6.x | ✅ | ✅ | Working |
| Gradle | 8.6 | ✅ | N/A | Working |
| CocoaPods | Latest | N/A | ✅ | Working |

## Next Steps

1. ✅ Android setup complete and building
2. ✅ iOS setup complete with pods installed
3. 🔄 Test on physical Android device or emulator
4. 🔄 Test on iOS simulator (requires iOS 17.5+ runtime)
5. 📱 Download iOS 17.5 runtime for physical device testing
6. 🔄 Test all features on both platforms

## Support

For issues:
- Check logs: `npx react-native log-android` or `npx react-native log-ios`
- Run doctor: `npx react-native doctor`
- Check environment: `npx react-native info`
