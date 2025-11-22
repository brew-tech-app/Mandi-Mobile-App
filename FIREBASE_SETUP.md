# Firebase Setup Guide

This guide will help you set up Firebase for authentication and cloud backup in the Mandi Mobile App.

## Prerequisites

- A Google account
- Node.js and npm installed
- Xcode (for iOS)
- Android Studio (for Android)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `Mandi-Mobile-App` (or your preferred name)
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In Firebase Console, go to **Build → Authentication**
2. Click "Get started"
3. Enable **Email/Password** authentication:
   - Click "Email/Password"
   - Toggle "Enable"
   - Click "Save"

## Step 3: Enable Firestore Database

1. In Firebase Console, go to **Build → Firestore Database**
2. Click "Create database"
3. Select "Start in production mode" (we'll set rules later)
4. Choose your Cloud Firestore location (closest to your users)
5. Click "Enable"

## Step 4: Set Up Firestore Security Rules

1. In Firestore Database, go to the **Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Nested transactions collection
      match /transactions/{transactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

3. Click "Publish"

## Step 5: Register Android App

1. In Firebase Console, click the Android icon (⚙️ Settings → Project settings)
2. Click "Add app" → Android
3. Enter Android package name: `com.mandimobileapp` (or your package name)
4. Download `google-services.json`
5. Move the file to: `android/app/google-services.json`

### Update Android Configuration

Edit `android/build.gradle` (project level):

```gradle
buildscript {
    dependencies {
        // Add this line
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

Edit `android/app/build.gradle`:

```gradle
// Add at the bottom of the file
apply plugin: 'com.google.gms.google-services'
```

## Step 6: Register iOS App

1. In Firebase Console, click the iOS icon
2. Click "Add app" → iOS
3. Enter iOS bundle ID: `org.reactjs.native.example.MandiMobileApp` (or your bundle ID from Xcode)
4. Download `GoogleService-Info.plist`
5. Open `ios/MandiMobileApp.xcworkspace` in Xcode
6. Drag `GoogleService-Info.plist` into the project root in Xcode
7. Ensure "Copy items if needed" is checked
8. Click "Finish"

### Install iOS Pods

```bash
cd ios
pod install
cd ..
```

## Step 7: Verify Installation

Run the type checker to ensure no errors:

```bash
npm run type-check
```

## Step 8: Test the App

### iOS

```bash
npm run ios
```

### Android

```bash
npm run android
```

## Step 9: Test Authentication

1. Launch the app
2. You should see the Login screen
3. Click "Sign Up" to create a new account
4. Fill in the form and submit
5. You should be redirected to the Dashboard

## Step 10: Verify Firestore Data

1. After creating a transaction in the app
2. Go to Settings → Sync Now
3. In Firebase Console → Firestore Database
4. You should see:
   ```
   users/
     └── {userId}/
           └── transactions/
                 └── {transactionId}
   ```

## Troubleshooting

### Android Issues

**Error: "Default FirebaseApp is not initialized"**
- Ensure `google-services.json` is in `android/app/`
- Verify `apply plugin: 'com.google.gms.google-services'` is at the bottom of `android/app/build.gradle`
- Clean and rebuild: `cd android && ./gradlew clean && cd ..`

**Error: "Failed to resolve: com.google.firebase"**
- Check your internet connection
- Update Google Play Services in Android SDK Manager

### iOS Issues

**Error: "FirebaseCore.framework not found"**
- Run `cd ios && pod install && cd ..`
- Clean build folder in Xcode: Product → Clean Build Folder

**Error: "GoogleService-Info.plist not found"**
- Ensure the file is added to Xcode project (not just copied to folder)
- Check it appears in "Copy Bundle Resources" in Build Phases

### Authentication Issues

**Error: "User must be logged in"**
- The app requires authentication for most features
- Sign up for a new account or sign in

**Error: "Network request failed"**
- Check your internet connection
- Ensure Firebase project is active
- Verify API keys in Firebase Console

## Security Considerations

1. **Never commit Firebase config files to public repositories**
   - Add to `.gitignore`:
     ```
     google-services.json
     GoogleService-Info.plist
     ```

2. **Keep Firestore rules restrictive**
   - Users should only access their own data
   - Test rules in Firebase Console

3. **Enable App Check (Optional but Recommended)**
   - Protects against abuse
   - Go to Build → App Check in Firebase Console

## Next Steps

1. ✅ Set up Firebase project
2. ✅ Enable Authentication
3. ✅ Enable Firestore
4. ✅ Configure Android app
5. ✅ Configure iOS app
6. ✅ Test authentication
7. ✅ Test cloud backup
8. 🔲 Deploy to production
9. 🔲 Set up monitoring and analytics

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Firebase](https://rnfirebase.io/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Firebase Console logs
3. Check React Native Firebase documentation
4. Review app logs: `npx react-native log-ios` or `npx react-native log-android`
