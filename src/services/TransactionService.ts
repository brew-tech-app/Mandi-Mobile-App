import {
  BuyTransaction,
  SellTransaction,
  LendTransaction,
  ExpenseTransaction,
  DashboardSummary,
  Transaction,
  PaymentStatus,
} from '../models/Transaction';
import {BuyTransactionRepository} from '../repositories/BuyTransactionRepository';
import {SellTransactionRepository} from '../repositories/SellTransactionRepository';
import {LendTransactionRepository} from '../repositories/LendTransactionRepository';
import {ExpenseTransactionRepository} from '../repositories/ExpenseTransactionRepository';
import {FarmerRepository} from '../repositories/FarmerRepository';
import {PaymentRepository} from '../repositories/PaymentRepository';
import {Farmer} from '../models/Farmer';
import {Payment} from '../models/Payment';
import DatabaseService from '../database/DatabaseService';
import CashBalanceService from './CashBalanceService';
import AuthService from './AuthService';
import DailyResetService from './DailyResetService';

/**
 * Transaction Service Interface
 * Following Dependency Inversion Principle - depend on abstractions
 */
export interface StockByGrainType {
  grainType: string;
  stock: number;
}

export interface ITransactionService {
  initializeDatabase(): Promise<void>;
  getDashboardSummary(): Promise<DashboardSummary>;
  getDashboardSummaryByDateRange(startDate: Date, endDate: Date): Promise<DashboardSummary>;
  getStockSummary(): Promise<number>;
  getStockByGrainType(): Promise<StockByGrainType[]>;
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
  private farmerRepository!: FarmerRepository;
  private paymentRepository!: PaymentRepository;
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
    this.farmerRepository = new FarmerRepository(db);
    this.expenseRepository = new ExpenseTransactionRepository(db);
    this.paymentRepository = new PaymentRepository(db);
    
    // Check and perform daily reset if needed
    await DailyResetService.checkAndResetIfNewDay();
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

      // Lazy import to avoid circular dependency
      const {default: CloudBackupService} = await import('./CloudBackupService');
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

      // Lazy import to avoid circular dependency
      const {default: CloudBackupService} = await import('./CloudBackupService');
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

  public async getBuyTransactionById(id: string): Promise<BuyTransaction | null> {
    return await this.buyRepository.findById(id);
  }

  public async getAllBuyTransactions(): Promise<BuyTransaction[]> {
    return await this.buyRepository.findAll();
  }

