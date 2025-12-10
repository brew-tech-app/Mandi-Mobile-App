/**
 * Transaction Types Enum
 */
export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  LEND = 'LEND',
  EXPENSE = 'EXPENSE',
}

/**
 * Payment Status Enum
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  COMPLETED = 'COMPLETED',
}

/**
 * Base Transaction Interface
 * Following Interface Segregation Principle
 */
export interface BaseTransaction {
  id: string;
  transactionType: TransactionType;
  date: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Buy Transaction Model
 * Used when buying grain from farmers/suppliers
 */
export interface BuyTransaction extends BaseTransaction {
  transactionType: TransactionType.BUY;
  supplierName: string;
  supplierPhone?: string;
  grainType: string;
  quantity: number; // in quintals
  ratePerQuintal: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  vehicleNumber?: string;
  invoiceNumber?: string;
  commissionAmount?: number; // Commission earned from buy transaction
  labourCharges?: number; // Labour charges in buy transaction
  labourChargesSettled?: boolean; // Whether labour charges have been settled
}

/**
 * Sell Transaction Model
 * Used when selling grain to buyers
 */
export interface SellTransaction extends BaseTransaction {
  transactionType: TransactionType.SELL;
  buyerName: string;
  buyerPhone?: string;
  grainType: string;
  quantity: number; // in quintals
  ratePerQuintal: number;
  totalAmount: number;
  receivedAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  vehicleNumber?: string;
  invoiceNumber?: string;
  commissionAmount?: number; // Commission earned from sell transaction
  labourCharges?: number; // Labour charges in sell transaction
}

/**
 * Lend Transaction Model
 * Used when lending money or grain
 */
export interface LendTransaction extends BaseTransaction {
  transactionType: TransactionType.LEND;
  personName: string;
  personPhone?: string;
  lendType: 'MONEY' | 'GRAIN';
  invoiceNumber?: string;
  amount?: number; // for money lending
  grainType?: string; // for grain lending
  quantity?: number; // for grain lending (in quintals)
  expectedReturnDate?: string;
  returnedAmount: number;
  returnedQuantity: number;
  balanceAmount: number;
  balanceQuantity: number;
  paymentStatus: PaymentStatus;
}

/**
 * Expense Transaction Model
 * Used for recording various business expenses
 */
export interface ExpenseTransaction extends BaseTransaction {
  transactionType: TransactionType.EXPENSE;
  expenseCategory: string;
  expenseName: string;
  amount: number;
  paidTo?: string;
  paymentMode: 'CASH' | 'ONLINE' | 'CHEQUE';
  receiptNumber?: string;
}

/**
 * Union type for all transaction types
 */
export type Transaction = BuyTransaction | SellTransaction | LendTransaction | ExpenseTransaction;

/**
 * Database Table Schemas
 */
export const TableSchemas = {
  BUY_TRANSACTIONS: `
    CREATE TABLE IF NOT EXISTS buy_transactions (
      id TEXT PRIMARY KEY,
      supplier_name TEXT NOT NULL,
      supplier_phone TEXT,
      grain_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      rate_per_quintal REAL NOT NULL,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      balance_amount REAL NOT NULL,
      payment_status TEXT NOT NULL,
      vehicle_number TEXT,
      invoice_number TEXT,
      commission_amount REAL DEFAULT 0,
      labour_charges REAL DEFAULT 0,
      labour_charges_settled INTEGER DEFAULT 0,
      date TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  SELL_TRANSACTIONS: `
    CREATE TABLE IF NOT EXISTS sell_transactions (
      id TEXT PRIMARY KEY,
      buyer_name TEXT NOT NULL,
      buyer_phone TEXT,
      grain_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      rate_per_quintal REAL NOT NULL,
      total_amount REAL NOT NULL,
      received_amount REAL DEFAULT 0,
      balance_amount REAL NOT NULL,
      payment_status TEXT NOT NULL,
      vehicle_number TEXT,
      invoice_number TEXT,
      commission_amount REAL DEFAULT 0,
      labour_charges REAL DEFAULT 0,
      date TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  LEND_TRANSACTIONS: `
    CREATE TABLE IF NOT EXISTS lend_transactions (
      id TEXT PRIMARY KEY,
      person_name TEXT NOT NULL,
      person_phone TEXT,
      lend_type TEXT NOT NULL,
      amount REAL,
      grain_type TEXT,
      quantity REAL,
      invoice_number TEXT,
      expected_return_date TEXT,
      returned_amount REAL DEFAULT 0,
      returned_quantity REAL DEFAULT 0,
      balance_amount REAL DEFAULT 0,
      balance_quantity REAL DEFAULT 0,
      payment_status TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  EXPENSE_TRANSACTIONS: `
    CREATE TABLE IF NOT EXISTS expense_transactions (
      id TEXT PRIMARY KEY,
      transaction_type TEXT NOT NULL,
      expense_category TEXT NOT NULL,
      expense_name TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_to TEXT,
      payment_mode TEXT NOT NULL,
      receipt_number TEXT,
      date TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  EXPENSES: `
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `,
};

/**
 * Dashboard Summary Interface
 */
export interface DashboardSummary {
  totalBuyAmount: number;
  totalSellAmount: number;
  totalLendAmount: number;
  totalExpenseAmount: number;
  totalPendingBuyAmount: number;
  totalPendingSellAmount: number;
  totalPendingLendAmount: number;
  totalBuyLabourCharges: number;
  totalBuyCommission: number;
  totalSellCommission: number;
  totalSellLabourCharges: number;
  totalInterestEarned?: number;
  profit: number;
  recentTransactions: Transaction[];
}
