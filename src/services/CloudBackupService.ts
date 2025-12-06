import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {Transaction} from '../models/Transaction';
import {SyncStatus, CloudTransaction} from '../models/User';
import AuthService from './AuthService';
import TransactionService from './TransactionService';
import CashBalanceService from './CashBalanceService';
import DailyResetService from './DailyResetService';

/**
 * Cloud Backup Service
 * Handles synchronization between local SQLite and Firebase Firestore
 */
class CloudBackupService {
  private syncInProgress = false;
  private readonly LAST_SYNC_KEY = 'last_sync_timestamp';
  private readonly PENDING_UPLOADS_KEY = 'pending_uploads';
  private readonly PENDING_META_KEY = 'pending_meta';
  private netUnsubscribe: (() => void) | null = null;

  constructor() {
    // Monitor network connectivity and process pending uploads when connected
    try {
      this.netUnsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected) {
          // Fire-and-forget
          this.processPendingUploads().catch(console.error);
        }
      });
    } catch (error) {
      console.warn('NetInfo not available or failed to subscribe', error);
    }
    // If currently online, attempt to process pending uploads immediately
    try {
      NetInfo.fetch().then(state => {
        if (state.isConnected) {
          this.processPendingUploads().catch(console.error);
        }
      });
    } catch (error) {
      // ignore
    }
  }

  /**
   * Upload single transaction to cloud (for instant sync)
   */
  async uploadSingleTransaction(transaction: Transaction, userId: string): Promise<void> {
    // If offline, enqueue for later upload
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      console.log(`No network - enqueuing transaction ${transaction.id} for later upload`);
      await this.enqueuePendingUpload(transaction.id);
      return;
    }

    try {
      const docRef = firestore()
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .doc(transaction.id);

      const cloudTransaction: any = {
        localId: transaction.id,
        userId: userId,
        transactionType: transaction.transactionType,
        data: transaction,
        syncStatus: SyncStatus.SYNCED,
        createdAt: transaction.createdAt,
        // keep client updatedAt for reference
        updatedAt: transaction.updatedAt,
        // serverUpdatedAt will be set by Firestore to avoid clock skew
        serverUpdatedAt: firestore.FieldValue.serverTimestamp(),
        syncedAt: new Date().toISOString(),
      };

      await docRef.set(cloudTransaction, {merge: true});
      console.log(`Uploaded transaction ${transaction.id} to cloud`);
      // If upload succeeds, remove from pending list if present
      await this.dequeuePendingUpload(transaction.id);
    } catch (error) {
      console.error('Failed to upload transaction to cloud:', error);
      // On network-like errors, enqueue for later
      await this.enqueuePendingUpload(transaction.id);
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
        const cloudTransaction: any = {
          localId: transaction.id,
          userId: user.uid,
          transactionType: transaction.transactionType,
          data: transaction,
          syncStatus: SyncStatus.SYNCED,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
          serverUpdatedAt: firestore.FieldValue.serverTimestamp(),
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
   * Enqueue a transaction id for pending upload
   */
  private async enqueuePendingUpload(transactionId: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(this.PENDING_UPLOADS_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(transactionId)) {
        list.push(transactionId);
        await AsyncStorage.setItem(this.PENDING_UPLOADS_KEY, JSON.stringify(list));
      }
    } catch (error) {
      console.error('Failed to enqueue pending upload:', error);
    }
  }

  /**
   * Remove a transaction id from pending upload list
   */
  private async dequeuePendingUpload(transactionId: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(this.PENDING_UPLOADS_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const idx = list.indexOf(transactionId);
      if (idx !== -1) {
        list.splice(idx, 1);
        await AsyncStorage.setItem(this.PENDING_UPLOADS_KEY, JSON.stringify(list));
      }
    } catch (error) {
      console.error('Failed to dequeue pending upload:', error);
    }
  }

  /**
   * Process pending uploads when network is available
   */
  public async processPendingUploads(): Promise<void> {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    const user = await AuthService.getCurrentUser();
    if (!user) return;

    try {
      const raw = await AsyncStorage.getItem(this.PENDING_UPLOADS_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      for (const id of list) {
        try {
          // Try to find the transaction locally
          const tx = await this.getLocalTransactionById(id);
          if (tx) {
            await this.uploadSingleTransaction(tx, user.uid);
          } else {
            // If no local transaction exists, remove from queue
            await this.dequeuePendingUpload(id);
          }
        } catch (e) {
          console.error('Error processing pending upload for', id, e);
          // continue with next id
        }
      }
      // Process pending meta if any
      try {
        const rawMeta = await AsyncStorage.getItem(this.PENDING_META_KEY);
        if (rawMeta) {
          const meta = JSON.parse(rawMeta);
          if (meta && typeof meta === 'object') {
            const currentUser = await AuthService.getCurrentUser();
            if (currentUser) {
              await this.pushUserMeta(currentUser.uid, meta).catch(e => {
                console.error('Failed to push pending meta', e);
              });
              await AsyncStorage.removeItem(this.PENDING_META_KEY);
            }
          }
        }
      } catch (e) {
        console.error('Failed processing pending meta', e);
      }
    } catch (error) {
      console.error('Failed to process pending uploads:', error);
    }
  }

  /**
   * Push user meta (cash balance / lastBalanceUpdate) to cloud. If offline, store pending meta.
   */
  public async pushUserMeta(userId?: string, metaPayload?: any): Promise<void> {
    try {
      const user = userId ? {uid: userId} : await AuthService.getCurrentUser();
      if (!user) return;

      const netState = await NetInfo.fetch();
      const payload = metaPayload || {
        cashBalance: await CashBalanceService.getCurrentBalance(),
        lastBalanceUpdate: await CashBalanceService.getLastUpdateTime(),
        lastResetDate: await DailyResetService.getLastResetDate(),
        dailyOperationalData: await DailyResetService.getDailyOperationalData(),
        updatedAt: new Date().toISOString(),
      };

      if (!netState.isConnected) {
        // Store pending meta (overwrite latest)
        await AsyncStorage.setItem(this.PENDING_META_KEY, JSON.stringify(payload));
        console.log('No network - queued user meta for later push');
        return;
      }

      const cloudMetaRef = firestore().collection('users').doc(user.uid).collection('meta').doc('state');
      await cloudMetaRef.set(payload, {merge: true});
      console.log('Pushed user meta to cloud');
      // Remove pending meta if any
      await AsyncStorage.removeItem(this.PENDING_META_KEY);
    } catch (error) {
      console.error('Failed to push user meta:', error);
      // Save pending meta for later
      try {
        const payload = metaPayload || {
          cashBalance: await CashBalanceService.getCurrentBalance(),
          lastBalanceUpdate: await CashBalanceService.getLastUpdateTime(),
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(this.PENDING_META_KEY, JSON.stringify(payload));
      } catch (e) {
        console.error('Failed to enqueue pending meta after push failure', e);
      }
    }
  }

  /**
   * Helper to find a local transaction by id across repositories
   */
  private async getLocalTransactionById(id: string): Promise<Transaction | null> {
    // Try each repository via TransactionService
    const buy = await TransactionService.getBuyTransaction(id);
    if (buy) return buy as Transaction;
    const sell = await TransactionService.getSellTransaction(id);
    if (sell) return sell as Transaction;
    const lend = await TransactionService.getLendTransaction(id);
    if (lend) return lend as Transaction;
    const expense = await TransactionService.getExpenseTransaction(id);
    if (expense) return expense as Transaction;
    return null;
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
        // Before uploading, check cloud version's updatedAt to avoid overwriting newer cloud data
        const docRef = firestore()
          .collection('users')
          .doc(user.uid)
          .collection('transactions')
          .doc(transaction.id);

        const cloudDoc = await docRef.get();
        if (!cloudDoc.exists) {
          await this.uploadTransaction(user.uid, transaction);
          uploaded++;
        } else {
          const cloudData = cloudDoc.data() as CloudTransaction;
          const cloudUpdatedAt = cloudData?.updatedAt;
          if (!cloudUpdatedAt || new Date(transaction.updatedAt) > new Date(cloudUpdatedAt)) {
            await this.uploadTransaction(user.uid, transaction);
            uploaded++;
          } else {
            // Cloud has newer or equal version, skip upload
            console.log(`Skipping upload for ${transaction.id}, cloud is newer or equal`);
          }
        }
      }

      // Download new/modified cloud transactions
      // Download cloud transactions (we'll filter client-side using serverUpdatedAt or updatedAt)
      const snapshot = await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('transactions')
        .get();
      let downloaded = 0;

      for (const doc of snapshot.docs) {
        const cloudTransaction = doc.data() as any;
        const transaction = cloudTransaction.data as Transaction;

        // Determine cloud timestamp: prefer serverUpdatedAt (Firestore Timestamp), fallback to updatedAt (ISO string)
        let cloudTime: Date | null = null;
        if (cloudTransaction.serverUpdatedAt && cloudTransaction.serverUpdatedAt.toDate) {
          cloudTime = cloudTransaction.serverUpdatedAt.toDate();
        } else if (cloudTransaction.updatedAt) {
          cloudTime = new Date(cloudTransaction.updatedAt);
        }

        const existing = await this.getLocalTransaction(transaction);
        if (!existing) {
          // If cloudTime exists and is older than lastSyncTime, we may have already synced; still create local
          const created = await this.createLocalTransaction(cloudTransaction);
          if (created) downloaded++;
        } else {
          // Compare timestamps; fallback to comparing updatedAt strings if server timestamp missing
          const existingTime = existing.updatedAt ? new Date(existing.updatedAt) : null;

          if (cloudTime && existingTime) {
            if (cloudTime > existingTime) {
              await this.updateLocalTransaction(transaction);
              downloaded++;
            } else if (existingTime > cloudTime) {
              // Local newer -> upload local
              await this.uploadTransaction(user.uid, existing);
              uploaded++;
            }
          } else {
            // Fallback comparison using ISO strings
            if (new Date(transaction.updatedAt) > new Date(existing.updatedAt)) {
              await this.updateLocalTransaction(transaction);
              downloaded++;
            } else if (new Date(existing.updatedAt) > new Date(transaction.updatedAt)) {
              await this.uploadTransaction(user.uid, existing);
              uploaded++;
            }
          }
        }
      }

      // Sync user meta (cash balance, daily reset)
      try {
        const cloudMetaRef = firestore().collection('users').doc(user.uid).collection('meta').doc('state');
        const cloudMetaDoc = await cloudMetaRef.get();

        const localBalance = await CashBalanceService.getCurrentBalance();
        const localBalanceUpdated = await CashBalanceService.getLastUpdateTime();
        const localLastReset = await DailyResetService.getLastResetDate();
        const localDailyData = await DailyResetService.getDailyOperationalData();

        if (!cloudMetaDoc.exists) {
          await cloudMetaRef.set({
            cashBalance: localBalance,
            lastBalanceUpdate: localBalanceUpdated,
            lastResetDate: localLastReset,
            dailyOperationalData: localDailyData,
            updatedAt: new Date().toISOString(),
          });
        } else {
          const cloudMeta = cloudMetaDoc.data() as any;
          const cloudBalanceUpdated = cloudMeta?.lastBalanceUpdate;
          // If cloud has newer balance, restore to local
          if (cloudBalanceUpdated && new Date(cloudBalanceUpdated) > new Date(localBalanceUpdated || 0)) {
            if (cloudMeta.cashBalance !== undefined) {
              await CashBalanceService.setBalance(cloudMeta.cashBalance);
            }
          } else {
            // Local is newer or equal - push to cloud
            await cloudMetaRef.set({
              cashBalance: localBalance,
              lastBalanceUpdate: localBalanceUpdated,
              lastResetDate: localLastReset,
              dailyOperationalData: localDailyData,
              updatedAt: new Date().toISOString(),
            }, {merge: true});
          }
        }
      } catch (metaErr) {
        console.error('Failed to sync user meta:', metaErr);
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
  /**
   * Create local transaction from cloud doc, attempting deduplication by invoiceNumber first.
   * Returns true if a new local record was created, false if merged/updated existing.
   */
  private async createLocalTransaction(cloudTransaction: any): Promise<boolean> {
    const transaction: Transaction = cloudTransaction.data as Transaction;
    const transactionType: string = transaction.transactionType;
    const cloudUpdatedAt: string | undefined = cloudTransaction.updatedAt;

    // Helper to use invoice-based dedupe for BUY and SELL
    if (transactionType === 'BUY') {
      // If local with same id exists, skip create
      const existingById = await TransactionService.getBuyTransaction(transaction.id);
      if (existingById) return false;

      if (transaction.invoiceNumber) {
        const found = await TransactionService.findBuyByInvoiceNumber(transaction.invoiceNumber);
        if (found) {
          await TransactionService.updateBuyTransactionFromCloud(found.id, transaction as any, cloudUpdatedAt || transaction.updatedAt);
          return false;
        }
      }

      await TransactionService.createBuyTransactionFromCloud(transaction as any);
      return true;
    }

    if (transactionType === 'SELL') {
      const existingById = await TransactionService.getSellTransaction(transaction.id);
      if (existingById) return false;

      if (transaction.invoiceNumber) {
        const found = await TransactionService.findSellByInvoiceNumber(transaction.invoiceNumber);
        if (found) {
          await TransactionService.updateSellTransactionFromCloud(found.id, transaction as any, cloudUpdatedAt || transaction.updatedAt);
          return false;
        }
      }

      await TransactionService.createSellTransactionFromCloud(transaction as any);
      return true;
    }

    // For LEND and EXPENSE there is no invoiceNumber; use id-based check
    if (transactionType === 'LEND') {
      const existingById = await TransactionService.getLendTransaction(transaction.id);
      if (existingById) return false;
      await TransactionService.createLendTransactionFromCloud(transaction as any);
      return true;
    }

    if (transactionType === 'EXPENSE') {
      const existingById = await TransactionService.getExpenseTransaction(transaction.id);
      if (existingById) return false;
      await TransactionService.createExpenseTransactionFromCloud(transaction as any);
      return true;
    }

    return false;
  }

  /**
   * Update local transaction
   */
  private async updateLocalTransaction(transaction: Transaction): Promise<void> {
    const {id, createdAt, updatedAt, transactionType, ...data} = transaction;
    
    switch (transactionType) {
      case 'BUY':
        await TransactionService.updateBuyTransactionFromCloud(id, data as any, updatedAt);
        break;
      case 'SELL':
        await TransactionService.updateSellTransactionFromCloud(id, data as any, updatedAt);
        break;
      case 'LEND':
        await TransactionService.updateLendTransactionFromCloud(id, data as any, updatedAt);
        break;
      case 'EXPENSE':
        await TransactionService.updateExpenseTransactionFromCloud(id, data as any, updatedAt);
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
