# Mandi Mobile App

A comprehensive Grain Trading Mobile Application built with React Native, TypeScript, and SQLite. This app helps manage Buy, Sell, Lend, and Expense transactions for grain trading businesses.

## 🌟 Features

### Transaction Management
- **Buy Transactions**: Record grain purchases from suppliers with payment tracking
- **Sell Transactions**: Manage grain sales to buyers with receivables
- **Lend Transactions**: Track money or grain lending with return dates
- **Expense Transactions**: Record business expenses across categories

### Key Capabilities
- ✅ **Multi-User Support**: Each user has their own secure account
- ✅ **Instant Cloud Backup**: Transactions automatically upload to Firebase immediately
- ✅ **Offline-first SQLite database**: Works without internet, syncs when connected
- ✅ **Payment status tracking**: Pending, Partial, Completed
- ✅ **Comprehensive dashboard**: Financial summary at a glance
- ✅ **Real-time calculations**: Pending payments and profit/loss
- ✅ **Supplier/Buyer management**: Track business relationships
- ✅ **Category-wise expense tracking**: Organized expense management
- ✅ **Transaction history**: Complete audit trail with search

## 🏗️ Architecture

This application follows **SOLID principles** for maintainable and scalable code:

### SOLID Principles Implementation

1. **Single Responsibility Principle (SRP)**
   - `DatabaseService`: Handles only database connection and initialization
   - `BuyTransactionRepository`: Manages only Buy transaction data operations
   - `TransactionService`: Coordinates transaction business logic

2. **Open/Closed Principle (OCP)**
   - `BaseRepository`: Abstract class open for extension, closed for modification
   - All specific repositories extend BaseRepository without modifying it

3. **Liskov Substitution Principle (LSP)**
   - Repository implementations can be substituted with base interface
   - All transaction types follow common transaction interface

4. **Interface Segregation Principle (ISP)**
   - Separate interfaces for different transaction types
   - Components receive only props they need

5. **Dependency Inversion Principle (DIP)**
   - Services depend on repository abstractions, not concrete implementations
   - High-level TransactionService doesn't depend on low-level database details

### Project Structure

```
src/
├── models/              # Data models and interfaces
│   ├── Transaction.ts   # Transaction types and schemas
│   └── User.ts         # User and cloud sync models
├── database/            # Database layer
│   ├── DatabaseService.ts    # SQLite connection management
│   └── BaseRepository.ts     # Base repository pattern
├── repositories/        # Data access layer
│   ├── BuyTransactionRepository.ts
│   ├── SellTransactionRepository.ts
│   ├── LendTransactionRepository.ts
│   └── ExpenseTransactionRepository.ts
├── services/            # Business logic layer
│   ├── TransactionService.ts    # Transaction operations
│   ├── AuthService.ts          # Firebase authentication
│   └── CloudBackupService.ts   # Cloud sync operations
├── screens/             # UI screens
│   ├── DashboardScreen.tsx
│   ├── BuyTransactionsScreen.tsx
│   ├── LoginScreen.tsx
│   ├── SignUpScreen.tsx
│   └── SettingsScreen.tsx
├── components/          # Reusable UI components
│   ├── TransactionCard.tsx
│   ├── SummaryCard.tsx
│   ├── CustomInput.tsx
│   ├── CustomButton.tsx
│   └── FloatingActionButton.tsx
├── navigation/          # Navigation configuration
│   └── AppNavigator.tsx
├── constants/           # App constants
│   ├── theme.ts        # Colors, typography, spacing
│   └── types.ts        # Constant types
├── utils/               # Utility functions
│   └── helpers.ts      # Date, currency, validation helpers
└── App.tsx             # Root component
```

## 📦 Database Schema

### Tables

#### 1. buy_transactions
- Stores grain purchase records
- Tracks supplier details, quantity, rates, payments

#### 2. sell_transactions
- Stores grain sale records
- Tracks buyer details, quantity, rates, receivables

#### 3. lend_transactions
- Stores lending records (money or grain)
- Tracks person details, amounts, return dates

