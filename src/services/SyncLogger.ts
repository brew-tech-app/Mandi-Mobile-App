import DatabaseService from '../database/DatabaseService';

export default class SyncLogger {
  static async logInfo(message: string, meta?: any) {
    await this.log('INFO', message, meta);
  }

  static async logError(message: string, meta?: any) {
    await this.log('ERROR', message, meta);
  }

  private static async log(level: string, message: string, meta?: any) {
    try {
      await DatabaseService.initDatabase();
      const db = DatabaseService.getDatabase();
      const metaStr = meta ? JSON.stringify(meta) : null;
      await db.executeSql(`INSERT INTO sync_logs (level, message, meta) VALUES (?, ?, ?)`, [level, message, metaStr]);
    } catch (e) {
      // If DB logging fails, fallback to console
      console[level === 'ERROR' ? 'error' : 'log']('SyncLogger failed:', e, message, meta);
    }
  }

  static async getRecentLogs(limit = 100) {
    try {
      await DatabaseService.initDatabase();
      const db = DatabaseService.getDatabase();
      const res = await db.executeSql(`SELECT id, level, message, meta, created_at FROM sync_logs ORDER BY id DESC LIMIT ?`, [limit]);
      const rows = res[0].rows;
      const out: Array<any> = [];
      for (let i = 0; i < rows.length; i++) out.push(rows.item(i));
      return out;
    } catch (e) {
      console.error('Failed to read sync logs', e);
      return [];
    }
  }
}
