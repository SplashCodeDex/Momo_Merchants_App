import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { database } from '../database';
import { TransactionModel } from '../database/models/Transaction';
import { Q } from '@nozbe/watermelondb';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, startWith, debounceTime } from 'rxjs/operators';

export interface BalanceState {
  currentBalance: number;
  availableBalance: number;
  pendingAmount: number;
  totalTransactions: number;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

export interface BalanceActions {
  refreshBalance: () => Promise<void>;
  getBalanceObservable: () => Observable<BalanceState>;
  updateBalance: (amount: number, type: 'credit' | 'debit') => Promise<void>;
  resetBalance: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

type BalanceStore = BalanceState & BalanceActions;

const initialState: BalanceState = {
  currentBalance: 0,
  availableBalance: 0,
  pendingAmount: 0,
  totalTransactions: 0,
  lastUpdated: null,
  isLoading: false,
  error: null,
};

// Balance calculation service
class BalanceCalculator {
  private balanceSubject = new BehaviorSubject<BalanceState>(initialState);
  private userId: string | null = null;

  // Set current user for balance calculations
  setUserId(userId: string): void {
    this.userId = userId;
    this.refreshBalance();
  }

  // Calculate balance from transactions
  async calculateBalance(userId?: string): Promise<BalanceState> {
    const targetUserId = userId || this.userId;
    if (!targetUserId) {
      return { ...initialState, error: 'No user ID set' };
    }

    try {
      // Get all transactions for user
      const transactions = await database.get<TransactionModel>('transactions')
        .query(
          Q.where('user_id', targetUserId),
          Q.sortBy('created_at', Q.desc)
        )
        .fetch();

      let currentBalance = 0;
      let pendingAmount = 0;
      let totalTransactions = transactions.length;

      // Calculate balances
      for (const transaction of transactions) {
        const amount = transaction.amount;

        if (transaction.syncStatus === 'pending' || transaction.syncStatus === 'error') {
          // Pending transactions don't affect current balance yet
          pendingAmount += transaction.type === 'deposit' ? amount : -amount;
        } else {
          // Synced transactions affect current balance
          currentBalance += transaction.type === 'deposit' ? amount : -amount;
        }
      }

      const availableBalance = currentBalance; // In this simple model, available = current

      const newState: BalanceState = {
        currentBalance,
        availableBalance,
        pendingAmount: Math.abs(pendingAmount),
        totalTransactions,
        lastUpdated: new Date(),
        isLoading: false,
        error: null,
      };

      this.balanceSubject.next(newState);
      return newState;

    } catch (error) {
      const errorState: BalanceState = {
        ...initialState,
        error: error instanceof Error ? error.message : 'Failed to calculate balance',
        lastUpdated: new Date(),
      };

      this.balanceSubject.next(errorState);
      return errorState;
    }
  }

  // Refresh balance
  async refreshBalance(): Promise<void> {
    if (!this.userId) return;

    const currentState = this.balanceSubject.value;
    this.balanceSubject.next({ ...currentState, isLoading: true });

    await this.calculateBalance();
  }

  // Update balance after transaction
  async updateAfterTransaction(amount: number, type: 'credit' | 'debit'): Promise<void> {
    const currentState = this.balanceSubject.value;

    // Optimistic update
    const delta = type === 'credit' ? amount : -amount;
    const newState: BalanceState = {
      ...currentState,
      pendingAmount: currentState.pendingAmount + Math.abs(delta),
      lastUpdated: new Date(),
    };

    this.balanceSubject.next(newState);

    // Recalculate actual balance
    await this.refreshBalance();
  }

  // Get balance observable
  getBalanceObservable(): Observable<BalanceState> {
    return this.balanceSubject.asObservable();
  }

  // Get current balance
  getCurrentBalance(): BalanceState {
    return this.balanceSubject.value;
  }
}

// Create singleton calculator
const balanceCalculator = new BalanceCalculator();

// Create Zustand store
export const useBalanceStore = create<BalanceStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Actions
    refreshBalance: async () => {
      set({ isLoading: true, error: null });
      try {
        const newState = await balanceCalculator.refreshBalance();
        set(newState);
      } catch (error) {
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to refresh balance',
        });
      }
    },

    getBalanceObservable: () => balanceCalculator.getBalanceObservable(),

    updateBalance: async (amount: number, type: 'credit' | 'debit') => {
      await balanceCalculator.updateAfterTransaction(amount, type);
      const newState = balanceCalculator.getCurrentBalance();
      set(newState);
    },

    resetBalance: () => {
      balanceCalculator.setUserId('');
      set(initialState);
    },

    setError: (error: string | null) => {
      set({ error });
    },

    setLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },
  }))
);

// Initialize balance store with user ID
export const initializeBalanceStore = (userId: string): void => {
  balanceCalculator.setUserId(userId);
  // Initial balance calculation will happen automatically
};

// Observable for reactive updates
export const balanceObservable = balanceCalculator.getBalanceObservable();

// Helper hooks for specific balance values
export const useCurrentBalance = () => {
  return useBalanceStore((state) => state.currentBalance);
};

export const useAvailableBalance = () => {
  return useBalanceStore((state) => state.availableBalance);
};

export const usePendingAmount = () => {
  return useBalanceStore((state) => state.pendingAmount);
};

export const useBalanceLoading = () => {
  return useBalanceStore((state) => state.isLoading);
};

export const useBalanceError = () => {
  return useBalanceStore((state) => state.error);
};

// Combined balance info hook
export const useBalanceInfo = () => {
  return useBalanceStore((state) => ({
    currentBalance: state.currentBalance,
    availableBalance: state.availableBalance,
    pendingAmount: state.pendingAmount,
    totalTransactions: state.totalTransactions,
    lastUpdated: state.lastUpdated,
    isLoading: state.isLoading,
    error: state.error,
  }));
};