#### 4. expense_transactions
- Stores business expense records
- Category-wise tracking, payment modes

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- React Native development environment
- Xcode (for iOS) or Android Studio (for Android)
- Firebase account (for cloud backup features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/brew-tech-app/Mandi-Mobile-App.git
   cd Mandi-Mobile-App
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install iOS dependencies (Mac only)**
   ```bash
   cd ios
   pod install
   cd ..
   ```

4. **Set up Firebase** (Required for multi-user and cloud backup)
   - Follow the detailed guide in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
   - Create Firebase project
   - Enable Authentication and Firestore
   - Download config files (google-services.json, GoogleService-Info.plist)
   - Configure Android and iOS apps

5. **Start Metro bundler**
   ```bash
   npm start
   ```

6. **Run on iOS**
   ```bash
   npm run ios
   ```

7. **Run on Android**
   ```bash
   npm run android
   ```

### First Time Setup

1. Launch the app
2. Click "Sign Up" to create an account
3. Fill in your details (name, email, password)
4. Start recording transactions
5. Go to Settings → "Sync Now" to backup data to cloud

## 📱 Usage

### Authentication
**Sign Up (First Time)**
1. Launch the app
2. Click "Sign Up"
3. Enter your details:
   - Full Name (required)
   - Business Name (optional)
   - Email (required)
   - Phone Number (optional)
   - Password (min 6 characters)
4. Click "Sign Up" to create account

**Sign In (Returning User)**
1. Enter your email and password
2. Click "Sign In"
3. Use "Forgot Password?" if needed

### Dashboard
- View financial summary (Buy, Sell, Lend, Expense totals)
- Check net profit/loss
- Monitor pending payments
- See recent transactions
- Use Floating Action Button (+) to quickly add transactions

### Buy Transactions
1. Navigate to "Buy" tab
2. Click "Add Buy Transaction"
3. Enter supplier details, grain type, quantity, rate
4. Set payment status and amount paid
5. Save transaction

### Sell Transactions
1. Navigate to "Sell" tab
2. Click "Add Sell Transaction"
3. Enter buyer details, grain type, quantity, rate
4. Set payment status and amount received
5. Save transaction

### Lend Transactions
1. Navigate to "Lend" tab
2. Choose lend type (Money/Grain)
3. Enter person details and amount/quantity
4. Set expected return date
5. Save transaction

### Expense Transactions
1. Navigate to "Expense" tab
2. Select expense category
3. Enter expense details and amount
4. Choose payment mode
5. Save transaction

### Cloud Backup & Sync

**Instant Upload (Automatic)**
- All transactions automatically backup to Firebase immediately
- No manual action required
- Works in background without blocking UI
- Data safe even if device is lost

**Manual Sync (Optional)**
1. Go to Settings tab
2. Click "Sync Now" to ensure full sync
3. View last sync timestamp

**Restore from Cloud** (New Device)
1. Sign in to your account
2. Settings → "Restore from Cloud"
3. All cloud data downloaded to device

See [INSTANT_UPLOAD.md](./INSTANT_UPLOAD.md) and [MULTI_USER_CLOUD_BACKUP.md](./MULTI_USER_CLOUD_BACKUP.md) for detailed guides.

## 🎨 Customization

### Theme Configuration
Edit `src/constants/theme.ts` to customize:
- Colors (primary, secondary, status colors)
- Typography (font sizes, weights)
- Spacing and border radius
- Shadow styles

### Grain Types
Modify `src/constants/types.ts` to add/remove grain types:
```typescript
export const GRAIN_TYPES = [
  'Wheat',
  'Rice',
  // Add your grain types
];
```

### Expense Categories
Modify `src/constants/types.ts` to customize expense categories:
```typescript
export const EXPENSE_CATEGORIES = [
  'Transport',
  'Labor',
  // Add your categories
];
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## 📝 Development Guidelines

### Adding New Transaction Types
1. Define interface in `src/models/Transaction.ts`
2. Create table schema
3. Implement repository extending `BaseRepository`
4. Add methods to `TransactionService`
5. Create UI screens and components

### Code Style
- Follow TypeScript best practices
- Use functional components with hooks
- Keep components small and focused
- Write meaningful comments for complex logic
- Follow SOLID principles

## 🔒 Data Security

- **Local Storage**: All data stored in SQLite database on device
- **Cloud Backup**: Encrypted data stored in Firebase Firestore
- **User Isolation**: Each user's data is completely private
- **Firebase Authentication**: Secure email/password authentication
- **Firestore Security Rules**: Server-side data access control
- **Offline-First**: Works without internet, syncs when available
- **No Third-Party Access**: Your data stays between you and Firebase

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- **brew-tech-app** - [GitHub Profile](https://github.com/brew-tech-app)

## 🙏 Acknowledgments

- React Native community
- SQLite for React Native
- React Navigation
- All contributors

## 🗺️ Roadmap

### Phase 1 (Completed ✅)
- ✅ Basic transaction management
- ✅ SQLite database setup
- ✅ Dashboard with summary
- ✅ Floating Action Button for quick transactions
- ✅ Multi-user authentication
- ✅ Cloud backup with Firebase
- ✅ Two-way data synchronization

### Phase 2 (Current)
- [ ] Transaction form screens (Buy, Sell, Lend, Expense)
- [ ] Advanced search and filters
- [ ] Transaction editing and deletion
- [ ] Automatic sync on app launch

### Phase 3 (Upcoming)
- [ ] Export reports (PDF/Excel)
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Real-time sync across devices

### Phase 4 (Future)
- [ ] Biometric authentication
- [ ] Shared business accounts (team collaboration)
- [ ] Advanced analytics and insights
- [ ] Integration with accounting software

---

**Built with ❤️ for Grain Traders**

