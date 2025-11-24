#!/bin/bash

# Xcode 15.4 Installation Script for React Native 0.73.11 Compatibility
# This script helps you download and install Xcode 15.4

set -e

echo "🛠️  Xcode 15.4 Installation Guide"
echo "=================================="
echo ""
echo "Current Xcode: $(xcodebuild -version 2>/dev/null | head -1 || echo 'Not found')"
echo ""

echo "📋 Step-by-Step Instructions:"
echo ""
echo "1️⃣  Download Xcode 15.4:"
echo "   • Open: https://developer.apple.com/download/all/"
echo "   • Sign in with your Apple ID"
echo "   • Search for 'Xcode 15.4'"
echo "   • Download: Xcode_15.4.xip (~8.2 GB)"
echo "   • Save to Downloads folder"
echo ""

read -p "Have you downloaded Xcode_15.4.xip? (y/n): " downloaded

if [ "$downloaded" != "y" ]; then
    echo "Please download Xcode 15.4 first, then run this script again."
    exit 0
fi

XIP_PATH="$HOME/Downloads/Xcode_15.4.xip"

if [ ! -f "$XIP_PATH" ]; then
    echo "❌ Xcode_15.4.xip not found in Downloads folder"
    echo "   Expected: $XIP_PATH"
    read -p "Enter the full path to Xcode_15.4.xip: " XIP_PATH
fi

if [ ! -f "$XIP_PATH" ]; then
    echo "❌ File not found: $XIP_PATH"
    exit 1
fi

echo ""
echo "2️⃣  Extracting Xcode 15.4 (this takes 5-10 minutes)..."
echo "   ⏳ Please wait..."

cd "$(dirname "$XIP_PATH")"
xip --expand "$XIP_PATH"

if [ ! -d "$(dirname "$XIP_PATH")/Xcode.app" ]; then
    echo "❌ Extraction failed"
    exit 1
fi

echo "✅ Extraction complete"
echo ""

echo "3️⃣  Installing Xcode 15.4..."

# Backup current Xcode 26.1.1 if not already backed up
if [ -d "/Applications/Xcode-26.1.1.app" ]; then
    echo "   ℹ️  Xcode 26.1.1 already backed up"
elif [ -d "/Applications/Xcode.app" ]; then
    echo "   📦 Backing up current Xcode to Xcode-26.1.1.app..."
    sudo mv /Applications/Xcode.app /Applications/Xcode-26.1.1.app
fi

# Move Xcode 15.4 to Applications
echo "   📥 Moving Xcode 15.4 to /Applications/..."
sudo mv "$(dirname "$XIP_PATH")/Xcode.app" /Applications/Xcode-15.4.app

echo "✅ Xcode 15.4 installed to /Applications/Xcode-15.4.app"
echo ""

echo "4️⃣  Switching to Xcode 15.4..."
sudo xcode-select --switch /Applications/Xcode-15.4.app

echo "✅ Switched to Xcode 15.4"
echo ""

echo "5️⃣  Verifying installation..."
xcodebuild -version

echo ""
echo "6️⃣  Opening Xcode to install additional components..."
echo "   ⚠️  First launch will install required components (2-3 minutes)"
open /Applications/Xcode-15.4.app

echo ""
echo "⏳ Waiting for Xcode first-time setup..."
sleep 10

echo ""
echo "7️⃣  Accepting Xcode license..."
sudo xcodebuild -license accept

echo ""
echo "✅ Xcode 15.4 Installation Complete!"
echo ""
echo "📱 Next Steps:"
echo "   1. Close Xcode after it finishes loading"
echo "   2. Clean your iOS project:"
echo "      cd /Users/vishvendrasingh/projects/Mandi-Mobile-App/ios"
echo "      rm -rf Pods Podfile.lock ~/Library/Developer/Xcode/DerivedData/*"
echo "      pod install"
echo "   3. Build the app:"
echo "      cd .."
echo "      npx react-native run-ios"
echo ""
echo "💡 To switch back to Xcode 26.1.1:"
echo "   sudo xcode-select --switch /Applications/Xcode-26.1.1.app"
echo ""
