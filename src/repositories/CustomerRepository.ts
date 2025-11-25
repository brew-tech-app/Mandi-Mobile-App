import {SQLiteDatabase} from 'react-native-sqlite-storage';
import {BaseRepository} from '../database/BaseRepository';
import {Customer} from '../models/Customer';

/**
 * Customer Repository
 * Handles all database operations for Customers
 */
export class CustomerRepository extends BaseRepository<Customer> {
  protected tableName = 'customers';

  constructor(database: SQLiteDatabase) {
    super(database);
  }

  public async create(
    entity: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Customer> {
    const id = this.generateId();
    const timestamp = this.getCurrentTimestamp();

    const query = `
      INSERT INTO ${this.tableName} (
        id, phone_number, name, address, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      entity.phoneNumber,
      entity.name,
      entity.address,
      timestamp,
      timestamp,
    ];

    await this.executeQuery(query, params);
    const created = await this.findById(id);
    if (!created) {
      throw new Error('Failed to create customer');
    }
    return created;
  }

  public async findById(id: string): Promise<Customer | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const result = await this.executeQuery(query, [id]);

    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result[0].rows.item(0));
  }

  public async findAll(): Promise<Customer[]> {
    const query = `SELECT * FROM ${this.tableName} ORDER BY name ASC`;
    const result = await this.executeQuery(query);

    const customers: Customer[] = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      customers.push(this.mapRowToEntity(result[0].rows.item(i)));
    }
    return customers;
  }

  public async update(id: string, entity: Partial<Customer>): Promise<Customer> {
    const timestamp = this.getCurrentTimestamp();
    const updateFields: string[] = [];
    const params: any[] = [];

    if (entity.phoneNumber !== undefined) {
      updateFields.push('phone_number = ?');
      params.push(entity.phoneNumber);
    }
    if (entity.name !== undefined) {
      updateFields.push('name = ?');
      params.push(entity.name);
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
      throw new Error('Failed to update customer');
    }
    return updated;
  }

  public async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
    await this.executeQuery(query, [id]);
    return true;
  }

  public async findByPhoneNumber(phoneNumber: string): Promise<Customer | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE phone_number = ?`;
    const result = await this.executeQuery(query, [phoneNumber]);

    if (result[0].rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result[0].rows.item(0));
  }

  private mapRowToEntity(row: any): Customer {
    return {
      id: row.id,
      phoneNumber: row.phone_number,
      name: row.name,
      address: row.address,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
