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
import ExpenseService from './ExpenseService';

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

    /**
     * Search Sell transactions by phone number
     */
    public async searchSellTransactionsByPhone(phone: string) {
      await this.initializeDatabase();
      return this.sellRepository.findAll().then(list =>
        list.filter(t => t.buyerPhone && t.buyerPhone.includes(phone))
      );
    }

    /**
     * Search Lend transactions by phone number
     */
    public async searchLendTransactionsByPhone(phone: string) {
      await this.initializeDatabase();
      return this.lendRepository.findAll().then(list =>
        list.filter(t => t.personPhone && t.personPhone.includes(phone))
      );
    }
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
   * Generate invoice number in the format YYYYMMDD + typeLetter + 4-digit sequence
   * Examples: 20251231B0001, 20251231S0001, 20251231L0001
   */
  private async generateInvoiceNumber(transactionType: 'BUY' | 'SELL' | 'LEND'): Promise<string> {
    await this.initializeDatabase();
    const now = new Date();
    const y = now.getFullYear().toString();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const datePrefix = `${y}${m}${d}`;
    const typeLetter = transactionType === 'BUY' ? 'B' : transactionType === 'SELL' ? 'S' : 'L';
    const prefix = `${datePrefix}${typeLetter}`;

    let lastInvoice: string | null = null;
    if (transactionType === 'BUY') {
      lastInvoice = await this.buyRepository.getLastInvoiceNumber(prefix);
    } else if (transactionType === 'SELL') {
      lastInvoice = await this.sellRepository.getLastInvoiceNumber(prefix);
    } else if (transactionType === 'LEND') {
      lastInvoice = await this.lendRepository.getLastInvoiceNumber(prefix);
    }

    let lastSeq = 0;
    if (lastInvoice) {
      const seqStr = lastInvoice.slice(-4);
      const parsed = parseInt(seqStr, 10);
      if (!isNaN(parsed)) lastSeq = parsed;
    }

    const nextSeq = (lastSeq + 1).toString().padStart(4, '0');
    return `${prefix}${nextSeq}`;
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
    await this.initializeDatabase();
    // Auto-generate invoice number if not provided
    if (!data.invoiceNumber) {
      data.invoiceNumber = await this.generateInvoiceNumber('BUY');
    }
    const transaction = await this.buyRepository.create(data);
    // Auto-sync to cloud (non-blocking)
    this.autoSyncToCloud(transaction).catch(console.error);
    return transaction;
  }

  /**
   * Create buy transaction from cloud data without triggering auto-sync
   */
  public async createBuyTransactionFromCloud(transaction: BuyTransaction): Promise<BuyTransaction> {
    await this.initializeDatabase();
    return await this.buyRepository.createWithId(transaction);
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

  /**
   * Update buy transaction with cloud-provided updatedAt without triggering auto-sync
   */
  public async updateBuyTransactionFromCloud(
    id: string,
    data: Partial<BuyTransaction>,
    updatedAt: string,
  ): Promise<BuyTransaction> {
    await this.initializeDatabase();
    return await this.buyRepository.updateWithTimestamp(id, data, updatedAt);
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
   * Find a buy transaction by invoice number (for deduplication during restore)
   */
  public async findBuyByInvoiceNumber(invoiceNumber: string): Promise<BuyTransaction | null> {
    await this.initializeDatabase();
    return await this.buyRepository.findByInvoiceNumber(invoiceNumber);
  }

  /**
   * Sell Transaction Operations
   */
  public async createSellTransaction(
    data: Omit<SellTransaction, 'id' | 'createdAt' | 'updatedAt' | 'transactionType'>,
  ): Promise<SellTransaction> {
    await this.initializeDatabase();
    // Auto-generate invoice number if not provided
    if (!data.invoiceNumber) {
      data.invoiceNumber = await this.generateInvoiceNumber('SELL');
    }
    const transaction = await this.sellRepository.create(data);
    // Auto-sync to cloud (non-blocking)
    this.autoSyncToCloud(transaction).catch(console.error);
    return transaction;
  }

  /**
   * Create sell transaction from cloud data without triggering auto-sync
   */
  public async createSellTransactionFromCloud(transaction: SellTransaction): Promise<SellTransaction> {
    await this.initializeDatabase();
    return await this.sellRepository.createWithId(transaction);
  }

  public async getSellTransaction(id: string): Promise<SellTransaction | null> {
    return await this.sellRepository.findById(id);
  }

  public async getAllSellTransactions(): Promise<SellTransaction[]> {
    await this.initializeDatabase();
    const list = await this.sellRepository.findAll();
    return list.map(txn => this.fillGrainTypeFromDescription(txn));
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

  /**
   * Update sell transaction with cloud-provided updatedAt without triggering auto-sync
   */
  public async updateSellTransactionFromCloud(
    id: string,
    data: Partial<SellTransaction>,
    updatedAt: string,
  ): Promise<SellTransaction> {
    await this.initializeDatabase();
    return await this.sellRepository.updateWithTimestamp(id, data, updatedAt);
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
   * Find a sell transaction by invoice number (for deduplication during restore)
   */
  public async findSellByInvoiceNumber(invoiceNumber: string): Promise<SellTransaction | null> {
    await this.initializeDatabase();
    return await this.sellRepository.findByInvoiceNumber(invoiceNumber);
  }

  public async getSellTransactionById(id: string): Promise<SellTransaction | null> {
    await this.initializeDatabase();
    const txn = await this.sellRepository.findById(id);
    if (!txn) return null;
    return this.fillGrainTypeFromDescription(txn);
  }

  /**
   * If a sell transaction has an encoded `BillOfSupplyItems::` description and its
   * `grainType` is missing, fill it from the first item in the payload.
   */
  private fillGrainTypeFromDescription(txn: SellTransaction): SellTransaction {
    try {
      if ((!txn.grainType || txn.grainType.trim() === '') && txn.description && txn.description.startsWith('BillOfSupplyItems::')) {
        const payloadStr = decodeURIComponent(txn.description.replace('BillOfSupplyItems::', ''));
        const parsed = JSON.parse(payloadStr) as any;
        const items: any[] = Array.isArray(parsed) ? parsed : (parsed.items || []);
        if (items && items.length > 0 && items[0].grainType) {
          txn.grainType = items[0].grainType;
        }
      }
    } catch (e) {
      // ignore parse errors — leave grainType as-is
      console.warn('fillGrainTypeFromDescription: failed to parse description for txn', txn.id, e);
    }
    return txn;
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
    await this.initializeDatabase();
    // Auto-generate invoice number if not provided
    if (!data.invoiceNumber) {
      data.invoiceNumber = await this.generateInvoiceNumber('LEND');
    }
    const transaction = await this.lendRepository.create(data);
    // If this is a money lend to a customer (personPhone present), deduct cash immediately
    try {
      if (data.lendType === 'MONEY') {
        if (data.personPhone) {
          // Customer loan: money goes out from cash
          await CashBalanceService.onLendMoney(data.personName, data.amount || 0);
        } else {
          // Self loan: treat as cash added to current balance
          await CashBalanceService.addToBalance(data.amount || 0, `Self loan created: ${data.personName || 'Self'}`);
        }
      }
    } catch (err) {
      console.error('Error updating cash balance on lend creation:', err);
    }
    // Auto-sync to cloud (non-blocking)
    this.autoSyncToCloud(transaction).catch(console.error);
    return transaction;
  }

  /**
   * Add a payment to a lend transaction. This will calculate interest/principal split,
   * persist payment (with interest/principal amounts), update transaction balances,
   * update cash balance and sync changes.
   */
  public async addLendPayment(
    transactionId: string,
    amount: number,
    paymentMode: 'CASH' | 'ONLINE' | 'CHEQUE',
    paymentDate?: string,
    paymentType: 'PARTIAL' | 'FINAL' = 'PARTIAL',
  ) {
    await this.initializeDatabase();

    const transaction = await this.lendRepository.findById(transactionId);
    if (!transaction) throw new Error('Transaction not found');

    // Payment date
    const payDate = paymentDate ? new Date(paymentDate) : new Date();

    // Load payment history for interest calculation
    const paymentHistory = await this.paymentRepository.findByTransactionId(transactionId);
    const sortedPayments = [...paymentHistory].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

    // Determine current principal for interest calculation
    let currentPrincipal = transaction.balanceAmount || 0;
    if (sortedPayments.length === 0) {
      currentPrincipal = transaction.amount || 0;
    }

    // Determine start date for interest calculation
    let currentDate = new Date(transaction.date);
    if (sortedPayments.length > 0) {
      const lastPayment = sortedPayments[sortedPayments.length - 1];
      currentDate = new Date(lastPayment.paymentDate);
      currentPrincipal = transaction.balanceAmount || 0;
    }

    // Interest calculation: (principal * rate * days) / (100 * 30)
    const match = transaction.description ? transaction.description.match(/Interest Rate:\s*(\d+\.?\d*)/) : null;
    const rate = match ? parseFloat(match[1]) : 0;
    const days = Math.ceil((payDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalInterest = rate > 0 && days > 0 ? Math.round((currentPrincipal * rate * days) / (100 * 30)) : 0;
    const totalAmountWithInterest = currentPrincipal + totalInterest;

    let interestPayment = 0;
    let principalPayment = 0;
    let actualAmount = amount;

    if (paymentType === 'FINAL') {
      actualAmount = totalAmountWithInterest;
      interestPayment = totalInterest;
      principalPayment = currentPrincipal;
    } else {
      // Partial: interest paid first
      interestPayment = Math.min(actualAmount, totalInterest);
      principalPayment = actualAmount - interestPayment;
    }

    // Create payment record with interest/principal split
    const payment = await this.paymentRepository.create({
      transactionId,
      transactionType: 'LEND',
      amount: actualAmount,
      paymentDate: payDate.toISOString(),
      paymentMode,
      notes: `Repayment: ₹${actualAmount.toFixed(2)} (Interest: ₹${interestPayment}, Principal: ₹${principalPayment.toFixed(2)})`,
      principalAmount: principalPayment,
      interestAmount: interestPayment,
    } as any);

    // Update transaction returned/balance amounts (principal reduces balance)
    const newReturnedAmount = (transaction.returnedAmount || 0) + principalPayment;
    const newBalanceAmount = Math.max(0, (transaction.amount || 0) - newReturnedAmount);
    const newPaymentStatus = newBalanceAmount <= 0 ? PaymentStatus.COMPLETED : PaymentStatus.PARTIAL;

    await this.lendRepository.update(transactionId, {
      returnedAmount: newReturnedAmount,
      balanceAmount: newBalanceAmount,
      paymentStatus: newPaymentStatus,
    });

    // Update cash balance
    try {
      // If this was a customer loan (personPhone present) then repayments add to cash
      if (transaction.personPhone) {
        await CashBalanceService.onLendRepayment(transaction.personName || 'Customer', actualAmount);
      } else {
        // Self loan: settling a self loan means cash goes out (deduct principal + interest)
        await CashBalanceService.subtractFromBalance(actualAmount, `Settled self loan: ${transaction.personName || 'Self'}`);
      }
    } catch (err) {
      console.error('Error updating cash balance on lend repayment:', err);
    }

    // Sync updated transaction
    const updated = await this.lendRepository.findById(transactionId);
    if (updated) this.autoSyncToCloud(updated as any).catch(console.error);

    return payment;
  }

  /**
   * Create lend transaction from cloud data without triggering auto-sync
   */
  public async createLendTransactionFromCloud(transaction: LendTransaction): Promise<LendTransaction> {
    await this.initializeDatabase();
    return await this.lendRepository.createWithId(transaction);
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

  /**
   * Update lend transaction with cloud-provided updatedAt without triggering auto-sync
   */
  public async updateLendTransactionFromCloud(
    id: string,
    data: Partial<LendTransaction>,
    updatedAt: string,
  ): Promise<LendTransaction> {
    await this.initializeDatabase();
    return await this.lendRepository.updateWithTimestamp(id, data, updatedAt);
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

  /**
   * Create expense transaction from cloud data without triggering auto-sync
   */
  public async createExpenseTransactionFromCloud(transaction: ExpenseTransaction): Promise<ExpenseTransaction> {
    await this.initializeDatabase();
    return await this.expenseRepository.createWithId(transaction);
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

  /**
   * Update expense transaction with cloud-provided updatedAt without triggering auto-sync
   */
  public async updateExpenseTransactionFromCloud(
    id: string,
    data: Partial<ExpenseTransaction>,
    updatedAt: string,
  ): Promise<ExpenseTransaction> {
    await this.initializeDatabase();
    return await this.expenseRepository.updateWithTimestamp(id, data, updatedAt);
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
    // Get expense total using new ExpenseService
    const allExpenses = await ExpenseService.getAllExpenses();
    const totalExpenseAmount = allExpenses.reduce((sum, e) => sum + e.amount, 0);

    const [
      totalBuyAmount,
      totalSellAmount,
      totalLendAmount,
      totalPendingBuyAmount,
      totalPendingSellAmount,
      totalPendingLendAmount,
      buyTransactions,
      sellTransactions,
      lendTransactions,
    ] = await Promise.all([
      this.buyRepository.getTotalAmount(),
      this.sellRepository.getTotalAmount(),
      this.lendRepository.getTotalAmount(),
      this.buyRepository.getTotalPendingAmount(),
      this.sellRepository.getTotalPendingAmount(),
      this.lendRepository.getTotalPendingAmount(),
      this.buyRepository.findAll(),
      this.sellRepository.findAll(),
      this.lendRepository.findAll(),
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
    // Calculate total interest earned in this date range from payments table
    let totalInterestEarned = 0;
    try {
      const allPayments = await this.paymentRepository.findAll();
      // No date range available in this summary; include all lend interest payments
      const interestPayments = allPayments.filter(p => p.transactionType === 'LEND');
      totalInterestEarned = interestPayments.reduce((s, p) => s + (p.interestAmount || 0), 0);
    } catch (err) {
      console.warn('Unable to calculate interest payments for dashboard summary', err);
    }
    const totalBuyLabourCharges = buyTransactions.reduce(
      (sum, t) => sum + (t.labourCharges || 0),
      0,
    );

    // Calculate profit using the formula:
    // Net Profit/Loss = Total Commission(Buy) + Total Commission(Sell) + Labour Charge(Sell) - Expense
    // Note: Sell Commission includes Bill of Supply charges (Arat + Tulak + Mandi Shulk) for applicable transactions
    const profit = totalBuyCommission + totalSellCommission + totalSellLabourCharges + totalInterestEarned - totalExpenseAmount;

    // Get recent transactions (last 10)
    // Note: Expenses are excluded from recent transactions list as they use different structure
    const allTransactions: Transaction[] = [
      ...buyTransactions,
      ...sellTransactions,
      ...lendTransactions,
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
      totalInterestEarned,
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
      ExpenseService.getAllExpenses(), // Use new ExpenseService
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
    // Filter expenses by date range (different structure from transactions)
    const expenseTransactions = allExpenseTransactions.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDate && expenseDate <= endDate;
    });

    // Calculate totals for the date range
    // Total Buy Amount = Net Payable (Gross Amount - Commission - Labour Charges)
    const totalBuyAmount = buyTransactions.reduce(
      (sum, t) => sum + t.totalAmount - (t.commissionAmount || 0) - (t.labourCharges || 0),
      0,
    );
    // Total Sell Amount = Net Receivable (Gross Amount + Commission + Labour Charges)
    const totalSellAmount = sellTransactions.reduce(
      (sum, t) => sum + t.totalAmount + (t.commissionAmount || 0) + (t.labourCharges || 0),
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

    // Include interest from lend repayments in profit calculation.
    // Interest received from customer lend repayments should increase profit.
    // Interest paid when settling self loans should decrease profit.
    const allPayments = await this.paymentRepository.findAll();
    // Map lend transactions by id for quick lookup
    const lendById: Record<string, any> = {};
    for (const lt of allLendTransactions) {
      lendById[lt.id] = lt;
    }

    // Filter payments in the requested date range
    const paymentsInRange = allPayments.filter(p => {
      const pd = new Date(p.paymentDate);
      return pd >= startDate && pd <= endDate;
    });

    let interestReceived = 0;
    let interestPaid = 0;
    for (const p of paymentsInRange) {
      if (p.transactionType === 'LEND' && p.interestAmount) {
        const lendTx = lendById[p.transactionId];
        if (lendTx && lendTx.personPhone) {
          // Customer repayment -> interest received
          interestReceived += p.interestAmount || 0;
        } else {
          // Self loan repayment or unknown -> interest paid (cash out)
          interestPaid += p.interestAmount || 0;
        }
      }
    }

    const netInterest = interestReceived - interestPaid;

    const profit = totalBuyCommission + totalSellCommission + totalSellLabourCharges - totalExpenseAmount + netInterest;

    // Get recent transactions from the date range (last 10)
    // Note: Expenses are excluded from recent transactions list as they use different structure
    const allRangeTransactions: Transaction[] = [
      ...buyTransactions,
      ...sellTransactions,
      ...lendTransactions,
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
      // Net interest (received - paid) included in profit calculation
      totalInterestEarned: netInterest,
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

    // Sync updated transaction to cloud
    const updatedTransaction = await this.buyRepository.findById(transactionId);
    if (updatedTransaction) {
      this.autoSyncToCloud(updatedTransaction as any).catch(console.error);
    }

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
   * Get interest payments within a date range along with their lend transaction
   */
  public async getInterestPaymentsByDateRange(startDate: Date, endDate: Date): Promise<Array<{payment: any; lendTransaction: LendTransaction | null;}>> {
    await this.initializeDatabase();
    const allPayments = await this.paymentRepository.findAll();
    const allLends = await this.lendRepository.findAll();

    // Map lends by id
    const lendById: Record<string, LendTransaction> = {};
    for (const l of allLends) {
      lendById[l.id] = l;
    }

    const paymentsInRange = allPayments.filter(p => {
      const pd = new Date(p.paymentDate);
      return pd >= startDate && pd <= endDate && p.transactionType === 'LEND' && (p.interestAmount || 0) !== 0;
    });

    return paymentsInRange.map(p => {
      const lendTx = lendById[p.transactionId] || null;
      const isCustomer = !!(lendTx && lendTx.personPhone);
      const interestAmt = p.interestAmount || 0;
      const signedInterest = isCustomer ? interestAmt : -interestAmt;
      return {
        payment: p,
        lendTransaction: lendTx,
        signedInterest,
        direction: isCustomer ? 'RECEIVED' : 'PAID',
      };
    });
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

    // Sync updated transaction to cloud
    const updatedSell = await this.sellRepository.findById(transactionId);
    if (updatedSell) {
      this.autoSyncToCloud(updatedSell as any).catch(console.error);
    }

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
      // Sync updated transaction to cloud
      const updatedBuy = await this.buyRepository.findById(payment.transactionId);
      if (updatedBuy) {
        this.autoSyncToCloud(updatedBuy as any).catch(console.error);
      }
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
      // Sync updated transaction to cloud
      const updatedSellTx = await this.sellRepository.findById(payment.transactionId);
      if (updatedSellTx) {
        this.autoSyncToCloud(updatedSellTx as any).catch(console.error);
      }
    }

    else if (payment.transactionType === 'LEND') {
      // Get the lend transaction
      const lendTx = await this.lendRepository.findById(payment.transactionId);
      if (!lendTx) {
        throw new Error('Lend transaction not found');
      }

      // Reverse principal/interest amounts on the lend transaction
      const principal = payment.principalAmount || 0;
      const interest = payment.interestAmount || 0;

      const newReturnedAmount = (lendTx.returnedAmount || 0) - principal;
      const newBalanceAmount = Math.max(0, (lendTx.amount || 0) - Math.max(0, newReturnedAmount));
      const newPaymentStatus: PaymentStatus = newBalanceAmount <= 0 ? PaymentStatus.COMPLETED : (newReturnedAmount > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING);

      await this.lendRepository.update(payment.transactionId, {
        returnedAmount: newReturnedAmount,
        balanceAmount: newBalanceAmount,
        paymentStatus: newPaymentStatus,
      });

      // Reverse cash balance effect of the repayment
      try {
        if (lendTx.personPhone) {
          // Customer repayment originally added cash; deleting should deduct
          const currentBalance = await CashBalanceService.getCurrentBalance();
          await CashBalanceService.setBalance(currentBalance - (payment.amount || 0));
        } else {
          // Self loan repayment originally deducted cash; deleting should add back
          const currentBalance = await CashBalanceService.getCurrentBalance();
          await CashBalanceService.setBalance(currentBalance + (payment.amount || 0));
        }
      } catch (err) {
        console.error('Error updating cash balance on lend payment deletion:', err);
      }

      // Sync updated lend transaction to cloud
      const updatedLend = await this.lendRepository.findById(payment.transactionId);
      if (updatedLend) this.autoSyncToCloud(updatedLend as any).catch(console.error);
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
