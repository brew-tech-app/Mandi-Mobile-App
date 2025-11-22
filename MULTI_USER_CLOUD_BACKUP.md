# Multi-User Cloud Backup Feature

## Overview

The Mandi Mobile App now supports **multi-user authentication** and **cloud backup**, allowing multiple users to securely manage their grain trading data with automatic synchronization across devices.

## Key Features

### 1. User Authentication
- **Sign Up**: Create a new account with email and password
- **Sign In**: Access your account securely
- **Password Reset**: Recover forgotten passwords via email
- **Profile Management**: Store user details (name, business name, phone)

### 2. Cloud Backup & Sync
- **Automatic Sync**: Two-way synchronization between local device and cloud
- **Manual Backup**: Upload all data to cloud on demand
- **Restore**: Download cloud data to new device
- **Conflict Resolution**: Smart handling of data conflicts

### 3. Data Security
- **User Isolation**: Each user's data is completely private
- **Encrypted Storage**: Firebase authentication and secure Firestore
- **Offline Support**: Full functionality without internet connection
- **Local-First**: SQLite ensures fast access and offline capability

## Architecture

### Data Flow

```
┌─────────────────┐
│  User Device 1  │
│   (SQLite DB)   │
└────────┬────────┘
         │
         ↓
    ┌────────┐
    │ Sync   │ ←→ Firebase Authentication
    └────┬───┘
         │
         ↓
┌─────────────────┐
│  Firestore DB   │
│  (Cloud Store)  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  User Device 2  │
│   (SQLite DB)   │
└─────────────────┘
```

### Components

#### 1. AuthService (`src/services/AuthService.ts`)
Handles all authentication operations:
- User registration and login
- Password management
- Profile updates
- Session management

#### 2. CloudBackupService (`src/services/CloudBackupService.ts`)
Manages data synchronization:
- **backupToCloud()**: Upload all local transactions to Firestore
- **restoreFromCloud()**: Download all cloud transactions to local DB
- **syncData()**: Two-way sync with conflict resolution

#### 3. User Model (`src/models/User.ts`)
Defines user and sync data structures:
```typescript
interface User {
  uid: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  businessName?: string;
  createdAt: string;
}

interface CloudTransaction {
  localId: string;
  userId: string;
  transactionType: TransactionType;
  data: Transaction;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}
```

## User Interface

### 1. Login Screen (`LoginScreen.tsx`)
- Email and password input
- Forgot password option
- Sign up navigation
- Form validation

### 2. Sign Up Screen (`SignUpScreen.tsx`)
- Full name (required)
- Business name (optional)
- Email (required)
- Phone number (optional)
- Password with confirmation
- Comprehensive validation

### 3. Settings Screen (`SettingsScreen.tsx`)
- User profile display
- Cloud backup controls:
  - **Sync Now**: Two-way synchronization
  - **Backup to Cloud**: Upload all data
  - **Restore from Cloud**: Download all data
- Last sync timestamp
- Logout option

## Usage Guide

### For New Users

1. **Install the App**
   ```bash
   npm install
   npm run ios  # or npm run android
   ```

2. **Create Account**
   - Launch app → Click "Sign Up"
   - Enter your details
   - Submit to create account
   - You'll be automatically logged in

3. **Add Transactions**
   - Use the Floating Action Button (+)
   - Choose transaction type
   - Fill in details and save

4. **Enable Cloud Backup**
   - Go to Settings tab
   - Click "Sync Now" to backup data
   - Data is now safe in the cloud

### For Existing Users

1. **Sign In**
   - Launch app → Enter email and password
   - Click "Sign In"

2. **Restore Data** (New Device)
   - Go to Settings tab
   - Click "Restore from Cloud"
   - All transactions will be downloaded

3. **Keep Data Synced**
   - Settings → "Sync Now"
   - Or enable automatic sync (future feature)

## Data Synchronization

### Sync Strategies

#### 1. Manual Sync (Current Implementation)
```typescript
// User initiates sync in Settings
await CloudBackupService.syncData();
```

#### 2. Upload Only (Backup)
```typescript
// Push all local data to cloud
await CloudBackupService.backupToCloud();
```

#### 3. Download Only (Restore)
```typescript
// Pull all cloud data to local
await CloudBackupService.restoreFromCloud();
```

### Conflict Resolution

When the same transaction is modified on multiple devices:

1. **Compare Timestamps**: Check `updatedAt` field
2. **Cloud Wins**: Latest cloud version takes precedence
3. **Merge Strategy**: Use cloud data, update local
4. **Update Sync Status**: Mark as synced

```typescript
// Example conflict resolution
if (localTransaction.updatedAt > cloudTransaction.updatedAt) {
  // Local is newer, upload to cloud
  await updateCloudTransaction(localTransaction);
} else {
  // Cloud is newer, update local
  await updateLocalTransaction(cloudTransaction);
}
```

## Security

### Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /transactions/{transactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Best Practices

1. **Never share credentials**: Each user has unique account
2. **Regular backups**: Sync data frequently
3. **Secure passwords**: Use strong, unique passwords
4. **Logout on shared devices**: Always logout when done

## Firestore Data Structure

