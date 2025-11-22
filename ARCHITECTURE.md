# Project Structure Overview

## Complete File Tree

```
Mandi-Mobile-App/
├── README.md                    # Main documentation
├── SETUP.md                     # Setup and installation guide
├── API.md                       # API documentation
├── LICENSE                      # MIT License
├── package.json                 # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── babel.config.js             # Babel configuration
├── metro.config.js             # Metro bundler configuration
├── .eslintrc.js                # ESLint configuration
├── .prettierrc.js              # Prettier configuration
├── .gitignore                  # Git ignore rules
├── index.js                    # App entry point
│
├── src/
│   ├── App.tsx                 # Root component
│   │
│   ├── models/
│   │   └── Transaction.ts      # Data models and interfaces
│   │
│   ├── database/
│   │   ├── DatabaseService.ts  # SQLite connection manager
│   │   └── BaseRepository.ts   # Base repository class
│   │
│   ├── repositories/
│   │   ├── BuyTransactionRepository.ts
│   │   ├── SellTransactionRepository.ts
│   │   ├── LendTransactionRepository.ts
│   │   └── ExpenseTransactionRepository.ts
│   │
│   ├── services/
│   │   └── TransactionService.ts
│   │
│   ├── screens/
│   │   ├── DashboardScreen.tsx
│   │   └── BuyTransactionsScreen.tsx
│   │
│   ├── components/
│   │   ├── TransactionCard.tsx
│   │   ├── SummaryCard.tsx
│   │   ├── CustomInput.tsx
│   │   └── CustomButton.tsx
│   │
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   │
│   ├── constants/
│   │   ├── theme.ts
│   │   └── types.ts
│   │
│   ├── utils/
│   │   └── helpers.ts
│   │
│   └── types/
│       └── navigation.d.ts
```

## Architecture Layers

### 1. Data Layer (Models + Database)
**Location:** `src/models/`, `src/database/`

- **Transaction.ts**: Defines all transaction types and database schemas
- **DatabaseService.ts**: Manages SQLite connection (Singleton)
- **BaseRepository.ts**: Abstract repository with common CRUD operations

**SOLID Principle:** Single Responsibility - Each handles one specific concern

### 2. Data Access Layer (Repositories)
**Location:** `src/repositories/`

Four repository classes, each handling one transaction type:
- BuyTransactionRepository
- SellTransactionRepository
- LendTransactionRepository
- ExpenseTransactionRepository

**SOLID Principle:** Open/Closed - Extend BaseRepository without modification

### 3. Business Logic Layer (Services)
**Location:** `src/services/`

- **TransactionService.ts**: Orchestrates all transaction operations
  - Coordinates between repositories
  - Implements business rules
  - Provides unified API

**SOLID Principle:** Dependency Inversion - Depends on abstractions

### 4. Presentation Layer (UI)
**Location:** `src/screens/`, `src/components/`, `src/navigation/`

#### Screens
- **DashboardScreen**: Financial summary and overview
- **BuyTransactionsScreen**: Buy transactions list

#### Components
- **TransactionCard**: Transaction display component
- **SummaryCard**: Summary information display
- **CustomInput**: Reusable input field
- **CustomButton**: Reusable button component

#### Navigation
- **AppNavigator**: Navigation configuration
  - Bottom Tab Navigator
  - Stack Navigator

**SOLID Principle:** Interface Segregation - Components receive only needed props

### 5. Utilities Layer
**Location:** `src/utils/`, `src/constants/`

#### Constants
- **theme.ts**: Colors, typography, spacing, shadows
- **types.ts**: Grain types, expense categories, payment modes

#### Utilities
- **helpers.ts**: Date formatting, currency formatting, validation

## SOLID Principles Implementation

### Single Responsibility Principle (SRP)
Each class/module has one reason to change:
- `DatabaseService`: Database connection only
- `BuyTransactionRepository`: Buy transactions data access only
- `TransactionService`: Transaction business logic coordination

### Open/Closed Principle (OCP)
Classes are open for extension, closed for modification:
- `BaseRepository`: Abstract class that can be extended
- New transaction types can be added by extending, not modifying

### Liskov Substitution Principle (LSP)
Derived classes can substitute base classes:
- All repositories can be used interchangeably through IRepository interface
- Transaction types follow common Transaction interface

### Interface Segregation Principle (ISP)
Clients depend only on interfaces they use:
- Separate interfaces for each transaction type
- Components receive only required props
- IRepository interface defines only essential methods

