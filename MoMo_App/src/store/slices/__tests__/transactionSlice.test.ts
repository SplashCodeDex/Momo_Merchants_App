import transactionReducer, {
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
  Transaction,
} from '../transactionSlice';

describe('Transaction Slice', () => {
  const initialState = {
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

  const mockTransaction: Transaction = {
    id: 'txn_001',
    type: 'Cash-In',
    amount: 100,
    description: 'Test transaction',
    timestamp: Date.now(),
  };

  describe('setTransactions', () => {
    it('should set transactions and filtered transactions', () => {
      const transactions = [mockTransaction];
      const action = setTransactions(transactions);
      const result = transactionReducer(initialState, action);

      expect(result.transactions).toEqual(transactions);
      expect(result.filteredTransactions).toEqual(transactions);
    });
  });

  describe('addTransaction', () => {
    it('should add transaction to the list', () => {
      const action = addTransaction(mockTransaction);
      const result = transactionReducer(initialState, action);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]).toEqual(mockTransaction);
      expect(result.filteredTransactions).toEqual(result.transactions);
    });

    it('should add transaction at the beginning', () => {
      const existingTransaction: Transaction = {
        id: 'txn_002',
        type: 'Cash-Out',
        amount: 50,
        description: 'Existing transaction',
        timestamp: Date.now() - 1000,
      };

      const stateWithExisting = {
        ...initialState,
        transactions: [existingTransaction],
        filteredTransactions: [existingTransaction],
      };

      const action = addTransaction(mockTransaction);
      const result = transactionReducer(stateWithExisting, action);

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]).toEqual(mockTransaction);
      expect(result.transactions[1]).toEqual(existingTransaction);
    });
  });

  describe('updateTransaction', () => {
    it('should update existing transaction', () => {
      const stateWithTransaction = {
        ...initialState,
        transactions: [mockTransaction],
        filteredTransactions: [mockTransaction],
      };

      const updatedTransaction: Transaction = {
        ...mockTransaction,
        amount: 200,
        description: 'Updated transaction',
      };

      const action = updateTransaction(updatedTransaction);
      const result = transactionReducer(stateWithTransaction, action);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]).toEqual(updatedTransaction);
      expect(result.filteredTransactions).toEqual(result.transactions);
    });

    it('should not update non-existing transaction', () => {
      const stateWithTransaction = {
        ...initialState,
        transactions: [mockTransaction],
        filteredTransactions: [mockTransaction],
      };

      const updatedTransaction: Transaction = {
        ...mockTransaction,
        id: 'non_existing',
        amount: 200,
      };

      const action = updateTransaction(updatedTransaction);
      const result = transactionReducer(stateWithTransaction, action);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]).toEqual(mockTransaction);
    });
  });

  describe('deleteTransaction', () => {
    it('should delete existing transaction', () => {
      const stateWithTransaction = {
        ...initialState,
        transactions: [mockTransaction],
        filteredTransactions: [mockTransaction],
      };

      const action = deleteTransaction(mockTransaction.id);
      const result = transactionReducer(stateWithTransaction, action);

      expect(result.transactions).toHaveLength(0);
      expect(result.filteredTransactions).toHaveLength(0);
    });

    it('should not affect state when deleting non-existing transaction', () => {
      const stateWithTransaction = {
        ...initialState,
        transactions: [mockTransaction],
        filteredTransactions: [mockTransaction],
      };

      const action = deleteTransaction('non_existing');
      const result = transactionReducer(stateWithTransaction, action);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]).toEqual(mockTransaction);
    });
  });

  describe('Filtering', () => {
    const transactions: Transaction[] = [
      {
        id: 'txn_001',
        type: 'Cash-In',
        amount: 100,
        description: 'Cash in transaction',
        timestamp: Date.now(),
      },
      {
        id: 'txn_002',
        type: 'Cash-Out',
        amount: 50,
        description: 'Cash out transaction',
        timestamp: Date.now() - 86400000, // 1 day ago
      },
      {
        id: 'txn_003',
        type: 'Bill Pay',
        amount: 200,
        description: 'Bill payment',
        timestamp: Date.now() - 172800000, // 2 days ago
      },
    ];

    const stateWithTransactions = {
      ...initialState,
      transactions,
      filteredTransactions: transactions,
    };

    describe('setFilterType', () => {
      it('should filter by transaction type', () => {
        const action = setFilterType('Cash-In');
        const result = transactionReducer(stateWithTransactions, action);

        expect(result.filterType).toBe('Cash-In');
        expect(result.filteredTransactions).toHaveLength(1);
        expect(result.filteredTransactions[0].type).toBe('Cash-In');
      });

      it('should show all transactions when filter is "All"', () => {
        const action = setFilterType('All');
        const result = transactionReducer(stateWithTransactions, action);

        expect(result.filterType).toBe('All');
        expect(result.filteredTransactions).toHaveLength(3);
      });
    });

    describe('setFilterDateRange', () => {
      it('should filter by date range', () => {
        const yesterday = Date.now() - 86400000;
        const tomorrow = Date.now() + 86400000;

        const action = setFilterDateRange({ from: yesterday, to: tomorrow });
        const result = transactionReducer(stateWithTransactions, action);

        expect(result.filterDateFrom).toBe(yesterday);
        expect(result.filterDateTo).toBe(tomorrow);
        expect(result.filteredTransactions).toHaveLength(2); // Should exclude 2-day old transaction
      });

      it('should handle null date values', () => {
        const action = setFilterDateRange({ from: null, to: null });
        const result = transactionReducer(stateWithTransactions, action);

        expect(result.filterDateFrom).toBeNull();
        expect(result.filterDateTo).toBeNull();
        expect(result.filteredTransactions).toHaveLength(3);
      });
    });

    describe('setFilterAmountRange', () => {
      it('should filter by amount range', () => {
        const action = setFilterAmountRange({ min: 75, max: 150 });
        const result = transactionReducer(stateWithTransactions, action);

        expect(result.filterAmountMin).toBe(75);
        expect(result.filterAmountMax).toBe(150);
        expect(result.filteredTransactions).toHaveLength(1);
        expect(result.filteredTransactions[0].amount).toBe(100);
      });

      it('should handle null amount values', () => {
        const action = setFilterAmountRange({ min: null, max: null });
        const result = transactionReducer(stateWithTransactions, action);

        expect(result.filterAmountMin).toBeNull();
        expect(result.filterAmountMax).toBeNull();
        expect(result.filteredTransactions).toHaveLength(3);
      });
    });

    describe('clearFilters', () => {
      it('should reset all filters', () => {
        const filteredState = {
          ...stateWithTransactions,
          filterType: 'Cash-In',
          filterDateFrom: Date.now() - 86400000,
          filterDateTo: Date.now() + 86400000,
          filterAmountMin: 50,
          filterAmountMax: 150,
          filteredTransactions: [transactions[0]],
        };

        const action = clearFilters();
        const result = transactionReducer(filteredState, action);

        expect(result.filterType).toBe('All');
        expect(result.filterDateFrom).toBeNull();
        expect(result.filterDateTo).toBeNull();
        expect(result.filterAmountMin).toBeNull();
        expect(result.filterAmountMax).toBeNull();
        expect(result.filteredTransactions).toHaveLength(3);
      });
    });
  });

  describe('Loading and Error States', () => {
    describe('setLoading', () => {
      it('should set loading state', () => {
        const action = setLoading(true);
        const result = transactionReducer(initialState, action);

        expect(result.isLoading).toBe(true);
      });

      it('should unset loading state', () => {
        const loadingState = { ...initialState, isLoading: true };
        const action = setLoading(false);
        const result = transactionReducer(loadingState, action);

        expect(result.isLoading).toBe(false);
      });
    });

    describe('setError', () => {
      it('should set error message', () => {
        const action = setError('Test error');
        const result = transactionReducer(initialState, action);

        expect(result.error).toBe('Test error');
      });

      it('should clear error message', () => {
        const errorState = { ...initialState, error: 'Test error' };
        const action = setError(null);
        const result = transactionReducer(errorState, action);

        expect(result.error).toBeNull();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transaction arrays', () => {
      const action = setTransactions([]);
      const result = transactionReducer(initialState, action);

      expect(result.transactions).toHaveLength(0);
      expect(result.filteredTransactions).toHaveLength(0);
    });

    it('should handle invalid transaction data', () => {
      const invalidTransaction = {
        id: '',
        type: 'Invalid',
        amount: NaN,
        description: '',
        timestamp: NaN,
      } as Transaction;

      const action = addTransaction(invalidTransaction);
      const result = transactionReducer(initialState, action);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]).toEqual(invalidTransaction);
    });

    it('should handle concurrent operations', () => {
      let state = initialState;

      // Add multiple transactions
      state = transactionReducer(state, addTransaction(mockTransaction));
      state = transactionReducer(state, addTransaction({
        ...mockTransaction,
        id: 'txn_002',
        amount: 200,
      }));

      expect(state.transactions).toHaveLength(2);

      // Delete one
      state = transactionReducer(state, deleteTransaction('txn_001'));

      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].id).toBe('txn_002');
    });
  });
});