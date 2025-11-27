import {BaseRepository} from '../database/BaseRepository';
import {Expense, CreateExpenseDTO, UpdateExpenseDTO} from '../models/Expense';
import AuthService from '../services/AuthService';
import {SQLiteDatabase} from 'react-native-sqlite-storage';

/**
 * Expense Repository
 * Handles database operations for expense transactions
 */
export class ExpenseRepository extends BaseRepository<Expense> {
  protected tableName = 'expenses';

  constructor(db: SQLiteDatabase) {
    super(db);
  }

  /**
   * Create a new expense
   */
  async create(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    const user = await AuthService.getCurrentUser();
    const userId = user?.uid || 'local_user';
    const now = new Date().toISOString();
    const id = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const expense: Expense = {
      id,
      date: data.date,
      amount: data.amount,
      notes: data.notes,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const query = `
      INSERT INTO expenses (id, date, amount, notes, userId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.executeSql(query, [
      expense.id,
      expense.date,
      expense.amount,
      expense.notes,
      expense.userId,
      expense.createdAt,
      expense.updatedAt,
    ]);

    return expense;
  }

  /**
   * Find all expenses for the current user
   */
  async findAll(): Promise<Expense[]> {
    const user = await AuthService.getCurrentUser();
    const userId = user?.uid || 'local_user';

    const query = `
      SELECT * FROM expenses 
      WHERE userId = ? 
      ORDER BY date DESC, createdAt DESC
    `;

    const result = await this.db.executeSql(query, [userId]);
    const expenses: Expense[] = [];

    for (let i = 0; i < result[0].rows.length; i++) {
      expenses.push(result[0].rows.item(i));
    }

    return expenses;
  }

  /**
   * Get all expenses (alias for compatibility)
   */
  async getAll(): Promise<Expense[]> {
    return this.findAll();
  }

  /**
   * Find expense by ID
   */
  async findById(id: string): Promise<Expense | null> {
    const query = `SELECT * FROM expenses WHERE id = ?`;
    const result = await this.db.executeSql(query, [id]);

    if (result[0].rows.length === 0) {
      return null;
    }

    return result[0].rows.item(0);
  }

  /**
   * Get expense by ID (alias for compatibility)
   */
  async getById(id: string): Promise<Expense | null> {
    return this.findById(id);
  }

  /**
   * Update expense
   */
  async update(id: string, data: Partial<Expense>): Promise<Expense> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.date !== undefined) {
      updates.push('date = ?');
      values.push(data.date);
    }
    if (data.amount !== undefined) {
      updates.push('amount = ?');
      values.push(data.amount);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes);
    }

    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());

    values.push(id);

    const query = `UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`;
    await this.db.executeSql(query, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Expense not found after update');
    }
    return updated;
  }

  /**
   * Delete expense
   */
  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM expenses WHERE id = ?`;
    const result = await this.db.executeSql(query, [id]);
    return result[0].rowsAffected > 0;
  }

  /**
   * Get expenses by date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    const user = await AuthService.getCurrentUser();
    const userId = user?.uid || 'local_user';

    const query = `
      SELECT * FROM expenses 
      WHERE userId = ? 
      AND date >= ? 
      AND date <= ?
      ORDER BY date DESC, createdAt DESC
    `;

    const result = await this.db.executeSql(query, [
      userId,
      startDate.toISOString(),
      endDate.toISOString(),
    ]);

    const expenses: Expense[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      expenses.push(result[0].rows.item(i));
    }

    return expenses;
  }

  /**
   * Get total expenses for date range
   */
  async getTotalByDateRange(startDate: Date, endDate: Date): Promise<number> {
    const user = await AuthService.getCurrentUser();
    const userId = user?.uid || 'local_user';

    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE userId = ? 
      AND date >= ? 
      AND date <= ?
    `;

    const result = await this.db.executeSql(query, [
      userId,
      startDate.toISOString(),
      endDate.toISOString(),
    ]);

    return result[0].rows.item(0).total;
  }
}
