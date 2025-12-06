import {SQLiteDatabase} from 'react-native-sqlite-storage';
import {BaseRepository} from '../database/BaseRepository';
import {LendTransaction, TransactionType, PaymentStatus} from '../models/Transaction';

/**
 * Lend Transaction Repository
 * Handles all database operations for Lend transactions
 */
export class LendTransactionRepository extends BaseRepository<LendTransaction> {
  protected tableName = 'lend_transactions';

  constructor(database: SQLiteDatabase) {
    super(database);
  }

  public async create(
    entity: Omit<LendTransaction, 'id' | 'createdAt' | 'updatedAt' | 'transactionType'>,
  ): Promise<LendTransaction> {
    const id = this.generateId();
    const timestamp = this.getCurrentTimestamp();

    const query = `
      INSERT INTO ${this.tableName} (
        id, person_name, person_phone, lend_type, amount, grain_type, quantity,
        expected_return_date, returned_amount, returned_quantity, balance_amount,
        balance_quantity, payment_status, date, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      entity.personName,
      entity.personPhone || null,
      entity.lendType,
      entity.amount || null,
      entity.grainType || null,
      entity.quantity || null,
      entity.expectedReturnDate || null,
      entity.returnedAmount || 0,
      entity.returnedQuantity || 0,
      entity.balanceAmount || 0,
      entity.balanceQuantity || 0,
      entity.paymentStatus,
      entity.date,
      entity.description || null,
      timestamp,
      timestamp,
    ];

    await this.executeQuery(query, params);
    const created = await this.findById(id);
    if (!created) {
      throw new Error('Failed to create lend transaction');
    }
    return created;
  }

  /**
   * Create a lend transaction preserving id and timestamps (used when restoring from cloud)
   */
  public async createWithId(entity: LendTransaction): Promise<LendTransaction> {
    const columns = [
      'id',
      'person_name',
      'person_phone',
      'lend_type',
      'amount',
      'grain_type',
      'quantity',
      'expected_return_date',
      'returned_amount',
      'returned_quantity',
      'balance_amount',
      'balance_quantity',
      'payment_status',
      'date',
      'description',
      'created_at',
      'updated_at',
    ];

    const params = [
      entity.id,
      entity.personName,
      entity.personPhone || null,
      entity.lendType,
      entity.amount || null,
      entity.grainType || null,
      entity.quantity || null,
      entity.expectedReturnDate || null,
      entity.returnedAmount || 0,
      entity.returnedQuantity || 0,
      entity.balanceAmount || 0,
      entity.balanceQuantity || 0,
      entity.paymentStatus,
      entity.date,
      entity.description || null,
      entity.createdAt,
      entity.updatedAt,
    ];

    await this.insertRowWithId(columns, params);
    const created = await this.findById(entity.id);
    if (!created) {
      throw new Error('Failed to create lend transaction with provided id');
    }
    return created;
  }

  /**
   * Get the last invoice number matching the given prefix (e.g. YYYYMMDDL)
   * Returns the invoice_number string or null if none found
   */
  public async getLastInvoiceNumber(prefix: string): Promise<string | null> {
    const query = `SELECT invoice_number FROM ${this.tableName} WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1`;
    const result = await this.executeQuery(query, [`${prefix}%`]);
    if (result[0].rows.length === 0) return null;
    return result[0].rows.item(0).invoice_number;
  }

  public async findById(id: string): Promise<LendTransaction | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const result = await this.executeQuery(query, [id]);

    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result[0].rows.item(0));
  }

  public async findAll(): Promise<LendTransaction[]> {
    const query = `SELECT * FROM ${this.tableName} ORDER BY date DESC`;
    const result = await this.executeQuery(query);

    const transactions: LendTransaction[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      transactions.push(this.mapRowToEntity(result[0].rows.item(i)));
    }
    return transactions;
  }

  public async update(id: string, entity: Partial<LendTransaction>): Promise<LendTransaction> {
    const timestamp = this.getCurrentTimestamp();
    const updateFields: string[] = [];
    const params: any[] = [];

    if (entity.personName !== undefined) {
      updateFields.push('person_name = ?');
      params.push(entity.personName);
    }
    if (entity.personPhone !== undefined) {
      updateFields.push('person_phone = ?');
      params.push(entity.personPhone);
    }
    if (entity.lendType !== undefined) {
      updateFields.push('lend_type = ?');
      params.push(entity.lendType);
    }
    if (entity.amount !== undefined) {
      updateFields.push('amount = ?');
      params.push(entity.amount);
    }
    if (entity.grainType !== undefined) {
      updateFields.push('grain_type = ?');
      params.push(entity.grainType);
    }
    if (entity.quantity !== undefined) {
      updateFields.push('quantity = ?');
      params.push(entity.quantity);
    }
    if (entity.expectedReturnDate !== undefined) {
      updateFields.push('expected_return_date = ?');
      params.push(entity.expectedReturnDate);
    }
    if (entity.returnedAmount !== undefined) {
      updateFields.push('returned_amount = ?');
      params.push(entity.returnedAmount);
    }
    if (entity.returnedQuantity !== undefined) {
      updateFields.push('returned_quantity = ?');
      params.push(entity.returnedQuantity);
    }
    if (entity.balanceAmount !== undefined) {
      updateFields.push('balance_amount = ?');
      params.push(entity.balanceAmount);
    }
    if (entity.balanceQuantity !== undefined) {
      updateFields.push('balance_quantity = ?');
      params.push(entity.balanceQuantity);
    }
    if (entity.paymentStatus !== undefined) {
      updateFields.push('payment_status = ?');
      params.push(entity.paymentStatus);
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
      throw new Error('Failed to update lend transaction');
    }
    return updated;
  }

  /**
   * Update lend transaction but preserve provided updatedAt timestamp
   * Used when applying cloud updates
   */
  public async updateWithTimestamp(id: string, entity: Partial<LendTransaction>, updatedAt: string): Promise<LendTransaction> {
    const updateFields: string[] = [];
    const params: any[] = [];

    if (entity.personName !== undefined) {
      updateFields.push('person_name = ?');
      params.push(entity.personName);
    }
    if (entity.personPhone !== undefined) {
      updateFields.push('person_phone = ?');
      params.push(entity.personPhone);
    }
    if (entity.lendType !== undefined) {
      updateFields.push('lend_type = ?');
      params.push(entity.lendType);
    }
    if (entity.amount !== undefined) {
      updateFields.push('amount = ?');
      params.push(entity.amount);
    }
    if (entity.grainType !== undefined) {
      updateFields.push('grain_type = ?');
      params.push(entity.grainType);
    }
    if (entity.quantity !== undefined) {
      updateFields.push('quantity = ?');
      params.push(entity.quantity);
    }
    if (entity.expectedReturnDate !== undefined) {
      updateFields.push('expected_return_date = ?');
      params.push(entity.expectedReturnDate);
    }
    if (entity.returnedAmount !== undefined) {
      updateFields.push('returned_amount = ?');
      params.push(entity.returnedAmount);
    }
    if (entity.returnedQuantity !== undefined) {
      updateFields.push('returned_quantity = ?');
      params.push(entity.returnedQuantity);
    }
    if (entity.balanceAmount !== undefined) {
      updateFields.push('balance_amount = ?');
      params.push(entity.balanceAmount);
    }
    if (entity.balanceQuantity !== undefined) {
      updateFields.push('balance_quantity = ?');
      params.push(entity.balanceQuantity);
    }
    if (entity.paymentStatus !== undefined) {
      updateFields.push('payment_status = ?');
      params.push(entity.paymentStatus);
    }
    if (entity.date !== undefined) {
      updateFields.push('date = ?');
      params.push(entity.date);
    }
    if (entity.description !== undefined) {
      updateFields.push('description = ?');
      params.push(entity.description);
    }

    await this.updateRowWithTimestamp(updateFields, params, id, updatedAt);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to update lend transaction');
    }
    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    await this.executeQuery(query, [id]);
    return true;
  }

  public async findByPerson(personName: string): Promise<LendTransaction[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE person_name LIKE ? ORDER BY date DESC`;
    const result = await this.executeQuery(query, [`%${personName}%`]);

    const transactions: LendTransaction[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      transactions.push(this.mapRowToEntity(result[0].rows.item(i)));
    }
    return transactions;
  }

