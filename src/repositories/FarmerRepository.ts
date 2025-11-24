import {SQLiteDatabase} from 'react-native-sqlite-storage';
import {Farmer} from '../models/Farmer';

/**
 * Farmer Repository
 * Handles CRUD operations for farmers
 */
export class FarmerRepository {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Find farmer by phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<Farmer | null> {
    try {
      const [results] = await this.db.executeSql(
        'SELECT * FROM farmers WHERE phone_number = ? LIMIT 1',
        [phoneNumber],
      );

      if (results.rows.length === 0) {
        return null;
      }

      const row = results.rows.item(0);
      return {
        id: row.id,
        phoneNumber: row.phone_number,
        name: row.name,
        address: row.address,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Error finding farmer by phone:', error);
      throw error;
    }
  }

  /**
   * Create new farmer
   */
  async create(data: Omit<Farmer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Farmer> {
    const id = `farmer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    try {
      await this.db.executeSql(
        `INSERT INTO farmers (id, phone_number, name, address, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, data.phoneNumber, data.name, data.address, now, now],
      );

      return {
        id,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.error('Error creating farmer:', error);
      throw error;
    }
  }

  /**
   * Update farmer
   */
  async update(phoneNumber: string, data: Partial<Farmer>): Promise<Farmer> {
    const now = new Date().toISOString();

    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (data.name) {
        updates.push('name = ?');
        values.push(data.name);
      }
      if (data.address) {
        updates.push('address = ?');
        values.push(data.address);
      }

      updates.push('updated_at = ?');
      values.push(now);
      values.push(phoneNumber);

      await this.db.executeSql(
        `UPDATE farmers SET ${updates.join(', ')} WHERE phone_number = ?`,
        values,
      );

      const farmer = await this.findByPhoneNumber(phoneNumber);
      if (!farmer) {
        throw new Error('Farmer not found after update');
      }

      return farmer;
    } catch (error) {
      console.error('Error updating farmer:', error);
      throw error;
    }
  }

  /**
   * Get all farmers
   */
  async findAll(): Promise<Farmer[]> {
    try {
      const [results] = await this.db.executeSql('SELECT * FROM farmers ORDER BY name');

      const farmers: Farmer[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        farmers.push({
          id: row.id,
          phoneNumber: row.phone_number,
          name: row.name,
          address: row.address,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      }

      return farmers;
    } catch (error) {
      console.error('Error getting all farmers:', error);
      throw error;
    }
  }
}
