import SQLite, {SQLiteDatabase} from 'react-native-sqlite-storage';
import {TableSchemas} from '../models/Transaction';
import {FarmerTableSchema} from '../models/Farmer';

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
      await this.database.executeSql(TableSchemas.BUY_TRANSACTIONS);
      await this.database.executeSql(TableSchemas.SELL_TRANSACTIONS);
      await this.database.executeSql(TableSchemas.LEND_TRANSACTIONS);
      await this.database.executeSql(TableSchemas.EXPENSE_TRANSACTIONS);
      console.log('All tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
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
