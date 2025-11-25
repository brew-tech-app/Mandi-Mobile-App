# Buy Transaction Receipt Feature

## Overview
This feature allows users to view, edit, and share professional receipts for buy transactions. Receipts can be accessed from the buy transactions list and by searching with phone numbers.

## Features Implemented

### 1. Buy Transaction Receipt Screen
- **File**: `src/screens/BuyTransactionReceiptScreen.tsx`
- **Purpose**: Display detailed, formatted receipt for any buy transaction
- **Features**:
  - Professional receipt layout with all transaction details
  - Date, phone number, farmer name, and address display
  - Multiple grain transaction support (shows all grain entries)
  - Gross amount calculation
  - Deduction breakdown (labour charges + commission)
  - Advance paid display (if applicable)
  - Final net payable amount
  - Payment status badge
  - Share functionality (share receipt as text)
  - Edit button (navigates to edit screen)

**Receipt Format**:
```
Date: DD/MM/YYYY
Phone Number: XXXXXXXXXX
Farmer Name: [Name]
Address: [Address]

Grain Details:
1. [Grain Type] - [Bags] x [Weight] + [Extra] @ [Price]
2. [Grain Type] - [Bags] x [Weight] + [Extra] @ [Price]
...

Total Gross Amount: ₹[Amount]

Deductions:
  Total Labour Charges: ₹[Amount]
  Total Commission: ₹[Amount]
  Total Deduction: ₹[Amount]

Advance Paid: ₹[Amount] (if > 0)

Final Net Payable: ₹[Amount]
Status: [PENDING/PARTIAL/COMPLETED]
```

### 2. Buy Transactions List Screen
- **File**: `src/screens/BuyTransactionsListScreen.tsx`
- **Purpose**: List all buy transactions with search functionality
- **Features**:
  - Display all buy transactions sorted by date (newest first)
  - Search by phone number (real-time filtering)
  - Transaction cards showing:
    - Farmer name and phone
    - Date, grain type, quantity
    - Total amount and balance
    - Payment status badge (color-coded)
  - Tap on transaction → View receipt
  - Long press on transaction → Delete confirmation
  - Empty state with "Add Transaction" button
  - Results count display
  - Auto-refresh when screen comes into focus

### 3. Edit Buy Transaction Screen
- **File**: `src/screens/EditBuyTransactionScreen.tsx`
- **Purpose**: Edit payment and deduction details
- **Features**:
  - Display read-only transaction details
  - Editable fields:
    - Paid Amount
    - Commission Amount
    - Labour Charges (auto-rounds to nearest 10)
  - Real-time balance calculation
  - Automatic payment status update:
    - Balance = 0 → COMPLETED
    - 0 < Paid < Total → PARTIAL
    - Paid = 0 → PENDING
  - Validation (paid cannot exceed total)
  - Delete transaction option with confirmation
  - Success feedback on save

### 4. Transaction Service Updates
- **File**: `src/services/TransactionService.ts`
- **New Methods**:
  - `getBuyTransactionById(id)`: Fetch single transaction by ID
  - `searchBuyTransactionsByPhone(phone)`: Search transactions by phone number
- **Updated Methods**:
  - `getDashboardSummary()`: Now includes labour charges calculation

### 5. Navigation Integration
- **File**: `src/navigation/AppNavigator.tsx`
- **Updates**:
  - Added `BuyTransactionReceipt` screen to Buy Stack
  - Added `EditBuyTransaction` screen to Buy Stack
  - Updated `BuyTransactionsList` to use new list screen

## User Flow

### View Receipt
1. Navigate to "Buy" tab
2. View list of all buy transactions
3. Tap on any transaction card
4. **Receipt screen opens** with full details
5. Options: Share or Edit

### Search by Phone Number
1. Navigate to "Buy" tab
2. Enter phone number in search bar
3. List automatically filters to matching transactions
4. Tap to view receipt

### Edit Transaction
1. View transaction receipt OR long-press in list
2. Tap "Edit" button on receipt
3. Modify payment details:
   - Update paid amount
   - Adjust commission
   - Change labour charges
4. Balance auto-calculates
5. Save changes
6. Return to list (refreshes automatically)

### Share Receipt
1. View transaction receipt
2. Tap "Share" button
3. Receipt formatted as text
4. Share via any app (WhatsApp, SMS, Email, etc.)

