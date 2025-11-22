# Mandi Mobile App

A comprehensive Grain Trading Mobile Application built with React Native, TypeScript, and SQLite. This app helps manage Buy, Sell, Lend, and Expense transactions for grain trading businesses.

## 🌟 Features

### Transaction Management
- **Buy Transactions**: Record grain purchases from suppliers with payment tracking
- **Sell Transactions**: Manage grain sales to buyers with receivables
- **Lend Transactions**: Track money or grain lending with return dates
- **Expense Transactions**: Record business expenses across categories

### Key Capabilities
- ✅ Offline-first SQLite database
- ✅ Payment status tracking (Pending, Partial, Completed)
- ✅ Comprehensive dashboard with financial summary
- ✅ Real-time calculation of pending payments
- ✅ Profit/Loss tracking
- ✅ Supplier/Buyer management
- ✅ Category-wise expense tracking
- ✅ Transaction history and search

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
│   └── Transaction.ts   # Transaction types and schemas
├── database/            # Database layer
│   ├── DatabaseService.ts    # SQLite connection management
│   └── BaseRepository.ts     # Base repository pattern
├── repositories/        # Data access layer
│   ├── BuyTransactionRepository.ts
│   ├── SellTransactionRepository.ts
│   ├── LendTransactionRepository.ts
│   └── ExpenseTransactionRepository.ts
├── services/            # Business logic layer
│   └── TransactionService.ts
├── screens/             # UI screens
│   ├── DashboardScreen.tsx
│   └── BuyTransactionsScreen.tsx
├── components/          # Reusable UI components
│   ├── TransactionCard.tsx
│   ├── SummaryCard.tsx
│   ├── CustomInput.tsx
│   └── CustomButton.tsx
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

4. **Start Metro bundler**
   ```bash
   npm start
   ```

5. **Run on iOS**
   ```bash
   npm run ios
   ```

6. **Run on Android**
   ```bash
   npm run android
   ```

## 📱 Usage

### Dashboard
- View financial summary (Buy, Sell, Lend, Expense totals)
- Check net profit/loss
- Monitor pending payments
- See recent transactions

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

- All data stored locally in SQLite database
- No external API calls (offline-first)
- Device storage encryption recommended
- Regular database backups advised

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

### Phase 1 (Current)
- ✅ Basic transaction management
- ✅ SQLite database setup
- ✅ Dashboard with summary

### Phase 2 (Upcoming)
- [ ] Advanced search and filters
- [ ] Export reports (PDF/Excel)
- [ ] Multi-language support
- [ ] Dark mode

### Phase 3 (Future)
- [ ] Cloud sync (optional)
- [ ] User authentication
- [ ] Multi-user support
- [ ] Advanced analytics

---

**Built with ❤️ for Grain Traders**

