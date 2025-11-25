/**
 * Customer Model
 * Stores customer information for sell transactions
 */
export interface Customer {
  id: string;
  phoneNumber: string;
  name: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database Table Schema for Customers
 */
export const CustomerTableSchema = `
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;
