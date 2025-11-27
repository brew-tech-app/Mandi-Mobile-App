/**
 * Expense Model
 * Represents expense transactions in the system
 */
export interface Expense {
  id: string;
  date: string; // ISO date string
  amount: number;
  notes: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseDTO {
  date: string;
  amount: number;
  notes: string;
}

export interface UpdateExpenseDTO {
  date?: string;
  amount?: number;
  notes?: string;
}
