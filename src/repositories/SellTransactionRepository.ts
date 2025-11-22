import {SQLiteDatabase} from 'react-native-sqlite-storage';
import {BaseRepository} from '../database/BaseRepository';
import {SellTransaction, TransactionType, PaymentStatus} from '../models/Transaction';

/**
 * Sell Transaction Repository
 * Handles all database operations for Sell transactions
 */
export class SellTransactionRepository extends BaseRepository<SellTransaction> {
  protected tableName = 'sell_transactions';

  constructor(database: SQLiteDatabase) {
    super(database);
  }

  public async create(
    entity: Omit<SellTransaction, 'id' | 'createdAt' | 'updatedAt' | 'transactionType'>,
  ): Promise<SellTransaction> {
    const id = this.generateId();
    const timestamp = this.getCurrentTimestamp();

    const query = `
      INSERT INTO ${this.tableName} (
        id, buyer_name, buyer_phone, grain_type, quantity, rate_per_quintal,
        total_amount, received_amount, balance_amount, payment_status, vehicle_number,
        invoice_number, date, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      entity.buyerName,
      entity.buyerPhone || null,
      entity.grainType,
      entity.quantity,
      entity.ratePerQuintal,
      entity.totalAmount,
      entity.receivedAmount || 0,
      entity.balanceAmount,
      entity.paymentStatus,
      entity.vehicleNumber || null,
      entity.invoiceNumber || null,
      entity.date,
      entity.description || null,
      timestamp,
      timestamp,
    ];

    await this.executeQuery(query, params);
    const created = await this.findById(id);
    if (!created) {
      throw new Error('Failed to create sell transaction');
    }
    return created;
  }

  public async findById(id: string): Promise<SellTransaction | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const result = await this.executeQuery(query, [id]);

    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result[0].rows.item(0));
  }

  public async findAll(): Promise<SellTransaction[]> {
    const query = `SELECT * FROM ${this.tableName} ORDER BY date DESC`;
    const result = await this.executeQuery(query);

    const transactions: SellTransaction[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      transactions.push(this.mapRowToEntity(result[0].rows.item(i)));
    }
    return transactions;
  }

  public async update(id: string, entity: Partial<SellTransaction>): Promise<SellTransaction> {
    const timestamp = this.getCurrentTimestamp();
    const updateFields: string[] = [];
    const params: any[] = [];

    if (entity.buyerName !== undefined) {
      updateFields.push('buyer_name = ?');
      params.push(entity.buyerName);
    }
    if (entity.buyerPhone !== undefined) {
      updateFields.push('buyer_phone = ?');
      params.push(entity.buyerPhone);
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
    if (entity.receivedAmount !== undefined) {
      updateFields.push('received_amount = ?');
      params.push(entity.receivedAmount);
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
      throw new Error('Failed to update sell transaction');
    }
    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    await this.executeQuery(query, [id]);
    return true;
  }

  public async findByBuyer(buyerName: string): Promise<SellTransaction[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE buyer_name LIKE ? ORDER BY date DESC`;
    const result = await this.executeQuery(query, [`%${buyerName}%`]);

    const transactions: SellTransaction[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      transactions.push(this.mapRowToEntity(result[0].rows.item(i)));
    }
    return transactions;
  }

  public async findPending(): Promise<SellTransaction[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE payment_status != ? ORDER BY date DESC`;
    const result = await this.executeQuery(query, [PaymentStatus.COMPLETED]);

    const transactions: SellTransaction[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      transactions.push(this.mapRowToEntity(result[0].rows.item(i)));
    }
    return transactions;
  }

  public async getTotalAmount(): Promise<number> {
    const query = `SELECT SUM(total_amount) as total FROM ${this.tableName}`;
    const result = await this.executeQuery(query);
    return result[0].rows.item(0).total || 0;
  }

  public async getTotalPendingAmount(): Promise<number> {
    const query = `SELECT SUM(balance_amount) as total FROM ${this.tableName} WHERE payment_status != ?`;
    const result = await this.executeQuery(query, [PaymentStatus.COMPLETED]);
    return result[0].rows.item(0).total || 0;
  }

  private mapRowToEntity(row: any): SellTransaction {
    return {
      id: row.id,
      transactionType: TransactionType.SELL,
      buyerName: row.buyer_name,
      buyerPhone: row.buyer_phone,
      grainType: row.grain_type,
      quantity: row.quantity,
      ratePerQuintal: row.rate_per_quintal,
      totalAmount: row.total_amount,
      receivedAmount: row.received_amount,
      balanceAmount: row.balance_amount,
      paymentStatus: row.payment_status as PaymentStatus,
      vehicleNumber: row.vehicle_number,
      invoiceNumber: row.invoice_number,
      date: row.date,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
