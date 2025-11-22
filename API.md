# API Documentation - Transaction Service

## Overview
The `TransactionService` is the main service class that handles all transaction-related operations in the Mandi Mobile App.

## Initialization

### `initializeDatabase(): Promise<void>`
Initializes the SQLite database and all repositories.

```typescript
await TransactionService.initializeDatabase();
```

## Buy Transaction Operations

### `createBuyTransaction(data): Promise<BuyTransaction>`
Creates a new buy transaction.

**Parameters:**
```typescript
{
  supplierName: string;
  supplierPhone?: string;
  grainType: string;
  quantity: number;
  ratePerQuintal: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  vehicleNumber?: string;
  invoiceNumber?: string;
  date: string;
  description?: string;
}
```

**Example:**
```typescript
const buyTransaction = await TransactionService.createBuyTransaction({
  supplierName: 'Ram Kumar',
  supplierPhone: '9876543210',
  grainType: 'Wheat',
  quantity: 100,
  ratePerQuintal: 2500,
  totalAmount: 250000,
  paidAmount: 100000,
  balanceAmount: 150000,
  paymentStatus: PaymentStatus.PARTIAL,
  date: '2025-11-21',
  description: 'First purchase of the season'
});
```

### `getBuyTransaction(id): Promise<BuyTransaction | null>`
Retrieves a buy transaction by ID.

### `getAllBuyTransactions(): Promise<BuyTransaction[]>`
Retrieves all buy transactions.

### `updateBuyTransaction(id, data): Promise<BuyTransaction>`
Updates a buy transaction.

### `deleteBuyTransaction(id): Promise<boolean>`
Deletes a buy transaction.

### `getPendingBuyTransactions(): Promise<BuyTransaction[]>`
Retrieves all pending buy transactions.

### `getBuyTransactionsBySupplier(supplierName): Promise<BuyTransaction[]>`
Retrieves buy transactions for a specific supplier.

## Sell Transaction Operations

### `createSellTransaction(data): Promise<SellTransaction>`
Creates a new sell transaction.

**Parameters:**
```typescript
{
  buyerName: string;
  buyerPhone?: string;
  grainType: string;
  quantity: number;
  ratePerQuintal: number;
  totalAmount: number;
  receivedAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  vehicleNumber?: string;
  invoiceNumber?: string;
  date: string;
  description?: string;
}
```

**Example:**
```typescript
const sellTransaction = await TransactionService.createSellTransaction({
  buyerName: 'Shyam Traders',
  buyerPhone: '9123456789',
  grainType: 'Rice',
  quantity: 50,
  ratePerQuintal: 3000,
  totalAmount: 150000,
  receivedAmount: 150000,
  balanceAmount: 0,
  paymentStatus: PaymentStatus.COMPLETED,
  date: '2025-11-21'
});
```

### Other Sell Methods
Similar to Buy transactions:
- `getSellTransaction(id)`
- `getAllSellTransactions()`
- `updateSellTransaction(id, data)`
- `deleteSellTransaction(id)`
- `getPendingSellTransactions()`
- `getSellTransactionsByBuyer(buyerName)`

## Lend Transaction Operations

### `createLendTransaction(data): Promise<LendTransaction>`
Creates a new lend transaction.

**Parameters:**
```typescript
{
  personName: string;
  personPhone?: string;
  lendType: 'MONEY' | 'GRAIN';
  amount?: number;
  grainType?: string;
  quantity?: number;
  expectedReturnDate?: string;
  returnedAmount: number;
  returnedQuantity: number;
  balanceAmount: number;
  balanceQuantity: number;
  paymentStatus: PaymentStatus;
  date: string;
  description?: string;
}
```

**Money Lending Example:**
```typescript
const lendTransaction = await TransactionService.createLendTransaction({
  personName: 'Mohan Singh',
  personPhone: '9988776655',
  lendType: 'MONEY',
  amount: 50000,
  expectedReturnDate: '2025-12-21',
  returnedAmount: 0,
  returnedQuantity: 0,
  balanceAmount: 50000,
  balanceQuantity: 0,
  paymentStatus: PaymentStatus.PENDING,
  date: '2025-11-21'
});
```

**Grain Lending Example:**
```typescript
const lendTransaction = await TransactionService.createLendTransaction({
  personName: 'Rajesh Kumar',
  lendType: 'GRAIN',
  grainType: 'Wheat',
  quantity: 20,
  expectedReturnDate: '2025-12-01',
  returnedAmount: 0,
  returnedQuantity: 0,
  balanceAmount: 0,
  balanceQuantity: 20,
  paymentStatus: PaymentStatus.PENDING,
  date: '2025-11-21'
});
```

