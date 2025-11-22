import {
  BuyTransaction,
  SellTransaction,
  LendTransaction,
  ExpenseTransaction,
  DashboardSummary,
  Transaction,
} from '../models/Transaction';
import {BuyTransactionRepository} from '../repositories/BuyTransactionRepository';
import {SellTransactionRepository} from '../repositories/SellTransactionRepository';
import {LendTransactionRepository} from '../repositories/LendTransactionRepository';
import {ExpenseTransactionRepository} from '../repositories/ExpenseTransactionRepository';
import DatabaseService from '../database/DatabaseService';
import CloudBackupService from './CloudBackupService';
import AuthService from './AuthService';

/**
 * Transaction Service Interface
 * Following Dependency Inversion Principle - depend on abstractions
 */
export interface ITransactionService {
  initializeDatabase(): Promise<void>;
  getDashboardSummary(): Promise<DashboardSummary>;
}

/**
 * Transaction Service
 * Central service for managing all transaction operations
 * Following Single Responsibility and Dependency Inversion Principles
 */
export class TransactionService implements ITransactionService {
  private buyRepository!: BuyTransactionRepository;
  private sellRepository!: SellTransactionRepository;
  private lendRepository!: LendTransactionRepository;
  private expenseRepository!: ExpenseTransactionRepository;
  private dbService: typeof DatabaseService;

  constructor() {
    this.dbService = DatabaseService;
  }

  /**
   * Initialize database and repositories
   */
  public async initializeDatabase(): Promise<void> {
    const db = await this.dbService.initDatabase();
    this.buyRepository = new BuyTransactionRepository(db);
    this.sellRepository = new SellTransactionRepository(db);
    this.lendRepository = new LendTransactionRepository(db);
    this.expenseRepository = new ExpenseTransactionRepository(db);
  }

  /**
   * Auto-sync transaction to Firebase (non-blocking)
   * Runs in background without blocking UI
   */
  private async autoSyncToCloud(transaction: Transaction): Promise<void> {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        // User not logged in, skip cloud sync
        console.log('Auto-sync skipped: User not authenticated');
        return;
      }

