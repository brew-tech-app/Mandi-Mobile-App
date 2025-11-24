/**
 * Farmer Model
 * Stores farmer information for quick reference in transactions
 */
export interface Farmer {
  id: string;
  phoneNumber: string;
  name: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database Table Schema for Farmers
 */
export const FarmerTableSchema = `
  CREATE TABLE IF NOT EXISTS farmers (
    id TEXT PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;
