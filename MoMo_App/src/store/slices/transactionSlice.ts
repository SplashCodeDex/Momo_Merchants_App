import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Transaction {
  id: string;
  type: 'Cash-In' | 'Cash-Out' | 'Bill Pay' | 'Transfer';
  amount: number;
  description: string;
  timestamp: number;
  balance?: number;
  sender?: string;
  recipient?: string;
}

interface TransactionState {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  filterType: string;
  filterDateFrom: number | null;
  filterDateTo: number | null;
  filterAmountMin: number | null;
  filterAmountMax: number | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: TransactionState = {
  transactions: [],
  filteredTransactions: [],
  filterType: 'All',
  filterDateFrom: null,
  filterDateTo: null,
  filterAmountMin: null,
  filterAmountMax: null,
  isLoading: false,
  error: null,
};

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setTransactions: (state, action: PayloadAction<Transaction[]>) => {
      state.transactions = action.payload;
      state.filteredTransactions = action.payload;
    },
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.unshift(action.payload);
      state.filteredTransactions = state.transactions;
    },
    updateTransaction: (state, action: PayloadAction<Transaction>) => {
      const index = state.transactions.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.transactions[index] = action.payload;
        state.filteredTransactions = state.transactions;
      }
    },
    deleteTransaction: (state, action: PayloadAction<string>) => {
      state.transactions = state.transactions.filter(t => t.id !== action.payload);
      state.filteredTransactions = state.transactions;
    },
    setFilterType: (state, action: PayloadAction<string>) => {
      state.filterType = action.payload;
      state.filteredTransactions = applyFilters(state);
    },
    setFilterDateRange: (state, action: PayloadAction<{ from: number | null; to: number | null }>) => {
      state.filterDateFrom = action.payload.from;
      state.filterDateTo = action.payload.to;
      state.filteredTransactions = applyFilters(state);
    },
    setFilterAmountRange: (state, action: PayloadAction<{ min: number | null; max: number | null }>) => {
      state.filterAmountMin = action.payload.min;
      state.filterAmountMax = action.payload.max;
      state.filteredTransactions = applyFilters(state);
    },
    clearFilters: (state) => {
      state.filterType = 'All';
      state.filterDateFrom = null;
      state.filterDateTo = null;
      state.filterAmountMin = null;
      state.filterAmountMax = null;
      state.filteredTransactions = state.transactions;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

const applyFilters = (state: TransactionState): Transaction[] => {
  let filtered = state.transactions;

  if (state.filterType !== 'All') {
    filtered = filtered.filter(t => t.type === state.filterType);
  }

  if (state.filterDateFrom) {
    filtered = filtered.filter(t => t.timestamp >= state.filterDateFrom!);
  }

  if (state.filterDateTo) {
    filtered = filtered.filter(t => t.timestamp <= state.filterDateTo!);
  }

  if (state.filterAmountMin !== null) {
    filtered = filtered.filter(t => t.amount >= state.filterAmountMin!);
  }

  if (state.filterAmountMax !== null) {
    filtered = filtered.filter(t => t.amount <= state.filterAmountMax!);
  }

  return filtered;
};

export const {
  setTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  setFilterType,
  setFilterDateRange,
  setFilterAmountRange,
  clearFilters,
  setLoading,
  setError,
} = transactionSlice.actions;

export default transactionSlice.reducer;