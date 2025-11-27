import DatabaseService from '../database/DatabaseService';
import {ExpenseRepository} from '../repositories/ExpenseRepository';
import {Expense, CreateExpenseDTO, UpdateExpenseDTO} from '../models/Expense';
import CashBalanceService from './CashBalanceService';

/**
 * Expense Service
 * Business logic for expense operations
 */
class ExpenseService {
  private expenseRepo: ExpenseRepository | null = null;

  /**
   * Initialize repository
   */
  private async getRepository(): Promise<ExpenseRepository> {
    if (!this.expenseRepo) {
      const db = await DatabaseService.initDatabase();
      this.expenseRepo = new ExpenseRepository(db);
    }
    return this.expenseRepo;
  }

  /**
   * Create a new expense
   */
  async createExpense(data: CreateExpenseDTO): Promise<Expense> {
    try {
      const repo = await this.getRepository();
      const expense = await repo.create({
        date: data.date,
        amount: data.amount,
        notes: data.notes,
        userId: '',
      });

      // Deduct expense from cash balance
      console.log(`Deducting expense from cash balance: ₹${data.amount}`);
      const newBalance = await CashBalanceService.onExpensePayment(
        data.notes.substring(0, 50), // Use first 50 chars of notes as expense name
        data.amount
      );
      console.log(`New cash balance after expense: ₹${newBalance}`);

      return expense;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  /**
   * Get all expenses
   */
  async getAllExpenses(): Promise<Expense[]> {
    try {
      const repo = await this.getRepository();
      return await repo.getAll();
    } catch (error) {
      console.error('Error getting expenses:', error);
      throw error;
    }
  }

  /**
   * Get expense by ID
   */
  async getExpenseById(id: string): Promise<Expense | null> {
    try {
      const repo = await this.getRepository();
      return await repo.getById(id);
    } catch (error) {
      console.error('Error getting expense:', error);
      throw error;
    }
  }

  /**
   * Update expense
   */
  async updateExpense(id: string, data: UpdateExpenseDTO): Promise<Expense> {
    try {
      const repo = await this.getRepository();
      
      // If amount is being updated, adjust cash balance
      if (data.amount !== undefined) {
        const oldExpense = await repo.getById(id);
        if (oldExpense) {
          const difference = data.amount - oldExpense.amount;
          if (difference > 0) {
            // New amount is higher, subtract the difference
            await CashBalanceService.subtractFromBalance(
              difference,
              `Expense updated: ${data.notes || oldExpense.notes}`
            );
          } else if (difference < 0) {
            // New amount is lower, add back the difference
            await CashBalanceService.addToBalance(
              Math.abs(difference),
              `Expense updated: ${data.notes || oldExpense.notes}`
            );
          }
        }
      }
      
      return await repo.update(id, data);
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  /**
   * Delete expense
   */
  async deleteExpense(id: string): Promise<boolean> {
    try {
      const repo = await this.getRepository();
      
      // Get expense details before deleting to add back to balance
      const expense = await repo.getById(id);
      if (expense) {
        // Add back the expense amount to cash balance
        await CashBalanceService.addToBalance(
          expense.amount,
          `Expense deleted: ${expense.notes.substring(0, 50)}`
        );
      }
      
      return await repo.delete(id);
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  /**
   * Get expenses by date range
   */
  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    try {
      const repo = await this.getRepository();
      return await repo.getByDateRange(startDate, endDate);
    } catch (error) {
      console.error('Error getting expenses by date range:', error);
      throw error;
    }
  }

  /**
   * Get total expenses for date range
   */
  async getTotalExpensesByDateRange(startDate: Date, endDate: Date): Promise<number> {
    try {
      const repo = await this.getRepository();
      return await repo.getTotalByDateRange(startDate, endDate);
    } catch (error) {
      console.error('Error getting total expenses:', error);
      throw error;
    }
  }
}

export default new ExpenseService();