      // Upload single transaction to cloud (non-blocking)
      await CloudBackupService.uploadSingleTransaction(transaction, user.uid);
      console.log(`Auto-synced transaction ${transaction.id} to cloud`);
    } catch (error) {
      // Silently fail - transaction is already saved locally
      console.error('Auto-sync failed (transaction safe in local DB):', error);
    }
  }

  /**
   * Auto-delete transaction from Firebase (non-blocking)
   * Runs in background without blocking UI
   */
  private async autoDeleteFromCloud(transactionId: string): Promise<void> {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        // User not logged in, skip cloud delete
        console.log('Auto-delete skipped: User not authenticated');
        return;
      }

      // Delete single transaction from cloud (non-blocking)
      await CloudBackupService.deleteSingleTransaction(transactionId, user.uid);
      console.log(`Auto-deleted transaction ${transactionId} from cloud`);
    } catch (error) {
      // Silently fail - transaction is already deleted locally
      console.error('Auto-delete failed (transaction removed from local DB):', error);
    }
  }

  /**
   * Buy Transaction Operations
   */
  public async createBuyTransaction(
    data: Omit<BuyTransaction, 'id' | 'createdAt' | 'updatedAt' | 'transactionType'>,
  ): Promise<BuyTransaction> {
    const transaction = await this.buyRepository.create(data);
    // Auto-sync to cloud (non-blocking)
    this.autoSyncToCloud(transaction).catch(console.error);
    return transaction;
  }

  public async getBuyTransaction(id: string): Promise<BuyTransaction | null> {
    return await this.buyRepository.findById(id);
  }

  public async getAllBuyTransactions(): Promise<BuyTransaction[]> {
    return await this.buyRepository.findAll();
  }

  public async updateBuyTransaction(
    id: string,
    data: Partial<BuyTransaction>,
  ): Promise<BuyTransaction> {
    const transaction = await this.buyRepository.update(id, data);
    // Auto-sync to cloud (non-blocking)
    this.autoSyncToCloud(transaction).catch(console.error);
    return transaction;
  }

  public async deleteBuyTransaction(id: string): Promise<boolean> {
    const result = await this.buyRepository.delete(id);
    if (result) {
      // Delete from cloud (non-blocking)
      this.autoDeleteFromCloud(id).catch(console.error);
    }
    return result;
  }

  public async getPendingBuyTransactions(): Promise<BuyTransaction[]> {
    return await this.buyRepository.findPending();
  }

  public async getBuyTransactionsBySupplier(supplierName: string): Promise<BuyTransaction[]> {
    return await this.buyRepository.findBySupplier(supplierName);
  }

  /**
   * Sell Transaction Operations
   */
  public async createSellTransaction(
    data: Omit<SellTransaction, 'id' | 'createdAt' | 'updatedAt' | 'transactionType'>,
  ): Promise<SellTransaction> {
    const transaction = await this.sellRepository.create(data);
    // Auto-sync to cloud (non-blocking)
    this.autoSyncToCloud(transaction).catch(console.error);
    return transaction;
  }

  public async getSellTransaction(id: string): Promise<SellTransaction | null> {
    return await this.sellRepository.findById(id);
  }

  public async getAllSellTransactions(): Promise<SellTransaction[]> {
    return await this.sellRepository.findAll();
  }

  public async updateSellTransaction(
    id: string,
    data: Partial<SellTransaction>,
  ): Promise<SellTransaction> {
    const transaction = await this.sellRepository.update(id, data);
    // Auto-sync to cloud (non-blocking)
    this.autoSyncToCloud(transaction).catch(console.error);
    return transaction;
  }

  public async deleteSellTransaction(id: string): Promise<boolean> {
    const result = await this.sellRepository.delete(id);
    if (result) {
      // Delete from cloud (non-blocking)
      this.autoDeleteFromCloud(id).catch(console.error);
    }
    return result;
  }

  public async getPendingSellTransactions(): Promise<SellTransaction[]> {
    return await this.sellRepository.findPending();
  }

  public async getSellTransactionsByBuyer(buyerName: string): Promise<SellTransaction[]> {
    return await this.sellRepository.findByBuyer(buyerName);
  }

  /**
   * Lend Transaction Operations
   */
  public async createLendTransaction(
    data: Omit<LendTransaction, 'id' | 'createdAt' | 'updatedAt' | 'transactionType'>,
  ): Promise<LendTransaction> {
    const transaction = await this.lendRepository.create(data);
    // Auto-sync to cloud (non-blocking)
    this.autoSyncToCloud(transaction).catch(console.error);
    return transaction;
  }

  public async getLendTransaction(id: string): Promise<LendTransaction | null> {
    return await this.lendRepository.findById(id);
  }

  public async getAllLendTransactions(): Promise<LendTransaction[]> {
    return await this.lendRepository.findAll();
  }

  public async updateLendTransaction(
    id: string,
    data: Partial<LendTransaction>,
  ): Promise<LendTransaction> {
    const transaction = await this.lendRepository.update(id, data);
    // Auto-sync to cloud (non-blocking)
    this.autoSyncToCloud(transaction).catch(console.error);
    return transaction;
  }

  public async deleteLendTransaction(id: string): Promise<boolean> {
    const result = await this.lendRepository.delete(id);
    if (result) {
      // Delete from cloud (non-blocking)
      this.autoDeleteFromCloud(id).catch(console.error);
    }
    return result;
  }

  public async getPendingLendTransactions(): Promise<LendTransaction[]> {
    return await this.lendRepository.findPending();
  }

  public async getLendTransactionsByPerson(personName: string): Promise<LendTransaction[]> {
    return await this.lendRepository.findByPerson(personName);
  }

  /**
   * Expense Transaction Operations
   */
  public async createExpenseTransaction(
    data: Omit<ExpenseTransaction, 'id' | 'createdAt' | 'updatedAt' | 'transactionType'>,
  ): Promise<ExpenseTransaction> {
    const transaction = await this.expenseRepository.create(data);
    // Auto-sync to cloud (non-blocking)
    this.autoSyncToCloud(transaction).catch(console.error);
    return transaction;
  }

  public async getExpenseTransaction(id: string): Promise<ExpenseTransaction | null> {
    return await this.expenseRepository.findById(id);
  }

  public async getAllExpenseTransactions(): Promise<ExpenseTransaction[]> {
    return await this.expenseRepository.findAll();
  }

  public async updateExpenseTransaction(
    id: string,
    data: Partial<ExpenseTransaction>,
  ): Promise<ExpenseTransaction> {
    const transaction = await this.expenseRepository.update(id, data);
    // Auto-sync to cloud (non-blocking)
    this.autoSyncToCloud(transaction).catch(console.error);
    return transaction;
  }

  public async deleteExpenseTransaction(id: string): Promise<boolean> {
    const result = await this.expenseRepository.delete(id);
    if (result) {
      // Delete from cloud (non-blocking)
      this.autoDeleteFromCloud(id).catch(console.error);
    }
    return result;
  }

  public async getExpenseTransactionsByCategory(
    category: string,
  ): Promise<ExpenseTransaction[]> {
    return await this.expenseRepository.findByCategory(category);
  }

  public async getExpenseTotalsByCategory(): Promise<Record<string, number>> {
    return await this.expenseRepository.getTotalByCategory();
  }

  /**
   * Dashboard Summary
   */
  public async getDashboardSummary(): Promise<DashboardSummary> {
    const [
      totalBuyAmount,
      totalSellAmount,
      totalLendAmount,
      totalExpenseAmount,
      totalPendingBuyAmount,
      totalPendingSellAmount,
      totalPendingLendAmount,
      buyTransactions,
      sellTransactions,
      lendTransactions,
      expenseTransactions,
    ] = await Promise.all([
      this.buyRepository.getTotalAmount(),
      this.sellRepository.getTotalAmount(),
      this.lendRepository.getTotalAmount(),
      this.expenseRepository.getTotalAmount(),
      this.buyRepository.getTotalPendingAmount(),
      this.sellRepository.getTotalPendingAmount(),
      this.lendRepository.getTotalPendingAmount(),
      this.buyRepository.findAll(),
      this.sellRepository.findAll(),
      this.lendRepository.findAll(),
      this.expenseRepository.findAll(),
    ]);

    // Calculate profit (Sell - Buy - Expense)
    const profit = totalSellAmount - totalBuyAmount - totalExpenseAmount;

    // Get recent transactions (last 10)
    const allTransactions: Transaction[] = [
      ...buyTransactions,
      ...sellTransactions,
      ...lendTransactions,
      ...expenseTransactions,
    ];

    const recentTransactions = allTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return {
      totalBuyAmount,
      totalSellAmount,
      totalLendAmount,
      totalExpenseAmount,
      totalPendingBuyAmount,
      totalPendingSellAmount,
      totalPendingLendAmount,
      profit,
      recentTransactions,
    };
  }

  /**
   * Get all transactions
   */
  public async getAllTransactions(): Promise<Transaction[]> {
    const [buyTransactions, sellTransactions, lendTransactions, expenseTransactions] =
      await Promise.all([
        this.buyRepository.findAll(),
        this.sellRepository.findAll(),
        this.lendRepository.findAll(),
        this.expenseRepository.findAll(),
      ]);

    const allTransactions: Transaction[] = [
      ...buyTransactions,
      ...sellTransactions,
      ...lendTransactions,
      ...expenseTransactions,
    ];

    return allTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }
}

// Export singleton instance
export default new TransactionService();