### Delete Transaction
1. **Option 1**: Long-press transaction in list
2. **Option 2**: View receipt → Edit → Delete button
3. Confirm deletion
4. Transaction removed from database and cloud

## Technical Details

### Data Model
- Uses existing `BuyTransaction` interface
- Fields used in receipt:
  - `id`, `date`, `supplierName`, `supplierPhone`
  - `grainType`, `quantity`, `totalAmount`
  - `paidAmount`, `balanceAmount`, `paymentStatus`
  - `commissionAmount`, `labourCharges`
  - `description` (parsed for multiple transactions)

### Multiple Transaction Support
- Checks if `description` contains '@' symbol
- Parses description to extract individual grain entries
- Displays each transaction separately in receipt
- Example description format: "Wheat - 50 Bags x 50kg + 10kg @ ₹2500/Quintal; Rice - 30 Bags x 60kg @ ₹3000/Quintal"

### Receipt Sharing
- Generates plain text receipt using `generateReceiptText()` method
- Formats with Unicode characters for visual appeal
- Uses React Native's `Share` API
- Works across all platforms (iOS/Android)

### Auto-sync to Cloud
- All edits automatically sync to Firebase (non-blocking)
- Deletions also removed from cloud backup
- Graceful fallback if user offline

## Styling
- Consistent with app theme
- Color-coded status badges:
  - Green: COMPLETED
  - Yellow: PARTIAL
  - Red: PENDING
- Professional receipt layout
- Responsive design
- Clean card-based UI

## Error Handling
- Loading states with spinners
- Error alerts for failed operations
- Transaction not found handling
- Network error graceful degradation
- Validation before save

## Future Enhancements
- [ ] Print receipt (PDF generation)
- [ ] Email receipt directly
- [ ] Receipt templates (customizable format)
- [ ] Bulk operations (select multiple)
- [ ] Export to CSV/Excel
- [ ] Receipt history tracking
- [ ] QR code on receipt
- [ ] Multi-language support
- [ ] Receipt preview before share

## Testing Checklist
- [x] View receipt for single grain transaction
- [x] View receipt for multiple grain transactions
- [x] Share receipt functionality
- [x] Edit transaction (update paid amount)
- [x] Edit commission and labour charges
- [x] Balance calculation accuracy
- [x] Payment status auto-update
- [x] Search by phone number
- [x] Delete transaction from list
- [x] Delete transaction from edit screen
- [x] Empty state display
- [x] Navigation flow
- [x] Auto-refresh on screen focus
- [x] Real-time search filtering

## Files Changed/Created

### Created Files:
1. `src/screens/BuyTransactionReceiptScreen.tsx` (388 lines)
2. `src/screens/BuyTransactionsListScreen.tsx` (287 lines)
3. `src/screens/EditBuyTransactionScreen.tsx` (332 lines)
4. `BUY_TRANSACTION_RECEIPT.md` (this file)

### Modified Files:
1. `src/services/TransactionService.ts`
   - Added `getBuyTransactionById()` method
   - Added `searchBuyTransactionsByPhone()` method
   - Updated `getDashboardSummary()` to include labour charges

2. `src/navigation/AppNavigator.tsx`
   - Imported new screens
   - Added routes to Buy Stack Navigator

## Usage Examples

### Access Receipt from Code:
```typescript
// Navigate to receipt screen
navigation.navigate('BuyTransactionReceipt', {
  transactionId: 'transaction-id-here'
});
```

### Search Transactions:
```typescript
// In BuyTransactionsListScreen
const filtered = transactions.filter(t =>
  t.supplierPhone && t.supplierPhone.includes(searchPhone.trim())
);
```

### Edit Transaction:
```typescript
// Update transaction
await TransactionService.updateBuyTransaction(transactionId, {
  paidAmount: 5000,
  balanceAmount: 2000,
  paymentStatus: 'PARTIAL',
  commissionAmount: 500,
  labourCharges: 300,
});
```

## Accessibility
- Clear labels for all fields
- Touch targets sized appropriately
- Loading states announced
- Error messages clear and actionable
- Keyboard navigation support

## Performance
- Lazy loading of transaction data
- Efficient filtering (in-memory, no DB query)
- Debounced search (no lag)
- Optimized renders (React best practices)
- Background cloud sync (non-blocking)

---

**Last Updated**: 25 November 2025  
**Version**: 1.0.0  
**Status**: ✅ Implemented and Tested
