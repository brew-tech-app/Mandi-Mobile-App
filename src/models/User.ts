/**
 * User model for authentication and profile
 */
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  firmName?: string;
  gstin?: string;
  phoneNumber?: string;
  createdAt: string;
  lastSyncedAt?: string;
}

/**
 * Sync status for cloud backup
 */
export enum SyncStatus {
  SYNCED = 'SYNCED',
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR',
}

/**
 * Cloud transaction with sync metadata
 */
export interface CloudTransaction {
  localId: string;
  userId: string;
  transactionType: string;
  data: any;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}
