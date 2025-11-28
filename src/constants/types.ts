// Re-export responsive utilities for easy access
export * from '../utils/responsive';
export {useResponsive} from '../hooks/useResponsive';

/**
 * Grain Types
 */
export const GRAIN_TYPES = [
  'Wheat',
  'Rice',
  'Barley',
  'Corn',
  'Millet',
  'Sorghum',
  'Oats',
  'Rye',
  'Bajra',
  'Jowar',
  'Maize',
  'Other',
] as const;

export type GrainType = typeof GRAIN_TYPES[number];

/**
 * Expense Categories
 */
export const EXPENSE_CATEGORIES = [
  'Transport',
  'Labor',
  'Storage',
  'Maintenance',
  'Office Supplies',
  'Utilities',
  'Rent',
  'Salary',
  'Taxes',
  'Insurance',
  'Marketing',
  'Miscellaneous',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

/**
 * Payment Modes
 */
export const PAYMENT_MODES = ['CASH', 'ONLINE', 'CHEQUE'] as const;

export type PaymentMode = typeof PAYMENT_MODES[number];

/**
 * Lend Types
 */
export const LEND_TYPES = ['MONEY', 'GRAIN'] as const;

export type LendType = typeof LEND_TYPES[number];
