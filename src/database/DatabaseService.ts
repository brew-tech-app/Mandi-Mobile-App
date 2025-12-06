import SQLite, {SQLiteDatabase} from 'react-native-sqlite-storage';
import {TableSchemas} from '../models/Transaction';
import {FarmerTableSchema} from '../models/Farmer';
import {PaymentTableSchema} from '../models/Payment';
import {MerchantTableSchema} from '../models/Merchant';
import {CustomerTableSchema} from '../models/Customer';

/**
 * Database Service implementing Single Responsibility Principle
 * Responsible only for database connection and initialization
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private database: SQLiteDatabase | null = null;
  private readonly dbName = 'mandi_app.db';

  private constructor() {
    SQLite.enablePromise(true);
    SQLite.DEBUG(true);
  }

  /**
   * Singleton pattern to ensure single database instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize database connection
   */
  public async initDatabase(): Promise<SQLiteDatabase> {
    if (this.database) {
      return this.database;
    }

    try {
      this.database = await SQLite.openDatabase({
        name: this.dbName,
        location: 'default',
      });

      console.log('Database opened successfully');
      await this.createTables();
      return this.database;
    } catch (error) {
      console.error('Error opening database:', error);
      throw error;
    }
  }

  /**
   * Create all required tables
   */
  private async createTables(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.executeSql(FarmerTableSchema);
      await this.database.executeSql(MerchantTableSchema);
      await this.database.executeSql(CustomerTableSchema);
      await this.database.executeSql(TableSchemas.BUY_TRANSACTIONS);
      await this.database.executeSql(TableSchemas.SELL_TRANSACTIONS);
      await this.database.executeSql(TableSchemas.LEND_TRANSACTIONS);
      await this.database.executeSql(TableSchemas.EXPENSE_TRANSACTIONS);
      await this.database.executeSql(PaymentTableSchema);
      
      // Run migrations
      await this.runMigrations();
      
      console.log('All tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      // Migration: Add labour_charges_settled column to buy_transactions
      await this.database.executeSql(`
        ALTER TABLE buy_transactions ADD COLUMN labour_charges_settled INTEGER DEFAULT 0
      `).catch(() => {
        // Column already exists, ignore error
        console.log('labour_charges_settled column already exists');
      });
      
      // Migration: Ensure invoice_number uniqueness for buy_transactions and sell_transactions
      // Use IF NOT EXISTS so this is safe to run multiple times
      await this.database.executeSql(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_buy_invoice_number ON buy_transactions(invoice_number)
      `).catch((e) => {
        console.log('idx_buy_invoice_number already exists or could not be created', e?.message || e);
      });

      await this.database.executeSql(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_sell_invoice_number ON sell_transactions(invoice_number)
      `).catch((e) => {
        console.log('idx_sell_invoice_number already exists or could not be created', e?.message || e);
      });
      // Migration: Create remote-local mapping table to keep track of cloud <-> local id mappings
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS remote_local_mappings (
          remote_id TEXT PRIMARY KEY,
          local_id TEXT,
          entity_type TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).catch((e) => {
        console.log('remote_local_mappings table already exists or could not be created', e?.message || e);
      });
      // Migration: Create sync logs table for troubleshooting
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS sync_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          level TEXT,
          message TEXT,
          meta TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).catch((e) => {
        console.log('sync_logs table already exists or could not be created', e?.message || e);
      });
      
      console.log('Migrations completed successfully');
    } catch (error) {
      console.error('Error running migrations:', error);
      // Don't throw, migrations might fail if already applied
    }
  }

  /**
   * Get database instance
   */
  public getDatabase(): SQLiteDatabase {
    if (!this.database) {
      throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return this.database;
  }

  /**
   * Close database connection
   */
  public async closeDatabase(): Promise<void> {
    if (this.database) {
      await this.database.close();
      this.database = null;
      console.log('Database closed successfully');
    }
  }

  /**
   * Drop all tables (for testing/development)
   */
  public async dropAllTables(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.executeSql('DROP TABLE IF EXISTS buy_transactions');
      await this.database.executeSql('DROP TABLE IF EXISTS sell_transactions');
      await this.database.executeSql('DROP TABLE IF EXISTS lend_transactions');
      await this.database.executeSql('DROP TABLE IF EXISTS expense_transactions');
      console.log('All tables dropped successfully');
    } catch (error) {
      console.error('Error dropping tables:', error);
      throw error;
    }
  }

  /**
   * Reset database (drop and recreate tables)
   */
  public async resetDatabase(): Promise<void> {
    await this.dropAllTables();
    await this.createTables();
    console.log('Database reset successfully');
  }
}

export default DatabaseService.getInstance();
