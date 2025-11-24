#!/bin/bash

# Android Device Setup & Run Script
# No Android Studio required - uses command line tools only

set -e

echo "🤖 Mandi Mobile App - Android Runner"
echo "====================================="
echo ""

# Check if ANDROID_HOME is set
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME not set. Loading Android configuration..."
    source ~/.zshrc.android
fi

# Verify adb is available
if ! command -v adb &> /dev/null; then
    echo "❌ adb not found. Please run: source ~/.zshrc.android"
    exit 1
fi

echo "✅ Android SDK: $ANDROID_HOME"
echo ""

# Check for connected devices
echo "📱 Checking for connected devices..."
DEVICES=$(adb devices | grep -v "List of devices" | grep "device$" | wc -l | xargs)

if [ "$DEVICES" -eq 0 ]; then
    echo ""
    echo "❌ No Android devices found!"
    echo ""
    echo "📋 To connect a physical device:"
    echo "   1. Enable Developer Options (Settings → About → Tap 'Build Number' 7 times)"
    echo "   2. Enable USB Debugging (Settings → Developer Options)"
    echo "   3. Connect phone via USB cable"
    echo "   4. Accept USB debugging prompt on phone"
    echo "   5. Run: adb devices"
    echo ""
    echo "📋 To use an emulator without Android Studio:"
    echo "   Option 1: Use Genymotion (free personal use)"
    echo "   • Download from: https://www.genymotion.com/download/"
    echo "   • Install and create a virtual device"
    echo ""
    echo "   Option 2: Use Android Emulator (command line)"
    echo "   • sdkmanager 'emulator' 'system-images;android-36;google_apis;arm64-v8a'"
    echo "   • avdmanager create avd -n test -k 'system-images;android-36;google_apis;arm64-v8a'"
    echo "   • emulator -avd test"
    echo ""
    exit 1
fi

echo "✅ Found $DEVICES device(s):"
adb devices | grep "device$"
echo ""

# Check if google-services.json exists
if [ ! -f "android/app/google-services.json" ]; then
    echo "⚠️  Warning: google-services.json not found in android/app/"
    echo "   Firebase features may not work. Download from Firebase Console."
    echo ""
fi

# Check if Metro bundler is running
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Metro bundler already running on port 8081"
    echo ""
else
    echo "🚀 Starting Metro bundler..."
    echo ""
    # Start Metro in background
    npx react-native start &
    METRO_PID=$!
    echo "   Metro PID: $METRO_PID"
    echo "   Waiting for Metro to start..."
    sleep 5
    echo ""
fi

# Clean build (optional, uncomment if needed)
# echo "🧹 Cleaning previous builds..."
# cd android && ./gradlew clean && cd ..
# echo ""

# Build and install
echo "🔨 Building and installing app on device..."
echo ""
cd android
./gradlew installDebug --quiet
cd ..

echo ""
echo "✅ App installed successfully!"
echo ""
echo "📱 The app should now be launching on your device..."
echo ""
echo "💡 Tips:"
echo "   • Shake device to open developer menu"
echo "   • Enable 'Hot Reload' for faster development"
echo "   • View logs: adb logcat *:S ReactNative:V ReactNativeJS:V"
echo ""
