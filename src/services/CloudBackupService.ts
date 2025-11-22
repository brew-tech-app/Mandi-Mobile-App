import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Transaction} from '../models/Transaction';
import {SyncStatus, CloudTransaction} from '../models/User';
import AuthService from './AuthService';
import TransactionService from './TransactionService';

/**
 * Cloud Backup Service
 * Handles synchronization between local SQLite and Firebase Firestore
 */
class CloudBackupService {
  private syncInProgress = false;
  private readonly LAST_SYNC_KEY = 'last_sync_timestamp';

  /**
   * Upload single transaction to cloud (for instant sync)
   */
  async uploadSingleTransaction(transaction: Transaction, userId: string): Promise<void> {
    try {
      const docRef = firestore()
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .doc(transaction.id);

      const cloudTransaction: CloudTransaction = {
        localId: transaction.id,
        userId: userId,
        transactionType: transaction.transactionType,
        data: transaction,
        syncStatus: SyncStatus.SYNCED,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        syncedAt: new Date().toISOString(),
      };

      await docRef.set(cloudTransaction, {merge: true});
      console.log(`Uploaded transaction ${transaction.id} to cloud`);
    } catch (error) {
      console.error('Failed to upload transaction to cloud:', error);
      throw error;
    }
  }

  /**
   * Delete single transaction from cloud
   */
  async deleteSingleTransaction(transactionId: string, userId: string): Promise<void> {
    try {
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .doc(transactionId)
        .delete();
      console.log(`Deleted transaction ${transactionId} from cloud`);
    } catch (error) {
      console.error('Failed to delete transaction from cloud:', error);
      throw error;
    }
  }

