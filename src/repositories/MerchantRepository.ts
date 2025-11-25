import {SQLiteDatabase} from 'react-native-sqlite-storage';
import {BaseRepository} from '../database/BaseRepository';
import {Merchant} from '../models/Merchant';

/**
 * Merchant Repository
 * Handles all database operations for Merchants
 */
export class MerchantRepository extends BaseRepository<Merchant> {
  protected tableName = 'merchants';

  constructor(database: SQLiteDatabase) {
    super(database);
  }

  public async create(
    entity: Omit<Merchant, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Merchant> {
    const id = this.generateId();
    const timestamp = this.getCurrentTimestamp();

    const query = `
      INSERT INTO ${this.tableName} (
        id, phone_number, firm_name, gstin, address, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      entity.phoneNumber,
      entity.firmName,
      entity.gstin,
      entity.address,
      timestamp,
      timestamp,
    ];

    await this.executeQuery(query, params);
    const created = await this.findById(id);
    if (!created) {
      throw new Error('Failed to create merchant');
    }
    return created;
  }

  public async findById(id: string): Promise<Merchant | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const result = await this.executeQuery(query, [id]);

    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result[0].rows.item(0));
  }

  public async findAll(): Promise<Merchant[]> {
    const query = `SELECT * FROM ${this.tableName} ORDER BY firm_name ASC`;
    const result = await this.executeQuery(query);

    const merchants: Merchant[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      merchants.push(this.mapRowToEntity(result[0].rows.item(i)));
    }
    return merchants;
  }

  public async update(id: string, entity: Partial<Merchant>): Promise<Merchant> {
    const timestamp = this.getCurrentTimestamp();
    const updateFields: string[] = [];
    const params: any[] = [];

    if (entity.phoneNumber !== undefined) {
      updateFields.push('phone_number = ?');
      params.push(entity.phoneNumber);
    }
    if (entity.firmName !== undefined) {
      updateFields.push('firm_name = ?');
      params.push(entity.firmName);
    }
    if (entity.gstin !== undefined) {
      updateFields.push('gstin = ?');
      params.push(entity.gstin);
    }
    if (entity.address !== undefined) {
      updateFields.push('address = ?');
      params.push(entity.address);
    }

    updateFields.push('updated_at = ?');
    params.push(timestamp);
    params.push(id);

    const query = `UPDATE ${this.tableName} SET ${updateFields.join(', ')} WHERE id = ?`;
    await this.executeQuery(query, params);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to update merchant');
    }
    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    await this.executeQuery(query, [id]);
    return true;
  }

  public async findByPhoneNumber(phoneNumber: string): Promise<Merchant | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE phone_number = ?`;
    const result = await this.executeQuery(query, [phoneNumber]);

    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result[0].rows.item(0));
  }

  private mapRowToEntity(row: any): Merchant {
    return {
      id: row.id,
      phoneNumber: row.phone_number,
      firmName: row.firm_name,
      gstin: row.gstin,
      address: row.address,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
