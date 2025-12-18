import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cash Balance Service
 * Manages user's current cash balance and automatic updates
 */
export class CashBalanceService {
  private static readonly CASH_BALANCE_KEY = 'currentCashBalance';
  private static readonly LAST_BALANCE_UPDATE_KEY = 'lastBalanceUpdate';

  /**
   * Get current cash balance
   */
  public static async getCurrentBalance(): Promise<number> {
    try {
      const balance = await AsyncStorage.getItem(this.CASH_BALANCE_KEY);
      return balance ? parseFloat(balance) : 0;
    } catch (error) {
      console.error('Error getting cash balance:', error);
      return 0;
    }
  }

  /**
   * Set cash balance manually
   */
  public static async setBalance(amount: number): Promise<boolean> {
    try {
      await AsyncStorage.setItem(this.CASH_BALANCE_KEY, amount.toString());
      await AsyncStorage.setItem(this.LAST_BALANCE_UPDATE_KEY, new Date().toISOString());
      console.log(`Cash balance updated to: ₹${amount}`);
      // Push user meta to cloud (fire-and-forget) - lazy import to avoid circular dependency
      try {
        const {default: CloudBackupService} = await import('./CloudBackupService');
        CloudBackupService.pushUserMeta().catch(console.error);
      } catch (err) {
        console.warn('CloudBackupService not available to push meta immediately', err);
      }
      return true;
    } catch (error) {
      console.error('Error setting cash balance:', error);
      return false;
    }
  }

  /**
   * Add to cash balance (for income/receipts)
   */
  public static async addToBalance(amount: number, reason?: string): Promise<number> {
    try {
      const currentBalance = await this.getCurrentBalance();
      const newBalance = currentBalance + amount;
      await this.setBalance(newBalance);
      console.log(`Added ₹${amount} to balance. Reason: ${reason || 'Not specified'}`);
      return newBalance;
    } catch (error) {
      console.error('Error adding to balance:', error);
      throw error;
    }
  }

  /**
   * Subtract from cash balance (for expenses/payments)
   */
  public static async subtractFromBalance(amount: number, reason?: string): Promise<number> {
    try {
      const currentBalance = await this.getCurrentBalance();
      console.log(`subtractFromBalance: currentBalance=${currentBalance}, amount=${amount}, type of currentBalance=${typeof currentBalance}, type of amount=${typeof amount}`);
      const newBalance = currentBalance - amount;
      console.log(`subtractFromBalance: newBalance=${newBalance}`);
      await this.setBalance(newBalance);
      console.log(`Subtracted ₹${amount} from balance. Reason: ${reason || 'Not specified'}`);
      return newBalance;
    } catch (error) {
      console.error('Error subtracting from balance:', error);
      throw error;
    }
  }

  /**
   * Update balance on sell transaction payment received
   */
  public static async onSellPaymentReceived(
    buyerName: string,
    amount: number,
  ): Promise<number> {
    return this.addToBalance(amount, `Payment received from ${buyerName}`);
  }

  /**
   * Update balance on buy transaction payment made
   */
  public static async onBuyPaymentMade(
    supplierName: string,
    amount: number,
  ): Promise<number> {
    return this.subtractFromBalance(amount, `Payment made to ${supplierName}`);
  }

  /**
   * Update balance on expense transaction
   */
  public static async onExpensePayment(
    expenseName: string,
    amount: number,
  ): Promise<number> {
    console.log(`onExpensePayment: expenseName=${expenseName}, amount=${amount}`);
    return this.subtractFromBalance(amount, `Expense: ${expenseName}`);
  }

  /**
   * Update balance on lend transaction (money out)
   */
  public static async onLendMoney(
    personName: string,
    amount: number,
  ): Promise<number> {
    return this.subtractFromBalance(amount, `Lent money to ${personName}`);
  }

  /**
   * Update balance on lend repayment (money in)
   */
  public static async onLendRepayment(
    personName: string,
    amount: number,
  ): Promise<number> {
    return this.addToBalance(amount, `Repayment from ${personName}`);
  }

  /**
   * Get last balance update time
   */
  public static async getLastUpdateTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.LAST_BALANCE_UPDATE_KEY);
    } catch (error) {
      console.error('Error getting last update time:', error);
      return null;
    }
  }

  /**
   * Reset balance (use with caution)
   */
  public static async resetBalance(): Promise<boolean> {
    try {
      await AsyncStorage.setItem(this.CASH_BALANCE_KEY, '0');
      await AsyncStorage.setItem(this.LAST_BALANCE_UPDATE_KEY, new Date().toISOString());
      console.log('Cash balance reset to 0');
      return true;
    } catch (error) {
      console.error('Error resetting balance:', error);
      return false;
    }
  }
}

export default CashBalanceService;
