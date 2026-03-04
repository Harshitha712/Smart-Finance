import { Transaction, SavingsGoal } from './types';
import { subDays, format } from 'date-fns';

const now = new Date();

export const MOCK_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: 'g1',
    name: 'Emergency Fund',
    target: 5000,
    current: 3200,
    icon: '🛡️'
  },
  {
    id: 'g2',
    name: 'New Laptop',
    target: 2000,
    current: 1850,
    icon: '💻'
  },
  {
    id: 'g3',
    name: 'Vacation',
    target: 3000,
    current: 450,
    icon: '✈️'
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    date: format(subDays(now, 1), 'yyyy-MM-dd'),
    amount: 45.50,
    category: 'Food & Dining',
    description: 'Whole Foods Market',
    type: 'expense'
  },
  {
    id: '2',
    date: format(subDays(now, 2), 'yyyy-MM-dd'),
    amount: 120.00,
    category: 'Shopping',
    description: 'Amazon - Electronics',
    type: 'expense'
  },
  {
    id: '3',
    date: format(subDays(now, 3), 'yyyy-MM-dd'),
    amount: 3500.00,
    category: 'Income',
    description: 'Monthly Salary',
    type: 'income'
  },
  {
    id: '4',
    date: format(subDays(now, 4), 'yyyy-MM-dd'),
    amount: 15.00,
    category: 'Transportation',
    description: 'Uber Ride',
    type: 'expense'
  },
  {
    id: '5',
    date: format(subDays(now, 5), 'yyyy-MM-dd'),
    amount: 60.00,
    category: 'Utilities',
    description: 'Electric Bill',
    type: 'expense'
  },
  {
    id: '6',
    date: format(subDays(now, 6), 'yyyy-MM-dd'),
    amount: 80.00,
    category: 'Entertainment',
    description: 'Netflix & Spotify',
    type: 'expense'
  },
  {
    id: '7',
    date: format(subDays(now, 10), 'yyyy-MM-dd'),
    amount: 200.00,
    category: 'Shopping',
    description: 'Nike Store',
    type: 'expense'
  },
  {
    id: '8',
    date: format(subDays(now, 12), 'yyyy-MM-dd'),
    amount: 30.00,
    category: 'Food & Dining',
    description: 'Starbucks Coffee',
    type: 'expense'
  }
];
