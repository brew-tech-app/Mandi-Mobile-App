import {SQLiteDatabase} from 'react-native-sqlite-storage';

/**
 * Base Repository Interface
 * Following Interface Segregation Principle - clients shouldn't depend on interfaces they don't use
 */
export interface IRepository<T> {
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
}

/**
 * Abstract Base Repository implementing common CRUD operations
 * Following Open/Closed Principle - open for extension, closed for modification
 */
export abstract class BaseRepository<T> implements IRepository<T> {
  protected db: SQLiteDatabase;
  protected abstract tableName: string;

  constructor(database: SQLiteDatabase) {
    this.db = database;
  }

  /**
   * Generate unique ID
   */
  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current timestamp
   */
  protected getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Abstract methods to be implemented by child classes
   */
  abstract create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract update(id: string, entity: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<boolean>;

  /**
   * Common method to count records
   */
  public async count(): Promise<number> {
    try {
      const result = await this.db.executeSql(
        `SELECT COUNT(*) as count FROM ${this.tableName}`,
      );
      return result[0].rows.item(0).count;
    } catch (error) {
      console.error(`Error counting records in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Execute raw SQL query
   */
  protected async executeQuery(query: string, params: any[] = []): Promise<any> {
    try {
      const result = await this.db.executeSql(query, params);
      return result;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }
}
