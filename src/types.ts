export type Category = 
  | 'Food & Dining' 
  | 'Shopping' 
  | 'Transportation' 
  | 'Entertainment' 
  | 'Utilities' 
  | 'Health' 
  | 'Income' 
  | 'Other';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: Category;
  description: string;
  type: 'expense' | 'income';
}

export interface Budget {
  category: Category;
  limit: number;
  spent: number;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  topCategory: Category;
  healthScore: number; // 0-100
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  icon: string;
}

export interface AIInsight {
  type: 'warning' | 'suggestion' | 'praise';
  message: string;
  actionable?: string;
}
