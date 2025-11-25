/**
 * Payment Model
 * Records individual payment settlements for transactions
 */
export interface Payment {
  id: string;
  transactionId: string;
  transactionType: 'BUY' | 'SELL' | 'LEND';
  amount: number;
  paymentDate: string;
  paymentMode: 'CASH' | 'ONLINE' | 'CHEQUE';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database Table Schema for Payments
 */
export const PaymentTableSchema = `
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_date TEXT NOT NULL,
    payment_mode TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES buy_transactions(id) ON DELETE CASCADE
  )
`;
