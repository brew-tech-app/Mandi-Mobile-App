import firestore, {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query as fbQuery,
  orderBy as fbOrderBy,
  limit as fbLimit,
  onSnapshot as fbOnSnapshot,
  getDocs,
  writeBatch,
  serverTimestamp,
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {Transaction} from '../models/Transaction';
import {SyncStatus, CloudTransaction} from '../models/User';
import AuthService from './AuthService';
import TransactionService from './TransactionService';
import CashBalanceService from './CashBalanceService';
import DailyResetService from './DailyResetService';
import DatabaseService from '../database/DatabaseService';
import RemoteLocalMappingRepository from '../repositories/RemoteLocalMappingRepository';

/**
 * Cloud Backup Service with Real-time Synchronization
 * Handles instant synchronization between local SQLite and Firebase Firestore across devices
 */
class CloudBackupService {
  private syncInProgress = false;
  private readonly LAST_SYNC_KEY = 'last_sync_timestamp';
  private readonly PENDING_UPLOADS_KEY = 'pending_uploads';
  private readonly PENDING_DELETES_KEY = 'pending_deletes';
  private readonly PENDING_META_KEY = 'pending_meta';
  private readonly FAILED_UPLOADS_KEY = 'failed_uploads';
  // Backoff strategy params
  private readonly BASE_BACKOFF_MS = 60 * 1000; // 1 minute
  private readonly MAX_BACKOFF_MS = 24 * 60 * 60 * 1000; // 24 hours
  private mappingRepo: RemoteLocalMappingRepository | null = null;
  private netUnsubscribe: (() => void) | null = null;

  // Permission-denied retry policy
  private permissionRetryCount = 0;
  private readonly MAX_PERMISSION_RETRIES = 5;
  private readonly PERMISSION_RETRY_BASE_MS = 2000; // 2 seconds

  // Real-time sync listeners
  private realtimeListeners: { [key: string]: () => void } = {};
  private isRealtimeEnabled = false;
  private currentUserId: string | null = null;

  constructor() {
    // Monitor network connectivity and process pending uploads when connected
    try {
      this.netUnsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected) {
          // Fire-and-forget
          // Process pending uploads and deletes when we regain connectivity
          this.processPendingUploads().catch(console.error);
          this.processPendingDeletes().catch(console.error);
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
          this.processPendingDeletes().catch(console.error);
        }
      });
    } catch (error) {
      // ignore
    }
  }

  /**
   * Start real-time synchronization for the current user
   * Sets up Firestore listeners to sync changes from other devices instantly
   */
  async startRealtimeSync(): Promise<void> {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      console.log('No user logged in, skipping real-time sync setup');
      return;
    }

    if (this.isRealtimeEnabled && this.currentUserId === user.uid) {
      console.log('Real-time sync already enabled for this user');
      return;
    }

    // Stop existing listeners if any
    this.stopRealtimeSync();

    this.currentUserId = user.uid;
    this.isRealtimeEnabled = true;

    console.log('Starting real-time synchronization for user:', user.uid);

    try {
      // Initialize database and mapping repo
      await DatabaseService.initDatabase();
      if (!this.mappingRepo) {
        this.mappingRepo = new RemoteLocalMappingRepository(DatabaseService.getDatabase());
      }

      // Clear any existing listeners before setting up new ones
      this.stopRealtimeSync();

      this.isRealtimeEnabled = true;
      this.currentUserId = user.uid;

      const db = firestore();

      // Set up real-time listener for transactions collection
      // Limit to recent transactions to prevent memory issues
      // Use modular query API
      const transactionsQuery = fbQuery(
        collection(db, 'users', user.uid, 'transactions'),
        fbOrderBy('updatedAt', 'desc'),
        fbLimit(100),
      );

      this.realtimeListeners.transactions = fbOnSnapshot(
        transactionsQuery,
        async (snapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
          try {
            await this.handleRealtimeTransactionChanges(snapshot);
          } catch (error) {
            console.error('Error handling real-time transaction changes:', error);
          }
        },
        (error: any) => {
          console.error('Real-time transactions listener error:', error);
          console.error('Listener error details:', {
            code: (error as any)?.code,
            message: error?.message,
            userId: user.uid,
          });

          // Handle permission-denied transiently (auth token/rules propagation race)
          if ((error as any)?.code === 'permission-denied' || error?.message?.includes('permission-denied')) {
            if (this.permissionRetryCount < this.MAX_PERMISSION_RETRIES) {
              const backoff = this.PERMISSION_RETRY_BASE_MS * Math.pow(2, this.permissionRetryCount);
              console.warn(`Permission denied on transactions listener. Retrying in ${backoff}ms (attempt ${this.permissionRetryCount + 1})`);
              this.permissionRetryCount++;
              // Ensure listeners are cleaned up before retrying
              try { this.stopRealtimeSync(); } catch (e) { /* ignore */ }
              setTimeout(() => {
                console.log('Retrying real-time transactions listener after permission-denied');
                this.startRealtimeSync().catch(console.error);
              }, backoff);
            } else {
              console.error('Max permission-denied retries reached for transactions listener. Giving up until next auth change.');
            }
            return;
          }

          // If it's a memory error, temporarily disable real-time sync
          if ((error as any)?.code === 'resource-exhausted' ||
              error?.message?.includes('OutOfMemory') ||
              error?.message?.includes('memory')) {
            console.warn('Memory error detected, temporarily disabling real-time sync');
            this.stopRealtimeSync();
            // Try to re-enable after 5 minutes
            setTimeout(() => {
              console.log('Attempting to re-enable real-time sync after memory error');
              this.startRealtimeSync().catch(console.error);
            }, 5 * 60 * 1000);
          }
        }
      );

      // Set up real-time listener for user meta (cash balance, etc.)
      const metaDocRef = doc(collection(db, 'users', user.uid, 'meta'), 'state');

      this.realtimeListeners.meta = fbOnSnapshot(
        metaDocRef,
        async (docSnap: FirebaseFirestoreTypes.DocumentSnapshot) => {
          try {
            await this.handleRealtimeMetaChanges(docSnap);
          } catch (error) {
            console.error('Error handling real-time meta changes:', error);
            console.error('Document data:', docSnap?.data?.());
          }
        },
        (error: any) => {
          console.error('Real-time meta listener error:', error);
          console.error('Listener error details:', {
            code: (error as any)?.code,
            message: error?.message,
            userId: user.uid,
          });

          // Handle permission-denied transiently (auth token/rules propagation race)
          if ((error as any)?.code === 'permission-denied' || error?.message?.includes('permission-denied')) {
            if (this.permissionRetryCount < this.MAX_PERMISSION_RETRIES) {
              const backoff = this.PERMISSION_RETRY_BASE_MS * Math.pow(2, this.permissionRetryCount);
              console.warn(`Permission denied on meta listener. Retrying in ${backoff}ms (attempt ${this.permissionRetryCount + 1})`);
              this.permissionRetryCount++;
              try { this.stopRealtimeSync(); } catch (e) { /* ignore */ }
              setTimeout(() => {
                console.log('Retrying real-time meta listener after permission-denied');
                this.startRealtimeSync().catch(console.error);
              }, backoff);
            } else {
              console.error('Max permission-denied retries reached for meta listener. Giving up until next auth change.');
            }
            return;
          }

          // If it's a memory error, temporarily disable real-time sync
          if ((error as any)?.code === 'resource-exhausted' ||
              error?.message?.includes('OutOfMemory') ||
              error?.message?.includes('memory')) {
            console.warn('Memory error in meta listener detected, temporarily disabling real-time sync');
            this.stopRealtimeSync();
            // Try to re-enable after 5 minutes
            setTimeout(() => {
              console.log('Attempting to re-enable real-time sync after meta memory error');
              this.startRealtimeSync().catch(console.error);
            }, 5 * 60 * 1000);
          }
        }
      );

      console.log('Real-time synchronization enabled successfully');
      // Reset permission retry counter on successful start
      this.permissionRetryCount = 0;
    } catch (error) {
      console.error('Failed to start real-time sync:', error);
      this.isRealtimeEnabled = false;
      this.currentUserId = null;
    }
  }

  /**
   * Stop real-time synchronization
   */
  stopRealtimeSync(): void {
    if (!this.isRealtimeEnabled) {
      return;
    }

    console.log('Stopping real-time synchronization');

    // Unsubscribe from all listeners
    Object.keys(this.realtimeListeners).forEach(key => {
      try {
        const unsubscribe = this.realtimeListeners[key];
        if (typeof unsubscribe === 'function') {
          unsubscribe();
          console.log(`Unsubscribed from ${key} listener`);
        }
      } catch (error) {
        console.warn(`Error unsubscribing ${key} listener:`, error);
      }
    });

    this.realtimeListeners = {};
    this.isRealtimeEnabled = false;
    this.currentUserId = null;
    // Reset permission retry counter when explicitly stopped
    this.permissionRetryCount = 0;
  }

  /**
   * Handle real-time transaction changes from Firestore
   */
  private async handleRealtimeTransactionChanges(snapshot: FirebaseFirestoreTypes.QuerySnapshot): Promise<void> {
    if (!this.currentUserId) return;

    const changes = snapshot.docChanges();

    // Limit processing to prevent memory issues
    const maxChangesToProcess = 50;
    const changesToProcess = changes.slice(0, maxChangesToProcess);

    if (changes.length > maxChangesToProcess) {
      console.warn(`Too many changes (${changes.length}), processing only first ${maxChangesToProcess}`);
    }

    for (const change of changesToProcess) {
      try {
        const docId = change.doc.id;
        const cloudTransaction = change.doc.data() as CloudTransaction;

        // Skip if this change originated from this device (check local ID mapping)
        if (this.mappingRepo) {
          try {
            const mapping = await this.mappingRepo.findByRemoteId(docId);
            if (mapping && mapping.localId === cloudTransaction.localId) {
              // This is our own change, skip processing
              continue;
            }
          } catch (e) {
            // Continue processing if mapping check fails
          }
        }

        switch (change.type) {
          case 'added':
          case 'modified':
            await this.syncTransactionFromCloud(cloudTransaction, docId);
            break;
          case 'removed':
            await this.deleteTransactionFromCloud(docId);
            break;
        }
      } catch (error) {
        console.error('Error processing real-time transaction change:', error);
        // Continue processing other changes even if one fails
      }
    }
  }

  /**
   * Handle real-time meta changes from Firestore
   */
  private async handleRealtimeMetaChanges(doc: FirebaseFirestoreTypes.DocumentSnapshot): Promise<void> {
    if (!doc.exists || !this.currentUserId) return;

    try {
      const cloudMeta = doc.data() as any;

      if (!cloudMeta) {
        console.warn('Received empty meta document from real-time listener');
        return;
      }

      // Compare timestamps to avoid unnecessary updates
      const cloudUpdatedAt = cloudMeta?.updatedAt;
      const localBalanceUpdated = await CashBalanceService.getLastUpdateTime();

      if (cloudUpdatedAt && (!localBalanceUpdated || new Date(cloudUpdatedAt) > new Date(localBalanceUpdated))) {
        // Cloud has newer data, update local
        if (cloudMeta.cashBalance !== undefined && cloudMeta.cashBalance !== null) {
          const balanceValue = typeof cloudMeta.cashBalance === 'number'
            ? cloudMeta.cashBalance
            : parseFloat(cloudMeta.cashBalance);

          if (!isNaN(balanceValue)) {
            await CashBalanceService.setBalance(balanceValue);
            console.log('Synced cash balance from cloud:', balanceValue);
          } else {
            console.error('Invalid cash balance value from cloud:', cloudMeta.cashBalance);
          }
        }

        // Note: lastResetDate and dailyOperationalData sync could be added here if needed
      }
    } catch (error) {
      console.error('Error processing real-time meta change:', error);
      console.error('Meta document data:', doc.data());
    }
  }

  /**
   * Sync a single transaction from cloud to local database
   */
  private async syncTransactionFromCloud(cloudTransaction: CloudTransaction, remoteId: string): Promise<void> {
    try {
      const transaction = cloudTransaction.data as Transaction;

      // Check if we already have this transaction locally
      const existingTransaction = await this.getLocalTransactionById(transaction.id);

      if (!existingTransaction) {
        // New transaction from another device
        console.log(`Syncing new transaction from cloud: ${transaction.id}`);
        await this.createLocalTransaction(cloudTransaction, remoteId);
      } else {
        // Existing transaction - check which one is newer
        const cloudTime = (cloudTransaction as any).serverUpdatedAt?.toDate?.() || new Date(cloudTransaction.updatedAt);
        const localTime = new Date(existingTransaction.updatedAt);

        if (cloudTime > localTime) {
          // Cloud is newer, update local
          console.log(`Updating local transaction from cloud: ${transaction.id}`);
          await this.updateLocalTransaction(transaction);

          // Notify UI about the change (if needed)
          this.notifyTransactionUpdated(transaction.id);
        } else if (cloudTime.getTime() === localTime.getTime()) {
          // Same timestamp - check if content is different (conflict)
          if (this.hasTransactionConflict(existingTransaction, transaction)) {
            console.log(`Conflict detected for transaction: ${transaction.id}`);
            await this.resolveTransactionConflict(existingTransaction, transaction);
          }
        }
        // If local is newer, it will be uploaded via auto-sync
      }
    } catch (error) {
      console.error('Error syncing transaction from cloud:', error);
    }
  }

  /**
   * Check if two transactions have conflicting changes
   */
  private hasTransactionConflict(local: Transaction, remote: Transaction): boolean {
    // Compare common fields
    if (local.date !== remote.date || local.description !== remote.description) {
      return true;
    }

    // Compare type-specific fields
    switch (local.transactionType) {
      case 'BUY':
        const localBuy = local as any;
        const remoteBuy = remote as any;
        return localBuy.totalAmount !== remoteBuy.totalAmount ||
               localBuy.supplierName !== remoteBuy.supplierName ||
               localBuy.grainType !== remoteBuy.grainType;

      case 'SELL':
        const localSell = local as any;
        const remoteSell = remote as any;
        return localSell.totalAmount !== remoteSell.totalAmount ||
               localSell.buyerName !== remoteSell.buyerName ||
               localSell.grainType !== remoteSell.grainType;

      case 'LEND':
        const localLend = local as any;
        const remoteLend = remote as any;
        return localLend.amount !== remoteLend.amount ||
               localLend.personName !== remoteLend.personName;

      case 'EXPENSE':
        const localExpense = local as any;
        const remoteExpense = remote as any;
        return localExpense.amount !== remoteExpense.amount ||
               localExpense.expenseName !== remoteExpense.expenseName;

      default:
        return false;
    }
  }

  /**
   * Resolve transaction conflicts (last write wins strategy)
   */
  private async resolveTransactionConflict(local: Transaction, remote: Transaction): Promise<void> {
    // For now, use last-write-wins strategy
    // In the future, this could be enhanced with conflict resolution UI
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();

    if (remoteTime > localTime) {
      // Remote is newer, update local
      console.log(`Resolving conflict: accepting remote version for ${local.id}`);
      await this.updateLocalTransaction(remote);
      this.notifyTransactionUpdated(local.id);
    } else {
      // Local is newer or equal, keep local and upload it
      console.log(`Resolving conflict: keeping local version for ${local.id}`);
      // The local version will be uploaded via auto-sync
    }
  }

  /**
   * Notify UI components about transaction updates
   * This can be used to refresh screens when data changes from other devices
   */
  private notifyTransactionUpdated(transactionId: string): void {
    // Emit an event that screens can listen to for real-time updates
    // This is a simple implementation - in a more complex app, you might use
    // a proper event emitter or state management solution
    console.log(`Transaction updated from cloud: ${transactionId}`);
  }

  /**
   * Delete a transaction locally when deleted from cloud
   */
  private async deleteTransactionFromCloud(remoteId: string): Promise<void> {
    try {
      if (!this.mappingRepo) return;

      const mapping = await this.mappingRepo.findByRemoteId(remoteId);
      if (!mapping?.localId) return;

      const localTransaction = await this.getLocalTransactionById(mapping.localId);
      if (!localTransaction) return;

      console.log(`Deleting local transaction synced from cloud: ${mapping.localId}`);

      // Delete from appropriate repository based on transaction type
      switch (localTransaction.transactionType) {
        case 'BUY':
          await TransactionService.deleteBuyTransaction(mapping.localId);
          break;
        case 'SELL':
          await TransactionService.deleteSellTransaction(mapping.localId);
          break;
        case 'LEND':
          await TransactionService.deleteLendTransaction(mapping.localId);
          break;
        case 'EXPENSE':
          // Cloud-initiated delete: do not re-propagate deletion back to cloud
          await TransactionService.deleteExpenseTransaction(mapping.localId, false);
          break;
      }

      // Remove the mapping
      await this.mappingRepo.deleteByRemoteId(remoteId);
    } catch (error) {
      console.error('Error deleting transaction from cloud sync:', error);
    }
  }

  /**
   * Return number of pending uploads (queued items)
   */
  public async getPendingUploadsCount(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(this.PENDING_UPLOADS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const normalized = list.map((item: any) => (typeof item === 'string' ? {transactionId: item} : item));
      return normalized.length;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Whether there's pending meta waiting to be pushed
   */
  public async hasPendingMeta(): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(this.PENDING_META_KEY);
      return !!raw;
    } catch (e) {
      return false;
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
      const db = firestore();
      const docRef = doc(collection(db, 'users', userId, 'transactions'), transaction.id);

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
        serverUpdatedAt: serverTimestamp(),
        syncedAt: new Date().toISOString(),
      };

      await setDoc(docRef, cloudTransaction, {merge: true} as any);
      console.log(`Uploaded transaction ${transaction.id} to cloud`);
      // If upload succeeds, remove from pending list if present
      await this.dequeuePendingUpload(transaction.id);
      // Create mapping record to mark remote<->local relationship
      try {
        await DatabaseService.initDatabase();
        if (!this.mappingRepo) {
          this.mappingRepo = new RemoteLocalMappingRepository(DatabaseService.getDatabase());
        }
        await this.mappingRepo.createMapping(docRef.id, transaction.id, transaction.transactionType);
      } catch (e) {
        console.warn('Failed to create remote-local mapping after upload', e);
      }
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
  async deleteSingleTransaction(transactionId: string, userId: string): Promise<boolean> {
    try {
      // Resolve remote id from mapping if available. Some uploads may use a different remote id.
      let remoteId = transactionId;
      try {
        await DatabaseService.initDatabase();
        if (!this.mappingRepo) {
          this.mappingRepo = new RemoteLocalMappingRepository(DatabaseService.getDatabase());
        }
        const mapping = await this.mappingRepo.findByLocalId(transactionId);
        if (mapping && mapping.remoteId) {
          remoteId = mapping.remoteId;
        }
      } catch (e) {
        // Mapping lookup failed — continue and attempt delete using the provided id
        console.warn('Failed to lookup mapping for delete; will attempt delete using provided id', e);
      }

      const db = firestore();
      const docRef = doc(collection(db, 'users', userId, 'transactions'), remoteId);

      await deleteDoc(docRef);
      console.log(`Deleted transaction ${remoteId} (requested ${transactionId}) from cloud`);

      // Verify deletion by attempting to read from server; if still present, enqueue for retry
      try {
        const snapshot = await getDoc(docRef);
        if (snapshot && snapshot.exists()) {
          console.warn(`Post-delete verification: document ${remoteId} still present on server; enqueueing for retry`);
          await this.enqueuePendingDelete(remoteId, userId);
          return false;
        }

        // Document not present on server -> confirmed deleted
        // Now safe to remove local mapping if exists
        try {
          if (!this.mappingRepo) {
            await DatabaseService.initDatabase();
            this.mappingRepo = new RemoteLocalMappingRepository(DatabaseService.getDatabase());
          }
          await this.mappingRepo.deleteByRemoteId(remoteId);
        } catch (e) {
          console.warn('Failed to remove remote-local mapping after confirmed delete:', e);
        }

        return true;
      } catch (e) {
        // If server get failed, schedule retry
        console.warn('Could not verify deletion on server, enqueueing pending delete:', e);
        await this.enqueuePendingDelete(remoteId, userId);
        return false;
      }
    } catch (error) {
      console.error('Failed to delete transaction from cloud:', error);
      // Enqueue for retry later using the local id (best effort) — mapping may exist and be reconciled later
      try { await this.enqueuePendingDelete(transactionId, userId); } catch (e) { /* ignore */ }
      return false;
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

      const db = firestore();
      const batch = writeBatch(db);
      let batchCount = 0;

      for (const transaction of transactions) {
        const docRef = doc(collection(db, 'users', user.uid, 'transactions'), transaction.id);
        const cloudTransaction: any = {
          localId: transaction.id,
          userId: user.uid,
          transactionType: transaction.transactionType,
          data: transaction,
          syncStatus: SyncStatus.SYNCED,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
          serverUpdatedAt: serverTimestamp(),
          syncedAt: new Date().toISOString(),
        };

        batch.set(docRef, cloudTransaction, {merge: true} as any);
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

      // Ensure remote-local mappings exist for the backed-up documents
      try {
        await DatabaseService.initDatabase();
        if (!this.mappingRepo) {
          this.mappingRepo = new RemoteLocalMappingRepository(DatabaseService.getDatabase());
        }
        for (const transaction of transactions) {
          try {
            await this.mappingRepo.createMapping(transaction.id, transaction.id, transaction.transactionType);
          } catch (e) {
            // non-fatal per-transaction mapping failure
            console.warn('Failed to create mapping for transaction after backup:', transaction.id, e);
          }
        }
      } catch (e) {
        console.warn('Failed to create remote-local mappings after backupToCloud:', e);
      }
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
      const db = firestore();
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'transactions'));

      let restoredCount = 0;

      for (const doc of snapshot.docs) {
        const cloudTransaction = doc.data() as CloudTransaction;
        const remoteId = doc.id;

        try {
          // Attempt to create or merge based on cloud document
          const created = await this.createLocalTransaction(cloudTransaction, remoteId);
          if (created) restoredCount++;
        } catch (error) {
          console.error(`Failed to restore cloud doc ${doc.id}:`, error);
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
      const list = raw ? JSON.parse(raw) : [];
      // Normalize legacy string entries
      const normalized: Array<{transactionId: string; retryCount: number; nextAttempt?: number; errorCount?: number; lastError?: string}> = [];
      for (const item of list) {
        if (typeof item === 'string') {
          normalized.push({transactionId: item, retryCount: 0});
        } else if (item && item.transactionId) {
          normalized.push(item);
        }
      }
      if (!normalized.find(e => e.transactionId === transactionId)) {
        normalized.push({transactionId, retryCount: 0, errorCount: 0});
        await AsyncStorage.setItem(this.PENDING_UPLOADS_KEY, JSON.stringify(normalized));
      }
    } catch (error) {
      console.error('Failed to enqueue pending upload:', error);
    }
  }

  /**
   * Enqueue a pending delete to be retried later
   */
  private async enqueuePendingDelete(transactionId: string, userId: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(this.PENDING_DELETES_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const normalized: Array<{transactionId: string; userId: string; retryCount: number; nextAttempt?: number}> = list.map((it: any) => ({...it}));
      if (!normalized.find(e => e.transactionId === transactionId && e.userId === userId)) {
        normalized.push({transactionId, userId, retryCount: 0});
        await AsyncStorage.setItem(this.PENDING_DELETES_KEY, JSON.stringify(normalized));
      }
    } catch (error) {
      console.error('Failed to enqueue pending delete:', error);
    }
  }

  /**
   * Process pending deletes when network is available
   */
  public async processPendingDeletes(): Promise<void> {
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) return;

      const user = await AuthService.getCurrentUser();
      if (!user) return;

      const raw = await AsyncStorage.getItem(this.PENDING_DELETES_KEY);
      const list: Array<{transactionId: string; userId: string; retryCount: number; nextAttempt?: number}> = raw ? JSON.parse(raw) : [];
      if (!list || list.length === 0) return;

      const remaining: typeof list = [];
      for (const entry of list) {
        try {
          const now = Date.now();
          if (entry.nextAttempt && entry.nextAttempt > now) {
            remaining.push(entry);
            continue;
          }

          // Use modular deleteDoc instead of namespaced API
          const db = firestore();
          await deleteDoc(doc(collection(db, 'users', entry.userId, 'transactions'), entry.transactionId));

          console.log(`Processed pending delete for ${entry.transactionId}`);
          // Attempt to cleanup mapping if present. Entry.transactionId might be a remoteId or a localId.
          try {
            await DatabaseService.initDatabase();
            if (!this.mappingRepo) {
              this.mappingRepo = new RemoteLocalMappingRepository(DatabaseService.getDatabase());
            }
            // First try treating entry.transactionId as remoteId
            await this.mappingRepo.deleteByRemoteId(entry.transactionId);
            // Also try to find a mapping by local id and delete by remote id if found
            try {
              const map = await this.mappingRepo.findByLocalId(entry.transactionId);
              if (map && map.remoteId) {
                await this.mappingRepo.deleteByRemoteId(map.remoteId);
              }
            } catch (e) {
              // ignore secondary mapping lookup failures
            }
          } catch (e) {
            console.warn('Failed to cleanup mapping after processed pending delete:', e);
          }
        } catch (e) {
          // Retry with backoff
          const retryCount = (entry.retryCount || 0) + 1;
          const backoff = Math.min(this.BASE_BACKOFF_MS * Math.pow(2, retryCount), this.MAX_BACKOFF_MS);
          entry.retryCount = retryCount;
          entry.nextAttempt = Date.now() + backoff;
          remaining.push(entry);
          console.warn(`Pending delete for ${entry.transactionId} failed, will retry in ${backoff}ms`, e);
        }
      }

      await AsyncStorage.setItem(this.PENDING_DELETES_KEY, JSON.stringify(remaining));
    } catch (error) {
      console.error('Failed to process pending deletes:', error);
    }
  }

  /**
   * Remove a transaction id from pending upload list
   */
  private async dequeuePendingUpload(transactionId: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(this.PENDING_UPLOADS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const normalized: Array<{transactionId: string; retryCount: number; nextAttempt?: number; errorCount?: number; lastError?: string}> = [];
      for (const item of list) {
        if (typeof item === 'string') {
          normalized.push({transactionId: item, retryCount: 0});
        } else if (item && item.transactionId) {
          normalized.push(item);
        }
      }
      const idx = normalized.findIndex(e => e.transactionId === transactionId);
      if (idx !== -1) {
        normalized.splice(idx, 1);
        await AsyncStorage.setItem(this.PENDING_UPLOADS_KEY, JSON.stringify(normalized));
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
      const list = raw ? JSON.parse(raw) : [];
      // Normalize to entries
      const entries: Array<{transactionId: string; retryCount: number; nextAttempt?: number; errorCount?: number; lastError?: string}> = [];
      for (const item of list) {
        if (typeof item === 'string') entries.push({transactionId: item, retryCount: 0});
        else if (item && item.transactionId) entries.push(item);
      }

      for (const entry of entries) {
        try {
          const now = Date.now();
          if (entry.nextAttempt && entry.nextAttempt > now) {
            // skip until nextAttempt
            continue;
          }

          // Try to find the transaction locally
          const tx = await this.getLocalTransactionById(entry.transactionId);
          if (!tx) {
            // Nothing to upload - remove mapping/queue
            await this.dequeuePendingUpload(entry.transactionId);
            continue;
          }

          // Check if remote mapping already exists - if yes, skip uploading
          try {
            await DatabaseService.initDatabase();
            if (!this.mappingRepo) {
              this.mappingRepo = new RemoteLocalMappingRepository(DatabaseService.getDatabase());
            }
            const map = await this.mappingRepo.findByLocalId(entry.transactionId);
            if (map && map.remoteId) {
              // Already mapped to remote - dequeue
              await this.dequeuePendingUpload(entry.transactionId);
              continue;
            }
          } catch (e) {
            // ignore mapping failures and attempt upload
            console.warn('Mapping check failed (will attempt upload):', e);
          }

          // Attempt upload
          await this.uploadSingleTransaction(tx, user.uid);
          } catch (e) {
            console.error('Error processing pending upload for', entry.transactionId, e);
            // Log error to sync logs
            try {
              const {default: SyncLogger} = await import('./SyncLogger');
              await SyncLogger.logError('Pending upload failed', {id: entry.transactionId, error: String(e)});
            } catch (le) {
              console.warn('Failed to write sync log', le);
            }
            // Increment retry and error counters and reschedule with exponential backoff
            try {
              const retries = (entry.retryCount || 0) + 1;
              const errorCnt = (entry.errorCount || 0) + 1;
              const backoff = Math.min(this.BASE_BACKOFF_MS * Math.pow(2, retries - 1), this.MAX_BACKOFF_MS);
              entry.retryCount = retries;
              entry.errorCount = errorCnt;
              entry.lastError = String(e);
              entry.nextAttempt = Date.now() + backoff;

              // If too many errors, move to failed uploads list and remove from pending
              if (errorCnt >= 5) {
                // Add to failed uploads
                const rawFailed = await AsyncStorage.getItem(this.FAILED_UPLOADS_KEY);
                const failed = rawFailed ? JSON.parse(rawFailed) : [];
                if (!failed.find((f: any) => f.transactionId === entry.transactionId)) {
                  failed.push({...entry, failedAt: Date.now()});
                  await AsyncStorage.setItem(this.FAILED_UPLOADS_KEY, JSON.stringify(failed));
                }
                await this.dequeuePendingUpload(entry.transactionId);
              } else {
                // Persist updated pending entry
                const rawAll = await AsyncStorage.getItem(this.PENDING_UPLOADS_KEY);
                const all = rawAll ? JSON.parse(rawAll) : [];
                // replace or append
                let replaced = false;
                for (let i = 0; i < all.length; i++) {
                  const it = all[i];
                  if ((typeof it === 'string' && it === entry.transactionId) || (it && it.transactionId === entry.transactionId)) {
                    all[i] = entry;
                    replaced = true;
                    break;
                  }
                }
                if (!replaced) all.push(entry);
                await AsyncStorage.setItem(this.PENDING_UPLOADS_KEY, JSON.stringify(all));
              }
            } catch (ee) {
              console.error('Failed to reschedule or mark failed upload', ee);
            }
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
      // Optionally rotate old failed uploads into logs (cleanup retained separately)
    } catch (error) {
      console.error('Failed to process pending uploads:', error);
    }
  }

  /**
   * Get failed uploads list
   */
  public async getFailedUploads(): Promise<any[]> {
    try {
      const raw = await AsyncStorage.getItem(this.FAILED_UPLOADS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to read failed uploads', e);
      return [];
    }
  }

  /**
   * Clears a failed upload (remove from failed list)
   */
  public async clearFailedUpload(transactionId: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(this.FAILED_UPLOADS_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const filtered = list.filter((it: any) => it.transactionId !== transactionId);
      await AsyncStorage.setItem(this.FAILED_UPLOADS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to clear failed upload', e);
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

      const db = firestore();
      const cloudMetaRef = doc(collection(db, 'users', user.uid, 'meta'), 'state');
      await setDoc(cloudMetaRef, payload, {merge: true} as any);
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
        const db = firestore();
        const docRef = doc(collection(db, 'users', user.uid, 'transactions'), transaction.id);
        const cloudDoc = await getDoc(docRef);
        if (!cloudDoc.exists()) {
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
      const db = firestore();
      const snapshot = await getDocs(collection(db, 'users', user.uid, 'transactions'));
      let downloaded = 0;

      for (const doc of snapshot.docs) {
        const cloudTransaction = doc.data() as any;
        const transaction = cloudTransaction.data as Transaction;

        // Determine cloud timestamp: prefer serverUpdatedAt (Firestore Timestamp), fallback to updatedAt (ISO string)
        let cloudTime: Date | null = null;
        if ((cloudTransaction as any).serverUpdatedAt && (cloudTransaction as any).serverUpdatedAt.toDate) {
          cloudTime = (cloudTransaction as any).serverUpdatedAt.toDate();
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
        const db = firestore();
        const cloudMetaRef = doc(collection(db, 'users', user.uid, 'meta'), 'state');
        const cloudMetaDoc = await getDoc(cloudMetaRef);

        const localBalance = await CashBalanceService.getCurrentBalance();
        const localBalanceUpdated = await CashBalanceService.getLastUpdateTime();
        const localLastReset = await DailyResetService.getLastResetDate();
        const localDailyData = await DailyResetService.getDailyOperationalData();

        if (!cloudMetaDoc.exists()) {
          await setDoc(cloudMetaRef, {
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
            await setDoc(cloudMetaRef, {
              cashBalance: localBalance,
              lastBalanceUpdate: localBalanceUpdated,
              lastResetDate: localLastReset,
              dailyOperationalData: localDailyData,
              updatedAt: new Date().toISOString(),
            }, {merge: true} as any);
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

    const db = firestore();
    const docRef = doc(collection(db, 'users', userId, 'transactions'), transaction.id);
    await setDoc(docRef, cloudTransaction, {merge: true} as any);
    // Create mapping record if possible
    try {
      await DatabaseService.initDatabase();
      if (!this.mappingRepo) {
        this.mappingRepo = new RemoteLocalMappingRepository(DatabaseService.getDatabase());
      }
      await this.mappingRepo.createMapping(docRef.id, transaction.id, transaction.transactionType);
    } catch (e) {
      // Non-fatal: mapping failure should not block sync
      console.warn('Failed to create mapping after uploadTransaction', e);
    }
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
  private async createLocalTransaction(cloudTransaction: any, remoteId?: string): Promise<boolean> {
    const transaction: Transaction = cloudTransaction.data as Transaction;
    // keep the discriminant access directly on the union so TypeScript can narrow types
    // transaction.transactionType is a discriminant (BUY|SELL|LEND|EXPENSE)
    const cloudUpdatedAt: string | undefined = cloudTransaction.updatedAt;

    // Initialize mapping repo
    try {
      await DatabaseService.initDatabase();
      if (!this.mappingRepo) this.mappingRepo = new RemoteLocalMappingRepository(DatabaseService.getDatabase());
    } catch (e) {
      // mapping not critical for creation
      console.warn('Mapping repo init failed', e);
    }

    // If remoteId provided, check if we've already mapped this cloud doc
    if (remoteId && this.mappingRepo) {
      try {
        const existingMap = await this.mappingRepo.findByRemoteId(remoteId);
        if (existingMap && existingMap.localId) {
          // Local record exists for this remote doc - ensure it's updated if cloud newer
          const local = await this.getLocalTransactionById(existingMap.localId);
          if (local) {
            const localUpdated = local.updatedAt ? new Date(local.updatedAt) : null;
            let cloudTime: Date | null = null;
            if (cloudTransaction.serverUpdatedAt && cloudTransaction.serverUpdatedAt.toDate) {
              cloudTime = cloudTransaction.serverUpdatedAt.toDate();
            } else if (cloudUpdatedAt) {
              cloudTime = new Date(cloudUpdatedAt);
            }
            if (cloudTime && (!localUpdated || cloudTime > localUpdated)) {
              await this.updateLocalTransaction(transaction);
            }
          }
          return false;
        }
      } catch (e) {
        console.warn('Failed to check mapping by remoteId', e);
      }
    }

    // Helper to use invoice-based dedupe for BUY and SELL
    if (transaction.transactionType === 'BUY') {
      const existingById = await TransactionService.getBuyTransaction(transaction.id);
      if (existingById) return false;

      if (transaction.invoiceNumber) {
        const found = await TransactionService.findBuyByInvoiceNumber(transaction.invoiceNumber);
        if (found) {
          await TransactionService.updateBuyTransactionFromCloud(found.id, transaction as any, cloudUpdatedAt || transaction.updatedAt);
          if (remoteId && this.mappingRepo) await this.mappingRepo.createMapping(remoteId, found.id, 'BUY');
          return false;
        }
      }

      const created = await TransactionService.createBuyTransactionFromCloud(transaction as any);
      if (remoteId && this.mappingRepo) await this.mappingRepo.createMapping(remoteId, created.id, 'BUY');
      return true;
    }

    if (transaction.transactionType === 'SELL') {
      const existingById = await TransactionService.getSellTransaction(transaction.id);
      if (existingById) return false;

      if (transaction.invoiceNumber) {
        const found = await TransactionService.findSellByInvoiceNumber(transaction.invoiceNumber);
        if (found) {
          await TransactionService.updateSellTransactionFromCloud(found.id, transaction as any, cloudUpdatedAt || transaction.updatedAt);
          if (remoteId && this.mappingRepo) await this.mappingRepo.createMapping(remoteId, found.id, 'SELL');
          return false;
        }
      }

      const created = await TransactionService.createSellTransactionFromCloud(transaction as any);
      if (remoteId && this.mappingRepo) await this.mappingRepo.createMapping(remoteId, created.id, 'SELL');
      return true;
    }

    // For LEND and EXPENSE there is no invoiceNumber; use heuristics to dedupe
    if (transaction.transactionType === 'LEND') {
      const existingById = await TransactionService.getLendTransaction(transaction.id);
      if (existingById) return false;

      // Heuristic: match on amount + date (same day) + person name
      const allLends = await TransactionService.getAllLendTransactions();
      const txDate = new Date(transaction.date);
      const found = allLends.find(l => {
        const lDate = new Date(l.date);
        const sameDay = lDate.toDateString() === txDate.toDateString();
        const sameAmount = Math.abs((l.amount || 0) - (transaction.amount || 0)) < 0.0001;
        const samePerson = (l.personName || '').trim() && (transaction.personName || '').trim() && (l.personName || '').trim() === (transaction.personName || '').trim();
        return sameDay && sameAmount && samePerson;
      });

      if (found) {
        await TransactionService.updateLendTransactionFromCloud(found.id, transaction as any, cloudUpdatedAt || transaction.updatedAt);
        if (remoteId && this.mappingRepo) await this.mappingRepo.createMapping(remoteId, found.id, 'LEND');
        return false;
      }

      const created = await TransactionService.createLendTransactionFromCloud(transaction as any);
      if (remoteId && this.mappingRepo) await this.mappingRepo.createMapping(remoteId, created.id, 'LEND');
      return true;
    }

    if (transaction.transactionType === 'EXPENSE') {
      const existingById = await TransactionService.getExpenseTransaction(transaction.id);
      if (existingById) return false;

      // Heuristic: match on amount + date + category/notes
      const allExpenses = await TransactionService.getAllExpenseTransactions();
      const txDate = new Date(transaction.date);
      const found = allExpenses.find(e => {
        const eDate = new Date(e.date);
        const sameDay = eDate.toDateString() === txDate.toDateString();
        const sameAmount = Math.abs((e.amount || 0) - (transaction.amount || 0)) < 0.0001;
        // Model uses `expenseCategory` field name; use that for dedupe
        const sameCategory = (e.expenseCategory || '').trim() && (transaction.expenseCategory || '').trim() && (e.expenseCategory || '').trim() === (transaction.expenseCategory || '').trim();
        return sameDay && sameAmount && sameCategory;
      });

      if (found) {
        await TransactionService.updateExpenseTransactionFromCloud(found.id, transaction as any, cloudUpdatedAt || transaction.updatedAt);
        if (remoteId && this.mappingRepo) await this.mappingRepo.createMapping(remoteId, found.id, 'EXPENSE');
        return false;
      }

      const created = await TransactionService.createExpenseTransactionFromCloud(transaction as any);
      if (remoteId && this.mappingRepo) await this.mappingRepo.createMapping(remoteId, created.id, 'EXPENSE');
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
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<string | null> {
    return await AsyncStorage.getItem(this.LAST_SYNC_KEY);
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
