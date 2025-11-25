/**
 * Merchant Model
 * Stores merchant/firm information for sell transactions
 */
export interface Merchant {
  id: string;
  phoneNumber: string;
  firmName: string;
  gstin: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database Table Schema for Merchants
 */
export const MerchantTableSchema = `
  CREATE TABLE IF NOT EXISTS merchants (
    id TEXT PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    firm_name TEXT NOT NULL,
    gstin TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;
