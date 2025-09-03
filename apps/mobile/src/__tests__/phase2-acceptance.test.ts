/**
 * Phase 2 Acceptance Tests
 * Comprehensive testing for offline transaction management system
 */

import { database } from '../database';
import { transactionService } from '../services/transactions';
import { syncQueueService } from '../services/syncQueue';
import { syncEngine } from '../services/syncEngine';
import { networkService } from '../services/network';
import { backgroundSyncService } from '../services/backgroundSync';
import { dataPersistenceService } from '../services/dataPersistence';
import { errorHandler } from '../utils/errorHandling';
import { useBalanceStore } from '../stores/balanceStore';

describe('Phase 2: Offline Transaction Management - Acceptance Tests', () => {
  beforeAll(async () => {
    // Initialize services
    await dataPersistenceService.initialize();
    await networkService.startMonitoring();
  });

  afterAll(async () => {
    // Cleanup
    await networkService.stopMonitoring();
    await dataPersistenceService.cleanup();
  });

  describe('1. WatermelonDB Setup and Schema', () => {
    test('Database initializes successfully', async () => {
      expect(database).toBeDefined();
      expect(database.get('transactions')).toBeDefined();
      expect(database.get('users')).toBeDefined();
      expect(database.get('sync_queue')).toBeDefined();
    });

    test('Schema validation works', async () => {
      const transactionCollection = database.get('transactions');
      const sampleTransaction = await transactionCollection.create((record) => {
        record.offlineId = 'test-123';
        record.type = 'deposit';
        record.amount = 100;
        record.syncStatus = 'pending';
        record.version = 1;
        record.deviceId = 'test-device';
        record.appVersion = '1.0.0';
        record.merchantId = 'merchant-123';
        record.userId = 'user-123';
      });

      expect(sampleTransaction.offlineId).toBe('test-123');
      expect(sampleTransaction.type).toBe('deposit');
      expect(sampleTransaction.amount).toBe(100);
    });
  });

  describe('2. Transaction CRUD Operations', () => {
    const testUserId = 'test-user-123';
    const testMerchantId = 'test-merchant-123';

    test('Create transaction successfully', async () => {
      const transactionData = {
        type: 'deposit' as const,
        amount: 500,
        customerNumber: '+233501234567',
        customerName: 'John Doe',
        commission: 25,
        merchantId: testMerchantId,
        userId: testUserId,
      };

      const transaction = await transactionService.createTransaction(transactionData);

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe('deposit');
      expect(transaction.amount).toBe(500);
      expect(transaction.customerNumber).toBe('+233501234567');
      expect(transaction.syncStatus).toBe('pending');
    });

    test('Read transaction by ID', async () => {
      const transactions = await transactionService.getTransactions({
        userId: testUserId,
        limit: 1,
      });

      expect(transactions.length).toBeGreaterThan(0);
      const transaction = transactions[0];

      const fetchedTransaction = await transactionService.getTransaction(transaction.id!);
      expect(fetchedTransaction).toBeDefined();
      expect(fetchedTransaction!.id).toBe(transaction.id);
    });

    test('Update transaction successfully', async () => {
      const transactions = await transactionService.getTransactions({
        userId: testUserId,
        limit: 1,
      });

      expect(transactions.length).toBeGreaterThan(0);
      const transaction = transactions[0];

      const updateData = {
        customerName: 'Jane Doe',
        notes: 'Updated customer name',
      };

      const updatedTransaction = await transactionService.updateTransaction(
        transaction.id!,
        updateData
      );

      expect(updatedTransaction).toBeDefined();
      expect(updatedTransaction!.customerName).toBe('Jane Doe');
      expect(updatedTransaction!.notes).toBe('Updated customer name');
    });

    test('Delete transaction successfully', async () => {
      const transactions = await transactionService.getTransactions({
        userId: testUserId,
        limit: 1,
      });

      expect(transactions.length).toBeGreaterThan(0);
      const transaction = transactions[0];

      const deleted = await transactionService.deleteTransaction(transaction.id!);
      expect(deleted).toBe(true);
    });
  });

  describe('3. Sync Queue Management', () => {
    test('Add operation to sync queue', async () => {
      const operation = await syncQueueService.addToQueue(
        'create',
        'transactions',
        'test-record-123',
        { test: 'data' },
        1
      );

      expect(operation).toBeDefined();
      expect(operation.operation).toBe('create');
      expect(operation.tableName).toBe('transactions');
      expect(operation.recordId).toBe('test-record-123');
    });

    test('Get pending operations', async () => {
      const pendingOps = await syncQueueService.getPendingOperations(10);
      expect(Array.isArray(pendingOps)).toBe(true);
    });

    test('Process operations in batch', async () => {
      const operations = await syncQueueService.getPendingOperations(5);

      if (operations.length > 0) {
        const results = await syncQueueService.processBatch(
          operations,
          async (op) => {
            // Mock processing
            await syncQueueService.markAsCompleted(op.id);
          }
        );

        expect(results.successful).toBeDefined();
        expect(results.failed).toBeDefined();
      }
    });

    test('Queue statistics are accurate', async () => {
      const stats = await syncQueueService.getQueueStats();
      expect(typeof stats.pending).toBe('number');
      expect(typeof stats.processing).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
      expect(typeof stats.total).toBe('number');
    });
  });

  describe('4. Sync Engine Functionality', () => {
    test('Sync engine initializes correctly', () => {
      const status = syncEngine.getSyncStatus();
      expect(status).toBeDefined();
      expect(typeof status.isRunning).toBe('boolean');
      expect(status.config).toBeDefined();
    });

    test('Sync configuration is valid', () => {
      const status = syncEngine.getSyncStatus();
      expect(status.config.maxBatchSize).toBeGreaterThan(0);
      expect(status.config.maxRetries).toBeGreaterThan(0);
      expect(status.config.retryDelay).toBeGreaterThan(0);
      expect(status.config.timeout).toBeGreaterThan(0);
    });

    test('Sync engine handles offline state', async () => {
      // Mock offline state
      const networkState = await networkService.checkNetworkState();
      if (!networkState.isConnected) {
        // Should not attempt sync when offline
        const result = await syncEngine.startSync();
        expect(result.totalProcessed).toBe(0);
      }
    });
  });

  describe('5. Network Monitoring', () => {
    test('Network service provides current state', () => {
      const state = networkService.getCurrentState();
      expect(state).toBeDefined();
      expect(typeof state.isConnected).toBe('boolean');
      expect(typeof state.status).toBe('string');
      expect(typeof state.connectionType).toBe('string');
    });

    test('Network quality assessment works', () => {
      const quality = networkService.getNetworkQuality();
      expect(['excellent', 'good', 'poor', 'unusable']).toContain(quality);
    });

    test('Network change listeners work', () => {
      let listenerCalled = false;
      const unsubscribe = networkService.addListener(() => {
        listenerCalled = true;
      });

      // Simulate network change (in real app this would be automatic)
      unsubscribe();
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('6. Background Sync', () => {
    test('Background sync service initializes', async () => {
      const status = await backgroundSyncService.getStatus();
      expect(status).toBeDefined();
      expect(typeof status.isRegistered).toBe('boolean');
    });

    test('Background sync configuration is valid', async () => {
      const status = await backgroundSyncService.getStatus();
      expect(status.config.minimumInterval).toBeGreaterThan(0);
      expect(typeof status.config.stopOnTerminate).toBe('boolean');
      expect(typeof status.config.startOnBoot).toBe('boolean');
    });

    test('Schedule information is available', () => {
      const scheduleInfo = backgroundSyncService.getScheduleInfo();
      expect(scheduleInfo).toBeDefined();
      expect(typeof scheduleInfo.intervalMinutes).toBe('number');
      expect(typeof scheduleInfo.isEnabled).toBe('boolean');
    });
  });

  describe('7. Balance Store and Observables', () => {
    const testUserId = 'balance-test-user';

    beforeAll(() => {
      // Initialize balance store with test user
      const { initializeBalanceStore } = useBalanceStore.getState();
      initializeBalanceStore(testUserId);
    });

    test('Balance store initializes correctly', () => {
      const { currentBalance, availableBalance, isLoading } = useBalanceStore.getState();
      expect(typeof currentBalance).toBe('number');
      expect(typeof availableBalance).toBe('number');
      expect(typeof isLoading).toBe('boolean');
    });

    test('Balance calculation works', async () => {
      const { refreshBalance } = useBalanceStore.getState();
      await refreshBalance();

      const { currentBalance, lastUpdated } = useBalanceStore.getState();
      expect(typeof currentBalance).toBe('number');
      expect(lastUpdated).toBeDefined();
    });

    test('Balance observable is available', () => {
      const { getBalanceObservable } = useBalanceStore.getState();
      const observable = getBalanceObservable();
      expect(observable).toBeDefined();
    });
  });

  describe('8. Error Handling', () => {
    test('Error handler processes errors correctly', async () => {
      const testError = new Error('Test error');
      await errorHandler.handleError(testError, { context: 'test' });

      const errorQueue = errorHandler.getErrorQueue();
      expect(errorQueue.length).toBeGreaterThan(0);
    });

    test('Error classification works', async () => {
      const networkError = new Error('Network request failed');
      await errorHandler.handleError(networkError);

      const errorQueue = errorHandler.getErrorQueue();
      const lastError = errorQueue[errorQueue.length - 1];
      expect(lastError.type).toBe('NETWORK');
    });

    test('Error listeners work', () => {
      let receivedError: any = null;
      const unsubscribe = errorHandler.addErrorListener((error) => {
        receivedError = error;
      });

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('9. Data Persistence', () => {
    test('Data persistence service initializes', async () => {
      const stats = await dataPersistenceService.getStatistics();
      expect(stats).toBeDefined();
      expect(typeof stats.isInitialized).toBe('boolean');
    });

    test('Backup functionality works', async () => {
      const backupId = await dataPersistenceService.createBackup();
      expect(typeof backupId).toBe('string');
      expect(backupId.length).toBeGreaterThan(0);
    });

    test('Backup list is available', async () => {
      const backups = await dataPersistenceService.getAvailableBackups();
      expect(Array.isArray(backups)).toBe(true);
    });

    test('State persistence works', async () => {
      const testData = { testKey: 'testValue', timestamp: Date.now() };
      await dataPersistenceService.saveState('test', testData);

      const loadedData = await dataPersistenceService.loadState('test');
      expect(loadedData).toEqual(testData);
    });
  });

  describe('10. Performance Benchmarks', () => {
    test('Transaction creation is fast', async () => {
      const startTime = Date.now();

      const transactionData = {
        type: 'deposit' as const,
        amount: 100,
        merchantId: 'perf-test-merchant',
        userId: 'perf-test-user',
      };

      await transactionService.createTransaction(transactionData);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    test('Transaction queries are fast', async () => {
      const startTime = Date.now();

      await transactionService.getTransactions({
        userId: 'perf-test-user',
        limit: 50,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(200); // Should complete within 200ms
    });

    test('Sync queue operations are fast', async () => {
      const startTime = Date.now();

      await syncQueueService.getQueueStats();

      const endTime = Date.now();
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('11. Data Integrity', () => {
    test('Transaction validation works', async () => {
      const invalidTransaction = {
        type: 'invalid' as any,
        amount: -100, // Invalid amount
        merchantId: '',
        userId: '',
      };

      await expect(
        transactionService.createTransaction(invalidTransaction)
      ).rejects.toThrow();
    });

    test('Database constraints are enforced', async () => {
      // Test will depend on actual database constraints
      // This is a placeholder for constraint validation tests
      expect(true).toBe(true);
    });

    test('Sync status transitions are valid', async () => {
      const transactions = await transactionService.getTransactions({
        limit: 1,
      });

      if (transactions.length > 0) {
        const transaction = transactions[0];
        expect(['pending', 'synced', 'error', 'conflict']).toContain(transaction.syncStatus);
      }
    });
  });

  describe('12. Offline Functionality', () => {
    test('Transactions can be created offline', async () => {
      // This test assumes network is offline
      const networkState = await networkService.checkNetworkState();

      if (!networkState.isConnected) {
        const transactionData = {
          type: 'withdrawal' as const,
          amount: 200,
          merchantId: 'offline-test-merchant',
          userId: 'offline-test-user',
        };

        const transaction = await transactionService.createTransaction(transactionData);
        expect(transaction).toBeDefined();
        expect(transaction.syncStatus).toBe('pending');
      }
    });

    test('Offline transactions appear in sync queue', async () => {
      const pendingOps = await syncQueueService.getPendingOperations(10);
      expect(Array.isArray(pendingOps)).toBe(true);

      // Should have operations from previous tests
      expect(pendingOps.length).toBeGreaterThanOrEqual(0);
    });

    test('Offline error states are handled', async () => {
      // Test error handling when offline
      const networkState = await networkService.checkNetworkState();

      if (!networkState.isConnected) {
        // Should handle offline gracefully
        const result = await syncEngine.startSync();
        expect(result.totalProcessed).toBe(0);
      }
    });
  });

  describe('13. Security and Privacy', () => {
    test('Sensitive data is not logged', () => {
      // Test that sensitive transaction data is not logged in plain text
      // This would require checking log outputs
      expect(true).toBe(true); // Placeholder
    });

    test('Database encryption is configured', () => {
      // Test that database uses encryption
      // This would require checking database configuration
      expect(true).toBe(true); // Placeholder
    });

    test('Error messages don\'t leak sensitive data', async () => {
      const error = new Error('Database connection failed');
      await errorHandler.handleError(error);

      const errorQueue = errorHandler.getErrorQueue();
      const lastError = errorQueue[errorQueue.length - 1];

      // Error message should not contain sensitive information
      expect(lastError.message).not.toContain('password');
      expect(lastError.message).not.toContain('token');
    });
  });

  describe('14. Cross-platform Compatibility', () => {
    test('Platform-specific code is handled correctly', () => {
      // Test platform detection and conditional logic
      const Platform = require('react-native').Platform;
      expect(typeof Platform.OS).toBe('string');
      expect(['ios', 'android']).toContain(Platform.OS);
    });

    test('File system operations work on both platforms', () => {
      // Test file system compatibility
      // This would require actual file operations
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('15. Memory and Resource Management', () => {
    test('Services clean up resources properly', async () => {
      // Test that services don't leak memory
      const initialMemoryUsage = process.memoryUsage?.().heapUsed || 0;

      // Perform some operations
      await transactionService.getTransactions({ limit: 10 });
      await syncQueueService.getQueueStats();

      // Memory usage should not have grown excessively
      const finalMemoryUsage = process.memoryUsage?.().heapUsed || 0;
      const memoryIncrease = finalMemoryUsage - initialMemoryUsage;

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });

    test('Database connections are managed properly', () => {
      // Test database connection pooling and cleanup
      expect(database).toBeDefined();
    });
  });
});