```
users/
  └── {userId}/
        ├── profile (document)
        │     ├── email: string
        │     ├── displayName: string
        │     ├── businessName: string
        │     └── createdAt: timestamp
        │
        └── transactions/ (collection)
              ├── {transactionId1}
              │     ├── localId: string
              │     ├── transactionType: "BUY" | "SELL" | "LEND" | "EXPENSE"
              │     ├── data: { ... }
              │     ├── syncStatus: "SYNCED" | "PENDING" | "SYNCING" | "ERROR"
              │     ├── createdAt: timestamp
              │     ├── updatedAt: timestamp
              │     └── syncedAt: timestamp
              │
              └── {transactionId2}
                    └── ...
```

## Performance Considerations

### Batch Operations
- Firebase allows max 500 operations per batch
- CloudBackupService handles automatic batching
- Large datasets are split across multiple batches

### Optimization Tips
1. **Incremental Sync**: Only sync changed data (future enhancement)
2. **Background Sync**: Sync during idle time
3. **Compression**: Reduce data size before upload
4. **Pagination**: Load transactions in chunks

## Future Enhancements

### Planned Features
- [ ] Automatic sync on app launch
- [ ] Real-time sync with WebSocket
- [ ] Offline queue for pending uploads
- [ ] Delta sync (only changed records)
- [ ] Multi-device notifications
- [ ] Shared business accounts (team collaboration)
- [ ] Export data to CSV/Excel
- [ ] Analytics dashboard in cloud

### Advanced Features (Roadmap)
- [ ] Biometric authentication (Face ID / Fingerprint)
- [ ] Two-factor authentication (2FA)
- [ ] Data encryption at rest
- [ ] Audit logs for all changes
- [ ] Role-based access control
- [ ] API for third-party integrations

## Troubleshooting

### Common Issues

#### 1. Sync Failed
**Problem**: "Cloud backup failed" error
**Solutions**:
- Check internet connection
- Verify Firebase credentials
- Check Firestore security rules
- Review app logs

#### 2. Authentication Error
**Problem**: Can't sign in or sign up
**Solutions**:
- Verify email format
- Check password length (min 6 characters)
- Ensure Firebase Authentication is enabled
- Clear app cache and retry

#### 3. Data Not Syncing
**Problem**: Changes not appearing on other device
**Solutions**:
- Manually sync on both devices
- Check last sync timestamp
- Verify user is logged in
- Check Firestore console for data

#### 4. Duplicate Transactions
**Problem**: Same transaction appears multiple times
**Solutions**:
- Restore from cloud to reset
- Use unique IDs for transactions
- Check conflict resolution logic

## Testing

### Manual Testing Checklist

- [ ] Sign up with new account
- [ ] Sign in with existing account
- [ ] Create transactions (Buy, Sell, Lend, Expense)
- [ ] Backup to cloud
- [ ] Sign in on second device
- [ ] Restore from cloud
- [ ] Verify data matches
- [ ] Modify transaction on Device 1
- [ ] Sync both devices
- [ ] Verify changes propagate
- [ ] Test offline mode
- [ ] Test password reset
- [ ] Test logout

### Unit Tests (Future)
```typescript
describe('CloudBackupService', () => {
  it('should backup all transactions', async () => {
    await CloudBackupService.backupToCloud();
    // Verify Firestore has all records
  });

  it('should restore from cloud', async () => {
    await CloudBackupService.restoreFromCloud();
    // Verify local DB has all records
  });

  it('should sync bidirectionally', async () => {
    await CloudBackupService.syncData();
    // Verify both local and cloud match
  });
});
```

## Migration Guide

### Upgrading from Single-User Version

1. **Backup Local Data** (Important!)
   ```sql
   -- Export all transactions from SQLite
   .output backup.sql
   .dump
   ```

2. **Install Updates**
   ```bash
   git pull
   npm install
   cd ios && pod install && cd ..
   ```

3. **Create Account**
   - Launch updated app
   - Sign up with new account

4. **Restore Data**
   - Settings → Backup to Cloud
   - Existing local data will be uploaded

## API Reference

### AuthService

```typescript
class AuthService {
  // Create new user account
  signUp(email: string, password: string, displayName?: string, businessName?: string): Promise<User>
  
  // Sign in existing user
  signIn(email: string, password: string): Promise<User>
  
  // Sign out current user
  signOut(): Promise<void>
  
  // Get current user
  getCurrentUser(): Promise<User | null>
  
  // Reset password
  resetPassword(email: string): Promise<void>
  
  // Update profile
  updateProfile(displayName?: string, phoneNumber?: string): Promise<void>
}
```

### CloudBackupService

```typescript
class CloudBackupService {
  // Upload all local data to cloud
  backupToCloud(): Promise<void>
  
  // Download all cloud data to local
  restoreFromCloud(): Promise<number>
  
  // Two-way synchronization
  syncData(): Promise<void>
}
```

## Support

For issues or questions:
1. Check this documentation
2. Review Firebase logs in console
3. Check app logs: `npx react-native log-ios` or `npx react-native log-android`
4. Refer to [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for configuration help

## License

MIT License - See LICENSE file for details