### Other Lend Methods
- `getLendTransaction(id)`
- `getAllLendTransactions()`
- `updateLendTransaction(id, data)`
- `deleteLendTransaction(id)`
- `getPendingLendTransactions()`
- `getLendTransactionsByPerson(personName)`

## Expense Transaction Operations

### `createExpenseTransaction(data): Promise<ExpenseTransaction>`
Creates a new expense transaction.

**Parameters:**
```typescript
{
  expenseCategory: string;
  expenseName: string;
  amount: number;
  paidTo?: string;
  paymentMode: 'CASH' | 'ONLINE' | 'CHEQUE';
  receiptNumber?: string;
  date: string;
  description?: string;
}
```

**Example:**
```typescript
const expenseTransaction = await TransactionService.createExpenseTransaction({
  expenseCategory: 'Transport',
  expenseName: 'Truck Hire',
  amount: 5000,
  paidTo: 'ABC Transport',
  paymentMode: 'CASH',
  date: '2025-11-21',
  description: 'Grain delivery to warehouse'
});
```

### Other Expense Methods
- `getExpenseTransaction(id)`
- `getAllExpenseTransactions()`
- `updateExpenseTransaction(id, data)`
- `deleteExpenseTransaction(id)`
- `getExpenseTransactionsByCategory(category)`
- `getExpenseTotalsByCategory()`

## Dashboard Operations

### `getDashboardSummary(): Promise<DashboardSummary>`
Retrieves comprehensive dashboard summary.

**Returns:**
```typescript
{
  totalBuyAmount: number;
  totalSellAmount: number;
  totalLendAmount: number;
  totalExpenseAmount: number;
  totalPendingBuyAmount: number;
  totalPendingSellAmount: number;
  totalPendingLendAmount: number;
  profit: number;
  recentTransactions: Transaction[];
}
```

**Example:**
```typescript
const summary = await TransactionService.getDashboardSummary();
console.log('Net Profit:', summary.profit);
console.log('Pending Payments:', summary.totalPendingBuyAmount);
```

### `getAllTransactions(): Promise<Transaction[]>`
Retrieves all transactions sorted by date.

## Enums

### PaymentStatus
```typescript
enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  COMPLETED = 'COMPLETED'
}
```

### TransactionType
```typescript
enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  LEND = 'LEND',
  EXPENSE = 'EXPENSE'
}
```

## Error Handling

All methods throw errors that should be caught:

```typescript
try {
  const transaction = await TransactionService.createBuyTransaction(data);
} catch (error) {
  console.error('Failed to create transaction:', error);
  // Handle error appropriately
}
```

## Best Practices

1. **Always Initialize**: Call `initializeDatabase()` before using any transaction methods
2. **Error Handling**: Always use try-catch blocks
3. **Validation**: Validate data before calling service methods
4. **Atomic Updates**: Update payment status and amounts together
5. **Consistent Dates**: Use ISO date format (YYYY-MM-DD)

## Common Patterns

### Creating Transaction with Validation
```typescript
const createTransaction = async (data) => {
  // Validate
  if (!data.supplierName || data.supplierName.trim() === '') {
    throw new Error('Supplier name is required');
  }
  if (data.quantity <= 0) {
    throw new Error('Quantity must be positive');
  }
  
  // Calculate amounts
  data.totalAmount = data.quantity * data.ratePerQuintal;
  data.balanceAmount = data.totalAmount - data.paidAmount;
  data.paymentStatus = data.balanceAmount === 0 
    ? PaymentStatus.COMPLETED 
    : data.paidAmount > 0 
      ? PaymentStatus.PARTIAL 
      : PaymentStatus.PENDING;
  
  // Create transaction
  return await TransactionService.createBuyTransaction(data);
};
```

### Updating Payment
```typescript
const updatePayment = async (id, additionalPayment) => {
  const transaction = await TransactionService.getBuyTransaction(id);
  if (!transaction) throw new Error('Transaction not found');
  
  const newPaidAmount = transaction.paidAmount + additionalPayment;
  const newBalanceAmount = transaction.totalAmount - newPaidAmount;
  const newStatus = newBalanceAmount === 0 
    ? PaymentStatus.COMPLETED 
    : PaymentStatus.PARTIAL;
  
  return await TransactionService.updateBuyTransaction(id, {
    paidAmount: newPaidAmount,
    balanceAmount: newBalanceAmount,
    paymentStatus: newStatus
  });
};
```
