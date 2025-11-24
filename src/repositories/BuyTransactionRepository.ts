import {SQLiteDatabase} from 'react-native-sqlite-storage';
import {BaseRepository} from '../database/BaseRepository';
import {BuyTransaction, TransactionType, PaymentStatus} from '../models/Transaction';

/**
 * Buy Transaction Repository
 * Handles all database operations for Buy transactions
 * Following Single Responsibility Principle
 */
export class BuyTransactionRepository extends BaseRepository<BuyTransaction> {
  protected tableName = 'buy_transactions';

  constructor(database: SQLiteDatabase) {
    super(database);
  }

  /**
   * Create a new buy transaction
   */
  public async create(
    entity: Omit<BuyTransaction, 'id' | 'createdAt' | 'updatedAt' | 'transactionType'>,
  ): Promise<BuyTransaction> {
    const id = this.generateId();
    const timestamp = this.getCurrentTimestamp();

    const query = `
      INSERT INTO ${this.tableName} (
        id, supplier_name, supplier_phone, grain_type, quantity, rate_per_quintal,
        total_amount, paid_amount, balance_amount, payment_status, vehicle_number,
        invoice_number, commission_amount, labour_charges, date, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      entity.supplierName,
      entity.supplierPhone || null,
      entity.grainType,
      entity.quantity,
      entity.ratePerQuintal,
      entity.totalAmount,
      entity.paidAmount || 0,
      entity.balanceAmount,
      entity.paymentStatus,
      entity.vehicleNumber || null,
      entity.invoiceNumber || null,
      entity.commissionAmount || 0,
      entity.labourCharges || 0,
      entity.date,
      entity.description || null,
      timestamp,
      timestamp,
    ];

    await this.executeQuery(query, params);
    const created = await this.findById(id);
    if (!created) {
      throw new Error('Failed to create buy transaction');
    }
    return created;
  }

  /**
   * Find buy transaction by ID
   */
  public async findById(id: string): Promise<BuyTransaction | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const result = await this.executeQuery(query, [id]);

    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result[0].rows.item(0));
  }

  /**
   * Find all buy transactions
   */
  public async findAll(): Promise<BuyTransaction[]> {
    const query = `SELECT * FROM ${this.tableName} ORDER BY date DESC`;
    const result = await this.executeQuery(query);

    const transactions: BuyTransaction[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      transactions.push(this.mapRowToEntity(result[0].rows.item(i)));
    }
    return transactions;
  }

  /**
   * Update buy transaction
   */
  public async update(id: string, entity: Partial<BuyTransaction>): Promise<BuyTransaction> {
    const timestamp = this.getCurrentTimestamp();
    const updateFields: string[] = [];
    const params: any[] = [];

    if (entity.supplierName !== undefined) {
      updateFields.push('supplier_name = ?');
      params.push(entity.supplierName);
    }
    if (entity.supplierPhone !== undefined) {
      updateFields.push('supplier_phone = ?');
      params.push(entity.supplierPhone);
    }
    if (entity.grainType !== undefined) {
      updateFields.push('grain_type = ?');
      params.push(entity.grainType);
    }
    if (entity.quantity !== undefined) {
      updateFields.push('quantity = ?');
      params.push(entity.quantity);
    }
    if (entity.ratePerQuintal !== undefined) {
      updateFields.push('rate_per_quintal = ?');
      params.push(entity.ratePerQuintal);
    }
    if (entity.totalAmount !== undefined) {
      updateFields.push('total_amount = ?');
      params.push(entity.totalAmount);
    }
    if (entity.paidAmount !== undefined) {
      updateFields.push('paid_amount = ?');
      params.push(entity.paidAmount);
    }
    if (entity.balanceAmount !== undefined) {
      updateFields.push('balance_amount = ?');
      params.push(entity.balanceAmount);
    }
    if (entity.paymentStatus !== undefined) {
      updateFields.push('payment_status = ?');
      params.push(entity.paymentStatus);
    }
    if (entity.vehicleNumber !== undefined) {
      updateFields.push('vehicle_number = ?');
      params.push(entity.vehicleNumber);
    }
    if (entity.invoiceNumber !== undefined) {
      updateFields.push('invoice_number = ?');
      params.push(entity.invoiceNumber);
    }
    if (entity.commissionAmount !== undefined) {
      updateFields.push('commission_amount = ?');
      params.push(entity.commissionAmount);
    }
    if (entity.labourCharges !== undefined) {
      updateFields.push('labour_charges = ?');
      params.push(entity.labourCharges);
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
      throw new Error('Failed to update buy transaction');
    }
    return updated;
  }

  /**
   * Delete buy transaction
   */
  public async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    await this.executeQuery(query, [id]);
    return true;
  }

  /**
   * Find transactions by supplier name
   */
  public async findBySupplier(supplierName: string): Promise<BuyTransaction[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE supplier_name LIKE ? ORDER BY date DESC`;
    const result = await this.executeQuery(query, [`%${supplierName}%`]);

    const transactions: BuyTransaction[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      transactions.push(this.mapRowToEntity(result[0].rows.item(i)));
    }
    return transactions;
  }

  /**
   * Find pending transactions
   */
  public async findPending(): Promise<BuyTransaction[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE payment_status != ? ORDER BY date DESC`;
    const result = await this.executeQuery(query, [PaymentStatus.COMPLETED]);

    const transactions: BuyTransaction[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      transactions.push(this.mapRowToEntity(result[0].rows.item(i)));
    }
    return transactions;
  }

  /**
   * Get total buy amount
   */
  public async getTotalAmount(): Promise<number> {
    const query = `SELECT SUM(total_amount) as total FROM ${this.tableName}`;
    const result = await this.executeQuery(query);
    return result[0].rows.item(0).total || 0;
  }

  /**
   * Get total pending amount
   */
  public async getTotalPendingAmount(): Promise<number> {
    const query = `SELECT SUM(balance_amount) as total FROM ${this.tableName} WHERE payment_status != ?`;
    const result = await this.executeQuery(query, [PaymentStatus.COMPLETED]);
    return result[0].rows.item(0).total || 0;
  }

  /**
   * Map database row to BuyTransaction entity
   */
  private mapRowToEntity(row: any): BuyTransaction {
    return {
      id: row.id,
      transactionType: TransactionType.BUY,
      supplierName: row.supplier_name,
      supplierPhone: row.supplier_phone,
      grainType: row.grain_type,
      quantity: row.quantity,
      ratePerQuintal: row.rate_per_quintal,
      totalAmount: row.total_amount,
      paidAmount: row.paid_amount,
      balanceAmount: row.balance_amount,
      paymentStatus: row.payment_status as PaymentStatus,
      vehicleNumber: row.vehicle_number,
      invoiceNumber: row.invoice_number,
      commissionAmount: row.commission_amount,
      labourCharges: row.labour_charges,
      date: row.date,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
