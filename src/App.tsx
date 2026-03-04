import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart as PieChartIcon, 
  Calendar as CalendarIcon, 
  AlertCircle, 
  CheckCircle2, 
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Target,
  ShieldCheck,
  Sparkles,
  Info,
  Bike,
  Filter,
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay, subDays, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import Markdown from 'react-markdown';

import { Transaction, Category, AIInsight, SavingsGoal } from './types';
import { MOCK_TRANSACTIONS, MOCK_SAVINGS_GOALS } from './mockData';
import { getFinancialInsights } from './services/geminiService';
import { cn } from './lib/utils';

const CATEGORY_COLORS: Record<Category, string> = {
  'Food & Dining': '#FF6B6B',
  'Shopping': '#4D96FF',
  'Transportation': '#FFD93D',
  'Entertainment': '#6BCB77',
  'Utilities': '#9B59B6',
  'Health': '#1ABC9C',
  'Income': '#2ECC71',
  'Other': '#95A5A6'
};

// Bike 3D-like Component that fills up
const BikeGuardian = ({ progress }: { progress: number }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5, x: 50 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        className="fixed bottom-8 right-8 z-50 pointer-events-none"
      >
        <div className="relative group">
          {/* Glow Effect */}
          <div className={cn(
            "absolute inset-0 blur-3xl rounded-full animate-pulse transition-colors duration-500",
            progress >= 100 ? "bg-emerald-400/30" : "bg-blue-400/30"
          )} />
          
          {/* The "Bike" Stylized Figure */}
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative w-40 h-32 flex flex-col items-center justify-center"
          >
            {/* Bike Body Outline */}
            <div className="relative w-32 h-20 border-4 border-gray-800 rounded-full flex items-center justify-center overflow-hidden bg-gray-100/50 backdrop-blur-sm">
              {/* Filling Progress */}
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${Math.min(progress, 100)}%` }}
                className={cn(
                  "absolute bottom-0 left-0 right-0 transition-colors duration-500",
                  progress >= 100 ? "bg-emerald-500/60" : "bg-blue-500/60"
                )}
              />
              <Bike className="relative z-10 text-gray-800" size={48} strokeWidth={1.5} />
            </div>

            {/* Wheels */}
            <div className="flex gap-12 -mt-4">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 border-4 border-gray-800 rounded-full bg-white flex items-center justify-center"
              >
                <div className="w-1 h-6 bg-gray-800 rounded-full" />
              </motion.div>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 border-4 border-gray-800 rounded-full bg-white flex items-center justify-center"
              >
                <div className="w-1 h-6 bg-gray-800 rounded-full" />
              </motion.div>
            </div>
          </motion.div>

          {/* Message Bubble */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute -top-12 -left-48 w-44 bg-white p-3 rounded-2xl shadow-xl border border-gray-100 text-xs font-bold text-gray-800"
          >
            {progress >= 100 
              ? "Savings Full! Ready for the ride of your life? 🏍️" 
              : `Keep saving! Bike is ${Math.round(progress)}% fueled. ⛽`}
            <div className="absolute bottom-[-6px] right-4 w-3 h-3 bg-white border-r border-b border-gray-100 rotate-45" />
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(MOCK_SAVINGS_GOALS);
  const [aiData, setAiData] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSavingsForm, setShowSavingsForm] = useState(false);
  const [showMindfulCheck, setShowMindfulCheck] = useState(false);
  const [mindfulReason, setMindfulReason] = useState("");

  // Filter State
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [showFilters, setShowFilters] = useState(false);

  // Daily Limit
  const [dailyLimit, setDailyLimit] = useState(150);

  // Calendar State
  const [viewDate, setViewDate] = useState(new Date());

  // Savings Form State
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [savingsAmount, setSavingsAmount] = useState('');

  // Form State
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('Food & Dining');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'expense' | 'income'>('expense');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = parseISO(t.date);
      return isWithinInterval(tDate, {
        start: startOfDay(parseISO(dateRange.start)),
        end: endOfDay(parseISO(dateRange.end))
      });
    });
  }, [transactions, dateRange]);

  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const balance = income - expenses;
    
    const categoryData = Object.entries(
      filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    const dailyData = filteredTransactions
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .reduce((acc, t) => {
        const date = format(parseISO(t.date), 'MMM dd');
        const existing = acc.find(d => d.date === date);
        if (existing) {
          if (t.type === 'income') existing.income += t.amount;
          else existing.expense += t.amount;
        } else {
          acc.push({ 
            date, 
            income: t.type === 'income' ? t.amount : 0, 
            expense: t.type === 'expense' ? t.amount : 0 
          });
        }
        return acc;
      }, [] as { date: string; income: number; expense: number }[]);

    return { income, expenses, balance, categoryData, dailyData };
  }, [filteredTransactions]);

  const todaySpending = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return transactions
      .filter(t => t.date === today && t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const fetchInsights = async () => {
    setIsAiLoading(true);
    const data = await getFinancialInsights(transactions);
    if (data) setAiData(data);
    setIsAiLoading(false);
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || !newDesc) return;

    const amount = parseFloat(newAmount);
    const isOverDailyLimit = (todaySpending + amount) > dailyLimit;
    const isLargeTransaction = amount > 100;

    if (newType === 'expense' && (isOverDailyLimit || isLargeTransaction)) {
      setMindfulReason(isOverDailyLimit ? "You've crossed your daily spending limit!" : "This is a large transaction.");
      setShowMindfulCheck(true);
    } else {
      finalizeTransaction();
    }
  };

  const finalizeTransaction = () => {
    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: parseFloat(newAmount),
      category: newCategory,
      description: newDesc,
      type: newType
    };

    setTransactions([transaction, ...transactions]);
    setShowAddForm(false);
    setShowMindfulCheck(false);
    setNewAmount('');
    setNewDesc('');
    // Refresh insights after adding
    setTimeout(fetchInsights, 500);
  };

  const handleAddSavings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !savingsAmount) return;

    const amount = parseFloat(savingsAmount);
    setSavingsGoals(prev => prev.map(g => 
      g.id === selectedGoalId ? { ...g, current: g.current + amount } : g
    ));

    // Also record it as a special transaction or just update the goal
    // For simplicity, we just update the goal state.
    
    setShowSavingsForm(false);
    setSavingsAmount('');
    setSelectedGoalId('');
  };

  const totalSavings = savingsGoals.reduce((acc, g) => acc + g.current, 0);
  const totalTarget = savingsGoals.reduce((acc, g) => acc + g.target, 0);
  const savingsProgress = (totalSavings / totalTarget) * 100;

  // Total Balance (All time)
  const totalBalance = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    return income - expenses;
  }, [transactions]);

  // Calendar Days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  return (
    <div className="min-h-screen pb-20">
      <BikeGuardian progress={savingsProgress} />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Wallet size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">FinPulse</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 font-medium">TOTAL BALANCE:</p>
                <p className={cn(
                  "text-sm font-bold",
                  totalBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                )}>
                  ₹{totalBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-2 rounded-xl transition-all",
                showFilters ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <Filter size={20} />
            </button>
            <button 
              onClick={() => setShowAddForm(true)}
              className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-black/10"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Transaction</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="max-w-7xl mx-auto overflow-hidden"
            >
              <div className="p-6 pt-2 flex flex-wrap gap-6 items-end border-t border-gray-50 mt-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start Date</label>
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="block w-full bg-gray-50 border-none rounded-lg text-sm p-2 focus:ring-2 focus:ring-black"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">End Date</label>
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="block w-full bg-gray-50 border-none rounded-lg text-sm p-2 focus:ring-2 focus:ring-black"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daily Limit (₹)</label>
                  <input 
                    type="number" 
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(parseFloat(e.target.value) || 0)}
                    className="block w-40 bg-gray-50 border-none rounded-lg text-sm p-2 focus:ring-2 focus:ring-black"
                  />
                </div>
                <button 
                  onClick={() => {
                    setDateRange({
                      start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
                      end: format(new Date(), 'yyyy-MM-dd')
                    });
                  }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 mb-2"
                >
                  Reset Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Overview & Charts */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Daily Limit Warning */}
          {todaySpending > dailyLimit && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-4 text-rose-700"
            >
              <div className="p-2 bg-rose-100 rounded-xl">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="font-bold">Daily Limit Exceeded!</p>
                <p className="text-sm opacity-80">You've spent ${todaySpending.toFixed(2)} today, which is over your ${dailyLimit} limit.</p>
              </div>
            </motion.div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <TrendingUp size={20} />
                </div>
              </div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Period Income</p>
              <h3 className="text-2xl font-bold mt-1">₹{stats.income.toLocaleString()}</h3>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <TrendingDown size={20} />
                </div>
              </div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Period Expenses</p>
              <h3 className="text-2xl font-bold mt-1">₹{stats.expenses.toLocaleString()}</h3>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Target size={20} />
                </div>
                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-1000" 
                    style={{ width: `${Math.min((stats.balance / (stats.income || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Period Savings</p>
              <h3 className="text-2xl font-bold mt-1">₹{Math.max(0, stats.balance).toLocaleString()}</h3>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 bg-black text-white border-none"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-white/10 text-white rounded-lg">
                  <Wallet size={20} />
                </div>
              </div>
              <p className="text-sm text-gray-400 font-medium uppercase tracking-wider">Period Balance</p>
              <h3 className="text-2xl font-bold mt-1">₹{stats.balance.toLocaleString()}</h3>
            </motion.div>
          </div>

          {/* Savings Goals Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Target className="text-emerald-500" size={20} />
                Savings Goals
              </h2>
              <div className="flex items-center gap-4">
                <p className="text-xs font-bold text-gray-400 uppercase">Total: ₹{totalSavings.toLocaleString()}</p>
                <button 
                  onClick={() => {
                    setSelectedGoalId(savingsGoals[0]?.id || '');
                    setShowSavingsForm(true);
                  }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Add to Savings
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {savingsGoals.map((goal, i) => (
                <motion.div 
                  key={goal.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-4 relative overflow-hidden group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{goal.icon}</span>
                    <div>
                      <h4 className="text-sm font-bold">{goal.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                        ₹{goal.current.toLocaleString()} / ₹{goal.target.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(goal.current / goal.target) * 100}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        (goal.current / goal.target) >= 1 ? "bg-emerald-500" : "bg-emerald-400"
                      )}
                    />
                  </div>
                  {(goal.current / goal.target) >= 1 && (
                    <div className="absolute top-2 right-2 text-emerald-500">
                      <ShieldCheck size={16} />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Main Chart */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-lg font-bold">Spending Trends</h2>
                <p className="text-sm text-gray-500">Daily income vs expenses</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-gray-600">Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-xs font-medium text-gray-600">Expense</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.dailyData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorIncome)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expense" 
                    stroke="#f43f5e" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorExpense)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Calendar Spending View */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <CalendarIcon className="text-black" size={20} />
                  Spending Calendar
                </h2>
                <p className="text-sm text-gray-500">Daily spending overview</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setViewDate(subMonths(viewDate, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowDownRight className="rotate-135" size={18} />
                </button>
                <span className="text-sm font-bold min-w-[100px] text-center">
                  {format(viewDate, 'MMMM yyyy')}
                </span>
                <button 
                  onClick={() => setViewDate(addMonths(viewDate, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowUpRight className="-rotate-45" size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-gray-50 py-2 text-center text-[10px] font-bold text-gray-400 uppercase">
                  {day}
                </div>
              ))}
              {/* Padding for first day of month */}
              {Array.from({ length: startOfMonth(viewDate).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} className="bg-white h-24" />
              ))}
              {calendarDays.map(day => {
                const daySpent = transactions
                  .filter(t => t.type === 'expense' && isSameDay(parseISO(t.date), day))
                  .reduce((acc, t) => acc + t.amount, 0);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div key={day.toString()} className={cn(
                    "bg-white h-24 p-2 flex flex-col justify-between border-t border-l border-gray-50 transition-colors hover:bg-gray-50/50",
                    isToday && "bg-emerald-50/30"
                  )}>
                    <span className={cn(
                      "text-xs font-bold",
                      isToday ? "text-emerald-600" : "text-gray-400"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {daySpent > 0 && (
                      <div className={cn(
                        "text-[10px] font-black p-1 rounded-lg text-center truncate",
                        daySpent > dailyLimit ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-700"
                      )}>
                        ₹{daySpent.toFixed(0)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Grid: Categories & Recent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-6">Expense Categories</h2>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name as Category] || '#ccc'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {stats.categoryData.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.name as Category] }} />
                    <span className="text-xs text-gray-600 truncate">{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6 overflow-hidden">
              <h2 className="text-lg font-bold mb-6">Activity for Period</h2>
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <CalendarIcon size={40} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No transactions found for this period.</p>
                  </div>
                ) : (
                  filteredTransactions.slice(0, 20).map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          t.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {t.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{t.description}</p>
                          <p className="text-xs text-gray-500">{t.category} • {format(parseISO(t.date), 'MMM dd')}</p>
                        </div>
                      </div>
                      <p className={cn(
                        "text-sm font-bold",
                        t.type === 'income' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {t.type === 'income' ? '+' : '-'}₹{t.amount.toFixed(2)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Connected Financial Apps */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Sparkles className="text-emerald-500" size={20} />
              Connected Financial Apps
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'PhonePe', icon: '🟣', status: 'Connected' },
                { name: 'Google Pay', icon: '🔵', status: 'Connect' },
                { name: 'Paytm', icon: '🟦', status: 'Connect' },
                { name: 'HDFC Bank', icon: '🏦', status: 'Connected' }
              ].map((app) => (
                <div key={app.name} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                  <span className="text-3xl mb-2">{app.icon}</span>
                  <p className="text-sm font-bold mb-1">{app.name}</p>
                  <button className={cn(
                    "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest transition-all",
                    app.status === 'Connected' ? "bg-emerald-100 text-emerald-700" : "bg-black text-white hover:bg-gray-800"
                  )}>
                    {app.status}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Insights & Health */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Health Score */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 text-center"
          >
            <h2 className="text-lg font-bold mb-6">Financial Health</h2>
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  className="text-gray-100 stroke-current"
                  strokeWidth="8"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
                <circle
                  className={cn(
                    "stroke-current transition-all duration-1000 ease-out",
                    (aiData?.healthScore || 0) > 70 ? "text-emerald-500" : (aiData?.healthScore || 0) > 40 ? "text-amber-500" : "text-rose-500"
                  )}
                  strokeWidth="8"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * (aiData?.healthScore || 0)) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black">{aiData?.healthScore || '--'}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Score</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 italic">
              {aiData?.healthJustification || "Analyzing your spending patterns..."}
            </p>
          </motion.div>

          {/* AI Insights */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Lightbulb className="text-amber-500" size={20} />
                AI Insights
              </h2>
              {isAiLoading && <Loader2 className="animate-spin text-gray-400" size={18} />}
            </div>

            <div className="space-y-4">
              {isAiLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-50 rounded w-full" />
                    </div>
                  </div>
                ))
              ) : (
                aiData?.suggestions?.map((insight: any, i: number) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-3 p-3 rounded-xl bg-gray-50/50 border border-gray-100"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      insight.type === 'warning' ? "bg-rose-50 text-rose-600" : 
                      insight.type === 'praise' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {insight.type === 'warning' ? <AlertCircle size={20} /> : 
                       insight.type === 'praise' ? <CheckCircle2 size={20} /> : <Lightbulb size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-tight">{insight.message}</p>
                      {insight.actionable && (
                        <p className="text-xs text-gray-500 mt-1 font-mono uppercase tracking-tighter">
                          Tip: {insight.actionable}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Monthly Summary</h3>
              <div className="text-sm text-gray-600 leading-relaxed prose prose-sm">
                {aiData?.summary ? (
                  <Markdown>{aiData.summary}</Markdown>
                ) : (
                  "Your monthly summary will appear here once analysis is complete."
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddForm(false);
                setShowMindfulCheck(false);
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <AnimatePresence mode="wait">
                  {!showMindfulCheck ? (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <h2 className="text-2xl font-bold mb-6">New Transaction</h2>
                      <form onSubmit={handleInitialSubmit} className="space-y-4">
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                          <button 
                            type="button"
                            onClick={() => setNewType('expense')}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                              newType === 'expense' ? "bg-white shadow-sm text-rose-600" : "text-gray-500"
                            )}
                          >
                            Expense
                          </button>
                          <button 
                            type="button"
                            onClick={() => setNewType('income')}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                              newType === 'income' ? "bg-white shadow-sm text-emerald-600" : "text-gray-500"
                            )}
                          >
                            Income
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Amount</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                            <input 
                              type="number" 
                              value={newAmount}
                              onChange={(e) => setNewAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-gray-50 border-none rounded-xl py-3 pl-8 pr-4 focus:ring-2 focus:ring-black transition-all font-bold text-lg"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                          <input 
                            type="text" 
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            placeholder="What was it for?"
                            className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-black transition-all"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Category</label>
                          <select 
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value as Category)}
                            className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-black transition-all"
                          >
                            <option>Food & Dining</option>
                            <option>Shopping</option>
                            <option>Transportation</option>
                            <option>Entertainment</option>
                            <option>Utilities</option>
                            <option>Health</option>
                            <option>Income</option>
                            <option>Other</option>
                          </select>
                        </div>

                        <div className="pt-4 flex gap-3">
                          <button 
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit"
                            className="flex-[2] bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-black/20"
                          >
                            {newType === 'income' ? 'Add Income' : 'Review Payment'}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="mindful"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="text-center"
                    >
                      <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Info size={40} />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Mindful Check</h2>
                      <p className="text-rose-500 text-xs font-bold uppercase mb-4">{mindfulReason}</p>
                      <p className="text-gray-500 mb-8 px-4">
                        You're about to spend <span className="font-bold text-black">₹{newAmount}</span> on <span className="font-bold text-black">{newDesc}</span>. 
                        Is this transaction truly necessary right now?
                      </p>
                      
                      <div className="space-y-3">
                        <button 
                          onClick={finalizeTransaction}
                          className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-black/20"
                        >
                          Yes, I need this
                        </button>
                        <button 
                          onClick={() => {
                            setShowMindfulCheck(false);
                            setShowAddForm(false);
                          }}
                          className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                        >
                          No, I'll skip it
                        </button>
                      </div>
                      <p className="mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        The Eternals value your discipline
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Savings Modal */}
      <AnimatePresence>
        {showSavingsForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSavingsForm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Add to Savings</h2>
                <form onSubmit={handleAddSavings} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Select Goal</label>
                    <select 
                      value={selectedGoalId}
                      onChange={(e) => setSelectedGoalId(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-black transition-all"
                    >
                      {savingsGoals.map(g => (
                        <option key={g.id} value={g.id}>{g.icon} {g.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Amount to Save</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input 
                        type="number" 
                        value={savingsAmount}
                        onChange={(e) => setSavingsAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-gray-50 border-none rounded-xl py-3 pl-8 pr-4 focus:ring-2 focus:ring-black transition-all font-bold text-lg"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowSavingsForm(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-200"
                    >
                      Confirm Savings
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
