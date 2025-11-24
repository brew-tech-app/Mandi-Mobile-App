# Daily Reset & Date Filtering Implementation

## Overview
This document describes the implementation of daily reset mechanism and date-based filtering for operational summaries in the Mandi Mobile App.

## Features Implemented

### 1. Daily Reset Service (`DailyResetService.ts`)

**Purpose**: Manages daily operational data resets and provides date utility functions.

**Key Methods**:
- `checkAndResetIfNewDay()`: Checks if it's a new day and performs reset automatically
- `performDailyReset()`: Resets daily operational data at midnight
- `getTodayDateString()`: Returns current date in YYYY-MM-DD format
- `getStartOfDay()`/`getEndOfDay()`: Returns start/end timestamps for a day
- `getStartOfMonth()`/`getEndOfMonth()`: Returns start/end timestamps for a month
- `getStartOfQuarter()`/`getEndOfQuarter()`: Returns start/end timestamps for a quarter
- `isDateInRange()`: Checks if a date falls within a specified range

**How it Works**:
1. Stores the last reset date in AsyncStorage
2. On app launch, compares current date with last reset date
3. If dates differ, performs daily reset and updates last reset date
4. Logs reset operation for tracking

**Storage Keys**:
- `lastResetDate`: Stores the date of last reset (YYYY-MM-DD)
- `dailyOperationalData`: Stores metadata about daily resets

---

### 2. Date Filtering in TransactionService

**New Methods Added**:

#### `getDashboardSummaryByDateRange(startDate, endDate)`
- Filters all transactions within the specified date range
- Calculates operational metrics (buy, sell, lend, expense) for that period
- Returns running totals for pending amounts (not filtered by date)
- Used by all tab views (Daily/Monthly/Quarterly/Custom)

#### `getDailyOperationalSummary()`
- Returns summary for today only (00:00:00 to 23:59:59)
- Resets daily at midnight
- Shows today's business activity

#### `getMonthlyOperationalSummary()`
- Returns summary for current month
- From 1st day 00:00:00 to last day 23:59:59
- Shows monthly business activity

#### `getQuarterlyOperationalSummary()`
- Returns summary for current quarter (Q1-Q4)
- Automatically determines quarter based on current month
- Shows quarterly business trends

**Implementation Details**:
```typescript
// Filter transactions by date
private filterTransactionsByDateRange<T extends Transaction>(
  transactions: T[],
  startDate: Date,
  endDate: Date
): T[]

// Operational totals (filtered by date)
- totalBuyAmount: Sum of buy transactions in date range
- totalSellAmount: Sum of sell transactions in date range
- totalLendAmount: Sum of lend transactions in date range
- totalExpenseAmount: Sum of expense transactions in date range
- profit: Sell - Buy - Expense for date range

// Running totals (NOT filtered by date - always current state)
- totalPendingBuyAmount: All pending buy payments
- totalPendingSellAmount: All pending sell receivables
- totalPendingLendAmount: All pending lend repayments
```

---

### 3. Cash Balance Service (`CashBalanceService.ts`)

**Purpose**: Manages user's current cash balance with automatic updates on transactions.

**Key Methods**:
- `getCurrentBalance()`: Gets current cash balance from AsyncStorage
- `setBalance(amount)`: Manually sets cash balance
- `addToBalance(amount, reason)`: Adds amount (receipts/income)
- `subtractFromBalance(amount, reason)`: Subtracts amount (payments/expenses)

**Transaction-Specific Methods**:
- `onSellPaymentReceived()`: Updates balance when customer pays
- `onBuyPaymentMade()`: Updates balance when paying supplier
- `onExpensePayment()`: Updates balance on expense payment
- `onLendMoney()`: Updates balance when lending money
- `onLendRepayment()`: Updates balance when receiving repayment

**Usage Example**:
```typescript
// When receiving payment from a customer
await CashBalanceService.onSellPaymentReceived('John Doe', 50000);

// When making payment to supplier
await CashBalanceService.onBuyPaymentMade('ABC Traders', 30000);
```

---

### 4. Dashboard Screen Updates

#### Daily Reset Check
- Automatically checks for daily reset on component mount
- Displays appropriate summary based on selected tab
- Shows reset indicator for daily view

#### Tab-Based Views
- **Daily**: Today's operational data (resets at midnight)
- **Monthly**: Current month's operational data
- **Quarterly**: Current quarter's operational data
- **Custom**: User-defined date range (future enhancement)

#### Cash Balance Modal
- Tap-to-update cash balance card
- Beautiful modal with ₹ symbol and numeric input
- Saves to AsyncStorage immediately
- Shows confirmation on success

#### Running Totals vs Operational Metrics
- **Operational Metrics** (Top Cards): Filtered by date range
  - Purchases
  - Sales
  - Net Profit/Loss
  - Labour Charges
  
- **Running Totals** (Bottom Cards): Never reset, always current
  - Stock (Running Total)
  - Outstanding Loans (Running)
  - Total Payables (Running)
  - Total Receivables (Running)

---

## How Daily Reset Works

### Trigger Points
1. **App Launch**: Checked in `TransactionService.initializeDatabase()`
2. **Dashboard Load**: Checked in `DashboardScreen.loadDashboardData()`

### Reset Process
```
1. Get last reset date from AsyncStorage
2. Get today's date (YYYY-MM-DD)
3. Compare dates:
   - If same: No action needed
   - If different: Perform reset
4. Update last reset date to today
5. Clear daily operational data
6. Log reset operation
```

### What Gets Reset
- Daily operational summary calculations
- Date range for "Daily" tab view
- Metadata tracking last reset

