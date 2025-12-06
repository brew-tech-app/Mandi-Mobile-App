import {SQLiteDatabase} from 'react-native-sqlite-storage';

/**
 * Repository for remote <-> local id mappings
 * Keeps a simple table to avoid duplicate creations and provide robust dedupe
 */
export class RemoteLocalMappingRepository {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  public async createMapping(remoteId: string, localId: string, entityType: string): Promise<void> {
    try {
      await this.db.executeSql(
        `INSERT OR REPLACE INTO remote_local_mappings (remote_id, local_id, entity_type, created_at) VALUES (?, ?, ?, datetime('now'))`,
        [remoteId, localId, entityType],
      );
    } catch (e) {
      console.error('Failed to create mapping', e);
      throw e;
    }
  }

  public async findByRemoteId(remoteId: string): Promise<{remoteId: string; localId: string; entityType: string} | null> {
    try {
      const res = await this.db.executeSql(
        `SELECT remote_id as remoteId, local_id as localId, entity_type as entityType FROM remote_local_mappings WHERE remote_id = ? LIMIT 1`,
        [remoteId],
      );
      if (res[0].rows.length > 0) {
        return res[0].rows.item(0);
      }
      return null;
    } catch (e) {
      console.error('Failed to query mapping by remote id', e);
      return null;
    }
  }

  public async findByLocalId(localId: string): Promise<{remoteId: string; localId: string; entityType: string} | null> {
    try {
      const res = await this.db.executeSql(
        `SELECT remote_id as remoteId, local_id as localId, entity_type as entityType FROM remote_local_mappings WHERE local_id = ? LIMIT 1`,
        [localId],
      );
      if (res[0].rows.length > 0) {
        return res[0].rows.item(0);
      }
      return null;
    } catch (e) {
      console.error('Failed to query mapping by local id', e);
      return null;
    }
  }

  public async deleteByRemoteId(remoteId: string): Promise<void> {
    try {
      await this.db.executeSql(`DELETE FROM remote_local_mappings WHERE remote_id = ?`, [remoteId]);
    } catch (e) {
      console.error('Failed to delete mapping', e);
    }
  }
}

export default RemoteLocalMappingRepository;