### Dependency Inversion Principle (DIP)
High-level modules don't depend on low-level modules:
- `TransactionService` depends on repository interfaces, not implementations
- Repositories depend on database abstraction
- Components depend on service interface

## Key Design Patterns

### 1. Singleton Pattern
- **DatabaseService**: Ensures single database instance
- **TransactionService**: Single service instance

### 2. Repository Pattern
- **BaseRepository**: Common data access interface
- **Specific Repositories**: Implement data operations for each entity

### 3. Dependency Injection
- Repositories receive database instance via constructor
- Services can be mocked for testing

### 4. Strategy Pattern (implicit)
- Different payment status calculation strategies
- Different transaction type handling

## Data Flow

```
User Action
    ↓
Screen/Component
    ↓
TransactionService (Business Logic)
    ↓
Repository (Data Access)
    ↓
DatabaseService (Connection)
    ↓
SQLite Database
```

## Transaction Types

### 1. Buy Transaction
```typescript
{
  supplierName, supplierPhone, grainType, quantity,
  ratePerQuintal, totalAmount, paidAmount, balanceAmount,
  paymentStatus, vehicleNumber, invoiceNumber
}
```

### 2. Sell Transaction
```typescript
{
  buyerName, buyerPhone, grainType, quantity,
  ratePerQuintal, totalAmount, receivedAmount, balanceAmount,
  paymentStatus, vehicleNumber, invoiceNumber
}
```

### 3. Lend Transaction
```typescript
{
  personName, personPhone, lendType (MONEY/GRAIN),
  amount/grainType/quantity, expectedReturnDate,
  returnedAmount, returnedQuantity, balanceAmount,
  balanceQuantity, paymentStatus
}
```

### 4. Expense Transaction
```typescript
{
  expenseCategory, expenseName, amount, paidTo,
  paymentMode (CASH/ONLINE/CHEQUE), receiptNumber
}
```

## Payment Status Flow

```
PENDING → PARTIAL → COMPLETED
   ↑         ↑          ↑
   0%     1-99%       100%
```

## Database Tables

1. **buy_transactions**: Grain purchases
2. **sell_transactions**: Grain sales
3. **lend_transactions**: Money/grain lending
4. **expense_transactions**: Business expenses

Each table has:
- Primary key: `id`
- Timestamps: `created_at`, `updated_at`
- Transaction date: `date`
- Optional description: `description`

## Technology Stack

- **Framework**: React Native 0.72.6
- **Language**: TypeScript 5.2.2
- **Database**: SQLite (react-native-sqlite-storage)
- **Navigation**: React Navigation 6.x
- **UI**: React Native Paper + Custom Components
- **State Management**: React Hooks
- **Date Handling**: date-fns

## Development Workflow

1. **Models First**: Define data structures
2. **Database Setup**: Create schemas and service
3. **Repositories**: Implement data access
4. **Services**: Build business logic
5. **UI Components**: Create reusable components
6. **Screens**: Assemble components into screens
7. **Navigation**: Connect screens
8. **Integration**: Wire everything together

## Testing Strategy

### Unit Tests
- Repository methods
- Service business logic
- Utility functions

### Integration Tests
- Database operations
- Service with repositories
- Component rendering

### E2E Tests
- User workflows
- Transaction creation flows
- Payment updates

## Performance Considerations

1. **Database Indexing**: Add indexes on frequently queried fields
2. **Lazy Loading**: Load transactions on demand
3. **Pagination**: Implement for large transaction lists
4. **Caching**: Cache dashboard summary
5. **Optimistic Updates**: Update UI before database confirmation

## Security Features

1. **Local Storage**: All data stored locally
2. **No Network Calls**: Offline-first approach
3. **Input Validation**: Validate all user inputs
4. **SQL Injection Prevention**: Use parameterized queries
5. **Data Backup**: Regular backup recommendations

## Future Enhancements

1. **Cloud Sync**: Optional cloud backup
2. **Multi-user**: Support for multiple users
3. **Reports**: PDF/Excel export
4. **Analytics**: Advanced business insights
5. **Notifications**: Payment reminders
6. **Biometric Auth**: Fingerprint/Face ID
7. **Dark Mode**: Theme toggle
8. **Multi-language**: i18n support

---

**Last Updated**: November 21, 2025
**Version**: 1.0.0