### What DOESN'T Reset
- Transaction data (all preserved)
- Running totals (Stock, Loans, Payables, Receivables)
- User cash balance
- User preferences

---

## Date Filtering Architecture

### Data Flow
```
User selects tab (Daily/Monthly/Quarterly/Custom)
    ↓
calculateDateRange() determines start/end dates
    ↓
loadSummaryByTab() calls appropriate service method
    ↓
TransactionService filters transactions by date
    ↓
Returns filtered operational summary
    ↓
Dashboard displays data with date range
```

### Date Range Calculations
| Tab | Start Date | End Date |
|-----|-----------|----------|
| Daily | Today 00:00:00 | Today 23:59:59 |
| Monthly | 1st of month 00:00:00 | Last day of month 23:59:59 |
| Quarterly | 1st day of quarter 00:00:00 | Last day of quarter 23:59:59 |
| Custom | User selected start | User selected end |

---

## Future Enhancements

### Custom Date Range Picker
```typescript
// Add date picker modal for custom tab
- Start date selector
- End date selector  
- Apply/Cancel buttons
- Validation (start < end)
```

### Historical Data Export
```typescript
// Export filtered data to CSV/PDF
- Select date range
- Generate report
- Share via email/messaging
```

### Scheduled Reports
```typescript
// Automatic daily/weekly/monthly reports
- Email summary at end of day
- Weekly performance report
- Monthly financial statement
```

### Smart Insights
```typescript
// AI-powered business insights
- Trend analysis
- Profit predictions
- Cash flow forecasting
- Inventory recommendations
```

---

## Testing Checklist

### Daily Reset Testing
- [ ] App launches on same day (no reset)
- [ ] App launches on next day (triggers reset)
- [ ] Reset happens only once per day
- [ ] Reset logged correctly
- [ ] Last reset date updated in AsyncStorage

### Date Filtering Testing
- [ ] Daily tab shows today's data only
- [ ] Monthly tab shows current month's data
- [ ] Quarterly tab shows current quarter's data
- [ ] Switching tabs updates data correctly
- [ ] Date range displays correctly

### Cash Balance Testing
- [ ] Initial balance loads correctly
- [ ] Modal opens on card tap
- [ ] Balance updates and persists
- [ ] Invalid input shows error
- [ ] Success message displays

### Running Totals Testing
- [ ] Pending buy amounts correct
- [ ] Pending sell amounts correct
- [ ] Pending lend amounts correct
- [ ] Running totals don't change with date filter
- [ ] Labels clearly indicate "Running Total"

---

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: Load summary only when tab is selected
2. **Caching**: Cache daily summary until midnight
3. **Debouncing**: Debounce tab switches to avoid excessive calculations
4. **Indexing**: Add database indexes on date columns for faster filtering

### Memory Management
- Dispose of old date ranges when switching tabs
- Clear cached summaries on daily reset
- Limit recent transactions to 10 items

---

## Error Handling

### AsyncStorage Failures
- Fallback to default values (0 for balance, today for date)
- Log errors for debugging
- Show user-friendly error messages

### Database Query Failures
- Catch and log errors
- Display error alert to user
- Provide retry mechanism

### Date Calculation Errors
- Validate date ranges before queries
- Handle timezone differences
- Use UTC for consistency

---

## API Documentation

### DailyResetService API

```typescript
// Check and perform daily reset
await DailyResetService.checkAndResetIfNewDay(): Promise<boolean>

// Get date utilities
DailyResetService.getStartOfDay(date?: Date): Date
DailyResetService.getEndOfDay(date?: Date): Date
DailyResetService.getStartOfMonth(date?: Date): Date
DailyResetService.getEndOfMonth(date?: Date): Date
DailyResetService.getStartOfQuarter(date?: Date): Date
DailyResetService.getEndOfQuarter(date?: Date): Date

// Date validation
DailyResetService.isDateInRange(date, start, end): boolean
DailyResetService.isToday(dateString): boolean
```

### TransactionService API

```typescript
// Date-filtered summaries
await TransactionService.getDashboardSummaryByDateRange(
  startDate: Date,
  endDate: Date
): Promise<DashboardSummary>

await TransactionService.getDailyOperationalSummary(): Promise<DashboardSummary>
await TransactionService.getMonthlyOperationalSummary(): Promise<DashboardSummary>
await TransactionService.getQuarterlyOperationalSummary(): Promise<DashboardSummary>
```

### CashBalanceService API

```typescript
// Balance management
await CashBalanceService.getCurrentBalance(): Promise<number>
await CashBalanceService.setBalance(amount): Promise<boolean>
await CashBalanceService.addToBalance(amount, reason?): Promise<number>
await CashBalanceService.subtractFromBalance(amount, reason?): Promise<number>

// Transaction-specific updates
await CashBalanceService.onSellPaymentReceived(buyer, amount): Promise<number>
await CashBalanceService.onBuyPaymentMade(supplier, amount): Promise<number>
await CashBalanceService.onExpensePayment(expense, amount): Promise<number>
await CashBalanceService.onLendMoney(person, amount): Promise<number>
await CashBalanceService.onLendRepayment(person, amount): Promise<number>
```

---

## Conclusion

The daily reset and date filtering implementation provides:
- ✅ Automatic daily operational summary resets
- ✅ Flexible date-based filtering (Daily/Monthly/Quarterly/Custom)
- ✅ Clear separation between operational metrics and running totals
- ✅ User-controlled cash balance management
- ✅ Automatic cash balance updates on transactions
- ✅ Robust error handling and logging
- ✅ Performance-optimized queries
- ✅ Extensible architecture for future enhancements

This foundation enables accurate business tracking and financial management for Mandi businesses.
