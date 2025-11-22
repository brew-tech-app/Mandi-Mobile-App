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
   * Buy Transaction Operations
   */
  public async createBuyTransaction(
    data: Omit<BuyTransaction, 'id' | 'createdAt' | 'updatedAt' | 'transactionType'>,
  ): Promise<BuyTransaction> {
    return await this.buyRepository.create(data);
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
    return await this.buyRepository.update(id, data);
  }

  public async deleteBuyTransaction(id: string): Promise<boolean> {
    return await this.buyRepository.delete(id);
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
    return await this.sellRepository.create(data);
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
    return await this.sellRepository.update(id, data);
  }

  public async deleteSellTransaction(id: string): Promise<boolean> {
    return await this.sellRepository.delete(id);
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
    return await this.lendRepository.create(data);
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
    return await this.lendRepository.update(id, data);
  }

  public async deleteLendTransaction(id: string): Promise<boolean> {
    return await this.lendRepository.delete(id);
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
    return await this.expenseRepository.create(data);
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
    return await this.expenseRepository.update(id, data);
  }

  public async deleteExpenseTransaction(id: string): Promise<boolean> {
    return await this.expenseRepository.delete(id);
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