  public async findPending(): Promise<LendTransaction[]> {
    const query = `SELECT * FROM ${this.tableName} WHERE payment_status != ? ORDER BY date DESC`;
    const result = await this.executeQuery(query, [PaymentStatus.COMPLETED]);

    const transactions: LendTransaction[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      transactions.push(this.mapRowToEntity(result[0].rows.item(i)));
    }
    return transactions;
  }

  public async getTotalAmount(): Promise<number> {
    const query = `SELECT SUM(COALESCE(amount, 0)) as total FROM ${this.tableName} WHERE lend_type = 'MONEY'`;
    const result = await this.executeQuery(query);
    return result[0].rows.item(0).total || 0;
  }

  public async getTotalPendingAmount(): Promise<number> {
    const query = `SELECT SUM(COALESCE(balance_amount, 0)) as total FROM ${this.tableName} WHERE payment_status != ? AND lend_type = 'MONEY'`;
    const result = await this.executeQuery(query, [PaymentStatus.COMPLETED]);
    return result[0].rows.item(0).total || 0;
  }

  private mapRowToEntity(row: any): LendTransaction {
    return {
      id: row.id,
      transactionType: TransactionType.LEND,
      personName: row.person_name,
      personPhone: row.person_phone,
      lendType: row.lend_type as 'MONEY' | 'GRAIN',
      amount: row.amount,
      grainType: row.grain_type,
      quantity: row.quantity,
      expectedReturnDate: row.expected_return_date,
      returnedAmount: row.returned_amount,
      returnedQuantity: row.returned_quantity,
      balanceAmount: row.balance_amount,
      balanceQuantity: row.balance_quantity,
      paymentStatus: row.payment_status as PaymentStatus,
      date: row.date,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