  /**
   * Upload all local transactions to cloud
   */
  async backupToCloud(): Promise<void> {
    if (this.syncInProgress) {
      return;
    }

    const user = await AuthService.getCurrentUser();
    if (!user) {
      throw new Error('User must be logged in to backup');
    }

    this.syncInProgress = true;

    try {
      // Get all transactions from local database
      const transactions = await TransactionService.getAllTransactions();

      const batch = firestore().batch();
      let batchCount = 0;

      for (const transaction of transactions) {
        const docRef = firestore()
          .collection('users')
          .doc(user.uid)
          .collection('transactions')
          .doc(transaction.id);

        const cloudTransaction: CloudTransaction = {
          localId: transaction.id,
          userId: user.uid,
          transactionType: transaction.transactionType,
          data: transaction,
          syncStatus: SyncStatus.SYNCED,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
          syncedAt: new Date().toISOString(),
        };

        batch.set(docRef, cloudTransaction, {merge: true});
        batchCount++;

        // Firebase batch limit is 500 operations
        if (batchCount === 500) {
          await batch.commit();
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      await this.updateLastSyncTime();
      console.log(`Backed up ${transactions.length} transactions to cloud`);
    } catch (error) {
      console.error('Cloud backup failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Restore all transactions from cloud to local database
   */
  async restoreFromCloud(): Promise<number> {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      throw new Error('User must be logged in to restore');
    }

    try {
      const snapshot = await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('transactions')
        .get();

      let restoredCount = 0;

      for (const doc of snapshot.docs) {
        const cloudTransaction = doc.data() as CloudTransaction;
        const transaction = cloudTransaction.data as Transaction;

        try {
          // Check if transaction already exists
          const existing = await this.getLocalTransaction(transaction);
          
          if (!existing) {
            // Create new transaction based on type
            await this.createLocalTransaction(transaction);
            restoredCount++;
          }
        } catch (error) {
          console.error(`Failed to restore transaction ${transaction.id}:`, error);
        }
      }

      await this.updateLastSyncTime();
      console.log(`Restored ${restoredCount} transactions from cloud`);
      return restoredCount;
    } catch (error) {
      console.error('Cloud restore failed:', error);
      throw error;
    }
  }

  /**
   * Sync: Two-way sync between local and cloud
   */
  async syncData(): Promise<{uploaded: number; downloaded: number}> {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      throw new Error('User must be logged in to sync');
    }

    if (this.syncInProgress) {
      return {uploaded: 0, downloaded: 0};
    }

    this.syncInProgress = true;

    try {
      // Get last sync time
      const lastSyncTime = await this.getLastSyncTime();

      // Get local transactions modified after last sync
      const localTransactions = await TransactionService.getAllTransactions();
      const newLocalTransactions = lastSyncTime
        ? localTransactions.filter(t => new Date(t.updatedAt) > new Date(lastSyncTime))
        : localTransactions;

      // Upload new/modified local transactions
      let uploaded = 0;
      for (const transaction of newLocalTransactions) {
        await this.uploadTransaction(user.uid, transaction);
        uploaded++;
      }

      // Download new/modified cloud transactions
      const cloudQuery = lastSyncTime
        ? firestore()
            .collection('users')
            .doc(user.uid)
            .collection('transactions')
            .where('updatedAt', '>', lastSyncTime)
        : firestore()
            .collection('users')
            .doc(user.uid)
            .collection('transactions');

      const snapshot = await cloudQuery.get();
      let downloaded = 0;

      for (const doc of snapshot.docs) {
        const cloudTransaction = doc.data() as CloudTransaction;
        const transaction = cloudTransaction.data as Transaction;

        const existing = await this.getLocalTransaction(transaction);
        if (!existing) {
          await this.createLocalTransaction(transaction);
          downloaded++;
        } else {
          // Update if cloud version is newer
          if (new Date(transaction.updatedAt) > new Date(existing.updatedAt)) {
            await this.updateLocalTransaction(transaction);
            downloaded++;
          }
        }
      }

      await this.updateLastSyncTime();
      return {uploaded, downloaded};
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<string | null> {
    return await AsyncStorage.getItem(this.LAST_SYNC_KEY);
  }

  /**
   * Update last sync timestamp
   */
  private async updateLastSyncTime(): Promise<void> {
    await AsyncStorage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());
  }

  /**
   * Upload single transaction to cloud
   */
  private async uploadTransaction(userId: string, transaction: Transaction): Promise<void> {
    const cloudTransaction: CloudTransaction = {
      localId: transaction.id,
      userId,
      transactionType: transaction.transactionType,
      data: transaction,
      syncStatus: SyncStatus.SYNCED,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      syncedAt: new Date().toISOString(),
    };

    await firestore()
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .doc(transaction.id)
      .set(cloudTransaction, {merge: true});
  }

  /**
   * Get local transaction by ID
   */
  private async getLocalTransaction(transaction: Transaction): Promise<any> {
    switch (transaction.transactionType) {
      case 'BUY':
        return await TransactionService.getBuyTransaction(transaction.id);
      case 'SELL':
        return await TransactionService.getSellTransaction(transaction.id);
      case 'LEND':
        return await TransactionService.getLendTransaction(transaction.id);
      case 'EXPENSE':
        return await TransactionService.getExpenseTransaction(transaction.id);
      default:
        return null;
    }
  }

  /**
   * Create local transaction
   */
  private async createLocalTransaction(transaction: Transaction): Promise<void> {
    const {id, createdAt, updatedAt, transactionType, ...data} = transaction;
    
    switch (transactionType) {
      case 'BUY':
        await TransactionService.createBuyTransaction(data as any);
        break;
      case 'SELL':
        await TransactionService.createSellTransaction(data as any);
        break;
      case 'LEND':
        await TransactionService.createLendTransaction(data as any);
        break;
      case 'EXPENSE':
        await TransactionService.createExpenseTransaction(data as any);
        break;
    }
  }

  /**
   * Update local transaction
   */
  private async updateLocalTransaction(transaction: Transaction): Promise<void> {
    const {id, createdAt, updatedAt, transactionType, ...data} = transaction;
    
    switch (transactionType) {
      case 'BUY':
        await TransactionService.updateBuyTransaction(id, data as any);
        break;
      case 'SELL':
        await TransactionService.updateSellTransaction(id, data as any);
        break;
      case 'LEND':
        await TransactionService.updateLendTransaction(id, data as any);
        break;
      case 'EXPENSE':
        await TransactionService.updateExpenseTransaction(id, data as any);
        break;
    }
  }

  /**
   * Delete all local data (use with caution)
   */
  async clearLocalData(): Promise<void> {
    await AsyncStorage.removeItem(this.LAST_SYNC_KEY);
    // Note: You may want to add methods to clear all transactions from SQLite
  }

  /**
   * Check if sync is needed
   */
  async needsSync(): Promise<boolean> {
    const lastSync = await this.getLastSyncTime();
    if (!lastSync) return true;

    const hoursSinceSync = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > 24; // Sync if more than 24 hours
  }
}

export default new CloudBackupService();
