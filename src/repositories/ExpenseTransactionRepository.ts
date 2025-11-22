import {SQLiteDatabase} from 'react-native-sqlite-storage';
import {BaseRepository} from '../database/BaseRepository';
import {ExpenseTransaction, TransactionType} from '../models/Transaction';

/**
 * Expense Transaction Repository
 * Handles all database operations for Expense transactions
 */
export class ExpenseTransactionRepository extends BaseRepository<ExpenseTransaction> {
  protected tableName = 'expense_transactions';

  constructor(database: SQLiteDatabase) {
    super(database);
  }

  public async create(
    entity: Omit<ExpenseTransaction, 'id' | 'createdAt' | 'updatedAt' | 'transactionType'>,
  ): Promise<ExpenseTransaction> {
    const id = this.generateId();
    const timestamp = this.getCurrentTimestamp();

    const query = `
      INSERT INTO ${this.tableName} (
        id, expense_category, expense_name, amount, paid_to, payment_mode,
        receipt_number, date, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      entity.expenseCategory,
      entity.expenseName,
      entity.amount,
      entity.paidTo || null,
      entity.paymentMode,
      entity.receiptNumber || null,
      entity.date,
      entity.description || null,
      timestamp,
      timestamp,
    ];

    await this.executeQuery(query, params);
    const created = await this.findById(id);
    if (!created) {
      throw new Error('Failed to create expense transaction');
    }
    return created;
  }

  public async findById(id: string): Promise<ExpenseTransaction | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const result = await this.executeQuery(query, [id]);

    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result[0].rows.item(0));
  }

  public async findAll(): Promise<ExpenseTransaction[]> {
    const query = `SELECT * FROM ${this.tableName} ORDER BY date DESC`;
    const result = await this.executeQuery(query);

    const transactions: ExpenseTransaction[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      transactions.push(this.mapRowToEntity(result[0].rows.item(i)));
    }
    return transactions;
  }

  public async update(id: string, entity: Partial<ExpenseTransaction>): Promise<ExpenseTransaction> {
    const timestamp = this.getCurrentTimestamp();
    const updateFields: string[] = [];
    const params: any[] = [];

    if (entity.expenseCategory !== undefined) {
      updateFields.push('expense_category = ?');
      params.push(entity.expenseCategory);
    }
    if (entity.expenseName !== undefined) {
      updateFields.push('expense_name = ?');
      params.push(entity.expenseName);
    }
    if (entity.amount !== undefined) {
      updateFields.push('amount = ?');
      params.push(entity.amount);
    }
    if (entity.paidTo !== undefined) {
      updateFields.push('paid_to = ?');
      params.push(entity.paidTo);
    }
    if (entity.paymentMode !== undefined) {
      updateFields.push('payment_mode = ?');
      params.push(entity.paymentMode);
    }
    if (entity.receiptNumber !== undefined) {
      updateFields.push('receipt_number = ?');
      params.push(entity.receiptNumber);
    }
    if (entity.date !== undefined) {
      updateFields.push('date = ?');
      params.push(entity.date);
    }
    if (entity.description !== undefined) {
      updateFields.push('description = ?');
      params.push(entity.description);
    }

    updateFields.push('updated_at = ?');
    params.push(timestamp);
    params.push(id);

    const query = `UPDATE ${this.tableName} SET ${updateFields.join(', ')} WHERE id = ?`;
    await this.executeQuery(query, params);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to update expense transaction');
    }
    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    await this.executeQuery(query, [id]);
    return true;
  }

  public async findByCategory(category: string): Promise<ExpenseTransaction[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE expense_category = ? ORDER BY date DESC`;
    const result = await this.executeQuery(query, [category]);

    const transactions: ExpenseTransaction[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      transactions.push(this.mapRowToEntity(result[0].rows.item(i)));
    }
    return transactions;
  }

  public async getTotalAmount(): Promise<number> {
    const query = `SELECT SUM(amount) as total FROM ${this.tableName}`;
    const result = await this.executeQuery(query);
    return result[0].rows.item(0).total || 0;
  }

  public async getTotalByCategory(): Promise<Record<string, number>> {
    const query = `SELECT expense_category, SUM(amount) as total FROM ${this.tableName} GROUP BY expense_category`;
    const result = await this.executeQuery(query);

    const categoryTotals: Record<string, number> = {};
    for (let i = 0; i < result[0].rows.length; i++) {
      const row = result[0].rows.item(i);
      categoryTotals[row.expense_category] = row.total;
    }
    return categoryTotals;
  }

  private mapRowToEntity(row: any): ExpenseTransaction {
    return {
      id: row.id,
      transactionType: TransactionType.EXPENSE,
      expenseCategory: row.expense_category,
      expenseName: row.expense_name,
      amount: row.amount,
      paidTo: row.paid_to,
      paymentMode: row.payment_mode as 'CASH' | 'ONLINE' | 'CHEQUE',
      receiptNumber: row.receipt_number,
      date: row.date,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
