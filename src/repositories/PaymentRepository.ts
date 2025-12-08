import {SQLiteDatabase, ResultSet} from 'react-native-sqlite-storage';
import {Payment} from '../models/Payment';
import {BaseRepository} from '../database/BaseRepository';

/**
 * Payment Repository
 * Handles CRUD operations for payment records
 */
export class PaymentRepository extends BaseRepository<Payment> {
  protected tableName = 'payments';

  constructor(database: SQLiteDatabase) {
    super(database);
  }

  /**
   * Create a new payment record
   */
  public async create(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO payments (
        id, transaction_id, transaction_type, amount, payment_date,
        principal_amount, interest_amount, payment_mode, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.executeSql(query, [
      id,
      data.transactionId,
      data.transactionType,
      data.amount,
      data.paymentDate,
      data.principalAmount || 0,
      data.interestAmount || 0,
      data.paymentMode,
      data.notes || null,
      now,
      now,
    ]);

    return {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Find all payments for a specific transaction
   */
  public async findByTransactionId(transactionId: string): Promise<Payment[]> {
    const query = 'SELECT * FROM payments WHERE transaction_id = ? ORDER BY payment_date DESC';
    const [results] = await this.db.executeSql(query, [transactionId]);
    
    const payments: Payment[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      payments.push(this.mapRowToEntity(results.rows.item(i)));
    }
    
    return payments;
  }

  /**
   * Find payment by ID
   */
  public async findById(id: string): Promise<Payment | null> {
    const query = 'SELECT * FROM payments WHERE id = ? LIMIT 1';
    const [results] = await this.db.executeSql(query, [id]);
    
    if (results.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToEntity(results.rows.item(0));
  }

  /**
   * Find all payments
   */
  public async findAll(): Promise<Payment[]> {
    const query = 'SELECT * FROM payments ORDER BY payment_date DESC';
    const [results] = await this.db.executeSql(query);
    
    const payments: Payment[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      payments.push(this.mapRowToEntity(results.rows.item(i)));
    }
    
    return payments;
  }

  /**
   * Update a payment
   */
  public async update(id: string, data: Partial<Payment>): Promise<Payment> {
    const now = new Date().toISOString();
    
    const query = `
      UPDATE payments
      SET amount = COALESCE(?, amount),
          principal_amount = COALESCE(?, principal_amount),
          interest_amount = COALESCE(?, interest_amount),
          payment_date = COALESCE(?, payment_date),
          payment_mode = COALESCE(?, payment_mode),
          notes = COALESCE(?, notes),
          updated_at = ?
      WHERE id = ?
    `;

    await this.db.executeSql(query, [
      data.amount !== undefined ? data.amount : null,
      data.principalAmount !== undefined ? data.principalAmount : null,
      data.interestAmount !== undefined ? data.interestAmount : null,
      data.paymentDate || null,
      data.paymentMode || null,
      data.notes !== undefined ? data.notes : null,
      now,
      id,
    ]);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Payment not found after update');
    }

    return updated;
  }

  /**
   * Delete a payment
   */
  public async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM payments WHERE id = ?';
    const [result] = await this.db.executeSql(query, [id]);
    return result.rowsAffected > 0;
  }

  /**
   * Calculate total paid amount for a transaction
   */
  public async getTotalPaidForTransaction(transactionId: string): Promise<number> {
    const query = 'SELECT SUM(amount) as total FROM payments WHERE transaction_id = ?';
    const [results] = await this.db.executeSql(query, [transactionId]);
    
    if (results.rows.length === 0) {
      return 0;
    }
    
    return results.rows.item(0).total || 0;
  }

  /**
   * Map database row to Payment entity
   */
  protected mapRowToEntity(row: any): Payment {
    return {
      id: row.id,
      transactionId: row.transaction_id,
      transactionType: row.transaction_type,
      amount: row.amount,
      principalAmount: row.principal_amount,
      interestAmount: row.interest_amount,
      paymentDate: row.payment_date,
      paymentMode: row.payment_mode,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