  public async searchBuyTransactionsByPhone(phone: string): Promise<BuyTransaction[]> {
    const allTransactions = await this.buyRepository.findAll();
    return allTransactions.filter(t => 
      t.supplierPhone && t.supplierPhone.includes(phone)
    );
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

  public async getFarmerByPhone(phone: string): Promise<Farmer | null> {
    return await this.farmerRepository.findByPhoneNumber(phone);
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

  public async getSellTransactionById(id: string): Promise<SellTransaction | null> {
    return await this.sellRepository.findById(id);
  }

  public async getMerchantByPhone(phone: string): Promise<any | null> {
    const {MerchantRepository} = await import('../repositories/MerchantRepository');
    const db = await this.dbService.initDatabase();
    const merchantRepo = new MerchantRepository(db);
    return await merchantRepo.findByPhoneNumber(phone);
  }

  public async getCustomerByPhone(phone: string): Promise<any | null> {
    const {CustomerRepository} = await import('../repositories/CustomerRepository');
    const db = await this.dbService.initDatabase();
    const customerRepo = new CustomerRepository(db);
    return await customerRepo.findByPhoneNumber(phone);
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

    // Calculate total commissions and labour charges
    const totalBuyCommission = buyTransactions.reduce(
      (sum, t) => sum + (t.commissionAmount || 0),
      0,
    );
    // Note: totalSellCommission includes Bill of Supply charges (Arat + Tulak + Mandi Shulk) for Bill of Supply transactions
    const totalSellCommission = sellTransactions.reduce(
      (sum, t) => sum + (t.commissionAmount || 0),
      0,
    );
    const totalSellLabourCharges = sellTransactions.reduce(
      (sum, t) => sum + (t.labourCharges || 0),
      0,
    );
    const totalBuyLabourCharges = buyTransactions.reduce(
      (sum, t) => sum + (t.labourCharges || 0),
      0,
    );

    // Calculate profit using the formula:
    // Net Profit/Loss = Total Commission(Buy) + Total Commission(Sell) + Labour Charge(Sell) - Expense
    // Note: Sell Commission includes Bill of Supply charges (Arat + Tulak + Mandi Shulk) for applicable transactions
    const profit = totalBuyCommission + totalSellCommission + totalSellLabourCharges - totalExpenseAmount;

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
      totalBuyLabourCharges,
      totalBuyCommission,
      totalSellCommission,
      totalSellLabourCharges,
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

  /**
   * Filter transactions by date range
   */
  private filterTransactionsByDateRange<T extends Transaction>(
    transactions: T[],
    startDate: Date,
    endDate: Date,
  ): T[] {
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return DailyResetService.isDateInRange(transactionDate, startDate, endDate);
    });
  }

  /**
   * Get dashboard summary filtered by date range
   * For operational summary views (Daily/Monthly/Quarterly/Custom)
   */
  public async getDashboardSummaryByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<DashboardSummary> {
    // Get all transactions
    const [
      allBuyTransactions,
      allSellTransactions,
      allLendTransactions,
      allExpenseTransactions,
    ] = await Promise.all([
      this.buyRepository.findAll(),
      this.sellRepository.findAll(),
      this.lendRepository.findAll(),
      this.expenseRepository.findAll(),
    ]);

    // Filter by date range
    const buyTransactions = this.filterTransactionsByDateRange(
      allBuyTransactions,
      startDate,
      endDate,
    );
    const sellTransactions = this.filterTransactionsByDateRange(
      allSellTransactions,
      startDate,
      endDate,
    );
    const lendTransactions = this.filterTransactionsByDateRange(
      allLendTransactions,
      startDate,
      endDate,
    );
    const expenseTransactions = this.filterTransactionsByDateRange(
      allExpenseTransactions,
      startDate,
      endDate,
    );

    // Calculate totals for the date range
    // Total Buy Amount = Net Payable (Gross Amount - Commission - Labour Charges)
    const totalBuyAmount = buyTransactions.reduce(
      (sum, t) => sum + t.totalAmount - (t.commissionAmount || 0) - (t.labourCharges || 0),
      0,
    );
    const totalSellAmount = sellTransactions.reduce(
      (sum, t) => sum + t.totalAmount,
      0,
    );
    const totalLendAmount = lendTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );
    const totalExpenseAmount = expenseTransactions.reduce(
      (sum, t) => sum + t.amount,
      0,
    );

    // Calculate pending amounts (running totals - not filtered by date)
    const totalPendingBuyAmount = allBuyTransactions
      .filter(t => t.paymentStatus === PaymentStatus.PENDING || t.paymentStatus === PaymentStatus.PARTIAL)
      .reduce((sum, t) => sum + t.balanceAmount, 0);

    const totalPendingSellAmount = allSellTransactions
      .filter(t => t.paymentStatus === PaymentStatus.PENDING || t.paymentStatus === PaymentStatus.PARTIAL)
      .reduce((sum, t) => sum + t.balanceAmount, 0);

    const totalPendingLendAmount = allLendTransactions
      .filter(t => t.paymentStatus === PaymentStatus.PENDING || t.paymentStatus === PaymentStatus.PARTIAL)
      .reduce((sum, t) => sum + t.balanceAmount, 0);

    // Calculate total commissions and labour charges
    const totalBuyCommission = buyTransactions.reduce(
      (sum, t) => sum + (t.commissionAmount || 0),
      0,
    );
    // Note: totalSellCommission includes Bill of Supply charges (Arat + Tulak + Mandi Shulk) for Bill of Supply transactions
    const totalSellCommission = sellTransactions.reduce(
      (sum, t) => sum + (t.commissionAmount || 0),
      0,
    );
    const totalSellLabourCharges = sellTransactions.reduce(
      (sum, t) => sum + (t.labourCharges || 0),
      0,
    );
    const totalBuyLabourCharges = buyTransactions.reduce(
      (sum, t) => sum + (t.labourCharges || 0),
      0,
    );

    // Calculate profit using the formula:
    // Net Profit/Loss = Total Commission(Buy) + Total Commission(Sell) + Labour Charge(Sell) - Expense
    // Note: Sell Commission includes Bill of Supply charges (Arat + Tulak + Mandi Shulk) for applicable transactions
    const profit = totalBuyCommission + totalSellCommission + totalSellLabourCharges - totalExpenseAmount;

    // Get recent transactions from the date range (last 10)
    const allRangeTransactions: Transaction[] = [
      ...buyTransactions,
      ...sellTransactions,
      ...lendTransactions,
      ...expenseTransactions,
    ];

    const recentTransactions = allRangeTransactions
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
      totalBuyLabourCharges,
      totalBuyCommission,
      totalSellCommission,
      totalSellLabourCharges,
      profit,
      recentTransactions,
    };
  }

  /**
   * Get daily operational summary (today only)
   */
  public async getDailyOperationalSummary(): Promise<DashboardSummary> {
    const startDate = DailyResetService.getStartOfDay();
    const endDate = DailyResetService.getEndOfDay();
    return this.getDashboardSummaryByDateRange(startDate, endDate);
  }

  /**
   * Get monthly operational summary (current month)
   */
  public async getMonthlyOperationalSummary(): Promise<DashboardSummary> {
    const startDate = DailyResetService.getStartOfMonth();
    const endDate = DailyResetService.getEndOfMonth();
    return this.getDashboardSummaryByDateRange(startDate, endDate);
  }

  /**
   * Get quarterly operational summary (current quarter)
   */
  public async getQuarterlyOperationalSummary(): Promise<DashboardSummary> {
    const startDate = DailyResetService.getStartOfQuarter();
    const endDate = DailyResetService.getEndOfQuarter();
    return this.getDashboardSummaryByDateRange(startDate, endDate);
  }

  /**
   * Add a payment to a buy transaction and update cash balance
   */
  public async addBuyPayment(
    transactionId: string,
    amount: number,
    paymentMode: 'CASH' | 'ONLINE' | 'CHEQUE',
    notes?: string,
  ): Promise<Payment> {
    // Get the transaction
    const transaction = await this.buyRepository.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Validate payment amount
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    if (amount > transaction.balanceAmount) {
      throw new Error('Payment amount cannot exceed balance amount');
    }

    // Create payment record
    const payment = await this.paymentRepository.create({
      transactionId,
      transactionType: 'BUY',
      amount,
      paymentDate: new Date().toISOString(),
      paymentMode,
      notes,
    });

    // Update transaction balances
    const newPaidAmount = transaction.paidAmount + amount;
    const newBalanceAmount = transaction.balanceAmount - amount;
    const newPaymentStatus: PaymentStatus = 
      newBalanceAmount === 0 ? PaymentStatus.COMPLETED :
      newPaidAmount > 0 ? PaymentStatus.PARTIAL :
      PaymentStatus.PENDING;

    await this.buyRepository.update(transactionId, {
      paidAmount: newPaidAmount,
      balanceAmount: newBalanceAmount,
      paymentStatus: newPaymentStatus,
    });

    // Deduct from cash balance
    const currentBalance = await CashBalanceService.getCurrentBalance();
    await CashBalanceService.setBalance(currentBalance - amount);

    return payment;
  }

  /**
   * Get all payments for a transaction
   */
  public async getPaymentsByTransactionId(transactionId: string): Promise<Payment[]> {
    return await this.paymentRepository.findByTransactionId(transactionId);
  }

  /**
   * Get total paid amount for a transaction
   */
  public async getTotalPaidForTransaction(transactionId: string): Promise<number> {
    return await this.paymentRepository.getTotalPaidForTransaction(transactionId);
  }

  /**
   * Add a payment to a sell transaction and update cash balance
   */
  public async addSellPayment(
    transactionId: string,
    amount: number,
    paymentMode: 'CASH' | 'ONLINE' | 'CHEQUE',
    notes?: string,
  ): Promise<Payment> {
    // Get the transaction
    const transaction = await this.sellRepository.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Validate payment amount
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    if (amount > transaction.balanceAmount) {
      throw new Error('Payment amount cannot exceed balance amount');
    }

    // Create payment record
    const payment = await this.paymentRepository.create({
      transactionId,
      transactionType: 'SELL',
      amount,
      paymentDate: new Date().toISOString(),
      paymentMode,
      notes,
    });

    // Update transaction balances
    const newReceivedAmount = transaction.receivedAmount + amount;
    const newBalanceAmount = transaction.balanceAmount - amount;
    const newPaymentStatus: PaymentStatus = 
      newBalanceAmount === 0 ? PaymentStatus.COMPLETED :
      newReceivedAmount > 0 ? PaymentStatus.PARTIAL :
      PaymentStatus.PENDING;

    await this.sellRepository.update(transactionId, {
      receivedAmount: newReceivedAmount,
      balanceAmount: newBalanceAmount,
      paymentStatus: newPaymentStatus,
    });

    // Add to cash balance (receiving payment)
    const currentBalance = await CashBalanceService.getCurrentBalance();
    await CashBalanceService.setBalance(currentBalance + amount);

    return payment;
  }

  /**
   * Delete a payment and reverse the cash balance and transaction updates
   */
  public async deletePayment(paymentId: string): Promise<boolean> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.transactionType === 'BUY') {
      // Get the buy transaction
      const transaction = await this.buyRepository.findById(payment.transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Reverse the payment
      const newPaidAmount = transaction.paidAmount - payment.amount;
      const newBalanceAmount = transaction.balanceAmount + payment.amount;
      const newPaymentStatus: PaymentStatus = 
        newBalanceAmount === transaction.totalAmount ? PaymentStatus.PENDING :
        newPaidAmount > 0 ? PaymentStatus.PARTIAL :
        PaymentStatus.PENDING;

      await this.buyRepository.update(payment.transactionId, {
        paidAmount: newPaidAmount,
        balanceAmount: newBalanceAmount,
        paymentStatus: newPaymentStatus,
      });

      // Add back to cash balance
      const currentBalance = await CashBalanceService.getCurrentBalance();
      await CashBalanceService.setBalance(currentBalance + payment.amount);
    } else if (payment.transactionType === 'SELL') {
      // Get the sell transaction
      const transaction = await this.sellRepository.findById(payment.transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Reverse the payment
      const newReceivedAmount = transaction.receivedAmount - payment.amount;
      const newBalanceAmount = transaction.balanceAmount + payment.amount;
      const newPaymentStatus: PaymentStatus = 
        newBalanceAmount === transaction.totalAmount ? PaymentStatus.PENDING :
        newReceivedAmount > 0 ? PaymentStatus.PARTIAL :
        PaymentStatus.PENDING;

      await this.sellRepository.update(payment.transactionId, {
        receivedAmount: newReceivedAmount,
        balanceAmount: newBalanceAmount,
        paymentStatus: newPaymentStatus,
      });

      // Deduct from cash balance (reversing received payment)
      const currentBalance = await CashBalanceService.getCurrentBalance();
      await CashBalanceService.setBalance(currentBalance - payment.amount);
    }

    // Delete the payment record
    return await this.paymentRepository.delete(paymentId);
  }

  /**
   * Get total stock (running total)
   * Stock = Total Buy Quantity - Total Sell Quantity
   */
  public async getStockSummary(): Promise<number> {
    const buyTransactions = await this.buyRepository.findAll();
    const sellTransactions = await this.sellRepository.findAll();

    const totalBuyQuantity = buyTransactions.reduce((sum, tx) => sum + tx.quantity, 0);
    const totalSellQuantity = sellTransactions.reduce((sum, tx) => sum + tx.quantity, 0);

    return totalBuyQuantity - totalSellQuantity;
  }

  /**
   * Get stock breakdown by grain type
   * Groups stock by grain type and calculates running total for each
   */
  public async getStockByGrainType(): Promise<StockByGrainType[]> {
    const buyTransactions = await this.buyRepository.findAll();
    const sellTransactions = await this.sellRepository.findAll();

    // Group buy transactions by grain type
    const buyByGrain = buyTransactions.reduce((acc, tx) => {
      const grain = tx.grainType.trim().toLowerCase();
      acc[grain] = (acc[grain] || 0) + tx.quantity;
      return acc;
    }, {} as Record<string, number>);

    // Subtract sell transactions
    const stockByGrain = sellTransactions.reduce((acc, tx) => {
      const grain = tx.grainType.trim().toLowerCase();
      acc[grain] = (acc[grain] || 0) - tx.quantity;
      return acc;
    }, buyByGrain);

    // Convert to array and capitalize grain type names
    return Object.entries(stockByGrain)
      .map(([grainType, stock]) => ({
        grainType: grainType.charAt(0).toUpperCase() + grainType.slice(1),
        stock,
      }))
      .filter(item => item.stock !== 0) // Filter out zero stock items
      .sort((a, b) => b.stock - a.stock); // Sort by stock descending
  }
}

// Export singleton instance
export default new TransactionService();
