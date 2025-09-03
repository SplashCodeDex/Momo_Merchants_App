import { syncQueueService, SyncQueueService } from './syncQueue';
import { transactionService } from './transactions';
import { SyncQueueModel } from '../database/models/SyncQueue';
import NetInfo from '@react-native-community/netinfo';

export interface SyncResult {
  successful: number;
  failed: number;
  conflicts: number;
  totalProcessed: number;
  duration: number;
}

export interface SyncConfig {
  maxBatchSize: number;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  enableConflictResolution: boolean;
}

export class SyncEngine {
  private isRunning = false;
  private config: SyncConfig;
  private abortController?: AbortController;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = {
      maxBatchSize: 50,
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      timeout: 30000, // 30 seconds
      enableConflictResolution: true,
      ...config,
    };
  }

  // Start sync process
  async startSync(): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync is already running');
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    const startTime = Date.now();

    try {
      // Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error('No network connection available');
      }

      let totalSuccessful = 0;
      let totalFailed = 0;
      let totalConflicts = 0;

      // Process high priority operations first
      const highPriorityResult = await this.processHighPriorityOperations();
      totalSuccessful += highPriorityResult.successful;
      totalFailed += highPriorityResult.failed;
      totalConflicts += highPriorityResult.conflicts;

      // Process remaining operations in batches
      const batchResult = await this.processBatchedOperations();
      totalSuccessful += batchResult.successful;
      totalFailed += batchResult.failed;
      totalConflicts += batchResult.conflicts;

      // Clean up old completed operations
      await syncQueueService.cleanupCompletedOperations();

      const duration = Date.now() - startTime;

      return {
        successful: totalSuccessful,
        failed: totalFailed,
        conflicts: totalConflicts,
        totalProcessed: totalSuccessful + totalFailed,
        duration,
      };
    } finally {
      this.isRunning = false;
      this.abortController = undefined;
    }
  }

  // Stop sync process
  stopSync(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isRunning = false;
  }

  // Process high priority operations
  private async processHighPriorityOperations(): Promise<{
    successful: number;
    failed: number;
    conflicts: number;
  }> {
    const highPriorityOps = await syncQueueService.getHighPriorityOperations();
    return this.processOperations(highPriorityOps);
  }

  // Process operations in batches
  private async processBatchedOperations(): Promise<{
    successful: number;
    failed: number;
    conflicts: number;
  }> {
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalConflicts = 0;

    while (!this.abortController?.signal.aborted) {
      const pendingOps = await syncQueueService.getPendingOperations(this.config.maxBatchSize);

      if (pendingOps.length === 0) {
        break; // No more operations to process
      }

      const batchResult = await this.processOperations(pendingOps);
      totalSuccessful += batchResult.successful;
      totalFailed += batchResult.failed;
      totalConflicts += batchResult.conflicts;

      // Small delay between batches to prevent overwhelming the server
      await this.delay(500);
    }

    return { successful: totalSuccessful, failed: totalFailed, conflicts: totalConflicts };
  }

  // Process a batch of operations
  private async processOperations(operations: SyncQueueModel[]): Promise<{
    successful: number;
    failed: number;
    conflicts: number;
  }> {
    let successful = 0;
    let failed = 0;
    let conflicts = 0;

    // Group operations by table for efficient processing
    const operationsByTable = this.groupOperationsByTable(operations);

    // Process each table's operations
    for (const [tableName, tableOps] of Object.entries(operationsByTable)) {
      const tableResult = await this.processTableOperations(tableName, tableOps);
      successful += tableResult.successful;
      failed += tableResult.failed;
      conflicts += tableResult.conflicts;
    }

    return { successful, failed, conflicts };
  }

  // Process operations for a specific table
  private async processTableOperations(
    tableName: string,
    operations: SyncQueueModel[]
  ): Promise<{
    successful: number;
    failed: number;
    conflicts: number;
  }> {
    const results = await syncQueueService.processBatch(
      operations,
      async (operation) => {
        await this.processSingleOperation(operation);
      }
    );

    // Handle failed operations with retry logic
    for (const { operation, error } of results.failed) {
      const canRetry = await syncQueueService.markAsFailed(operation.id, error);
      if (!canRetry) {
        // Max retries reached, mark as permanent failure
        console.error(`Operation ${operation.id} failed permanently:`, error);
      }
    }

    return {
      successful: results.successful.length,
      failed: results.failed.length,
      conflicts: 0, // Will be calculated separately if needed
    };
  }

  // Process a single operation
  private async processSingleOperation(operation: SyncQueueModel): Promise<void> {
    await syncQueueService.markAsProcessing(operation.id);

    try {
      switch (operation.tableName) {
        case 'transactions':
          await this.processTransactionOperation(operation);
          break;
        case 'merchants':
          await this.processMerchantOperation(operation);
          break;
        case 'users':
          await this.processUserOperation(operation);
          break;
        default:
          throw new Error(`Unknown table: ${operation.tableName}`);
      }

      await syncQueueService.markAsCompleted(operation.id);
    } catch (error) {
      if (error instanceof Error && error.message.includes('conflict')) {
        // Handle conflict resolution
        if (this.config.enableConflictResolution) {
          await this.handleConflict(operation, error.message);
        }
      }
      throw error;
    }
  }

  // Process transaction operations
  private async processTransactionOperation(operation: SyncQueueModel): Promise<void> {
    const data = operation.parsedData;
    if (!data) throw new Error('Invalid transaction data');

    switch (operation.operation) {
      case 'create':
        await this.syncCreateTransaction(data);
        break;
      case 'update':
        await this.syncUpdateTransaction(data);
        break;
      case 'delete':
        await this.syncDeleteTransaction(data);
        break;
      default:
        throw new Error(`Unknown operation: ${operation.operation}`);
    }
  }

  // Process merchant operations
  private async processMerchantOperation(operation: SyncQueueModel): Promise<void> {
    const data = operation.parsedData;
    if (!data) throw new Error('Invalid merchant data');

    switch (operation.operation) {
      case 'create':
        await this.syncCreateMerchant(data);
        break;
      case 'update':
        await this.syncUpdateMerchant(data);
        break;
      case 'delete':
        await this.syncDeleteMerchant(data);
        break;
      default:
        throw new Error(`Unknown operation: ${operation.operation}`);
    }
  }

  // Process user operations
  private async processUserOperation(operation: SyncQueueModel): Promise<void> {
    const data = operation.parsedData;
    if (!data) throw new Error('Invalid user data');

    switch (operation.operation) {
      case 'create':
        await this.syncCreateUser(data);
        break;
      case 'update':
        await this.syncUpdateUser(data);
        break;
      case 'delete':
        await this.syncDeleteUser(data);
        break;
      default:
        throw new Error(`Unknown operation: ${operation.operation}`);
    }
  }

  // Sync methods for transactions
  private async syncCreateTransaction(data: any): Promise<void> {
    // In a real implementation, this would call the API
    // For now, simulate API call
    await this.simulateApiCall('/transactions', 'POST', data);
  }

  private async syncUpdateTransaction(data: any): Promise<void> {
    await this.simulateApiCall(`/transactions/${data.offlineId}`, 'PUT', data);
  }

  private async syncDeleteTransaction(data: any): Promise<void> {
    await this.simulateApiCall(`/transactions/${data.offlineId}`, 'DELETE');
  }

  // Sync methods for merchants
  private async syncCreateMerchant(data: any): Promise<void> {
    await this.simulateApiCall('/merchants', 'POST', data);
  }

  private async syncUpdateMerchant(data: any): Promise<void> {
    await this.simulateApiCall(`/merchants/${data.offlineId}`, 'PUT', data);
  }

  private async syncDeleteMerchant(data: any): Promise<void> {
    await this.simulateApiCall(`/merchants/${data.offlineId}`, 'DELETE');
  }

  // Sync methods for users
  private async syncCreateUser(data: any): Promise<void> {
    await this.simulateApiCall('/users', 'POST', data);
  }

  private async syncUpdateUser(data: any): Promise<void> {
    await this.simulateApiCall(`/users/${data.offlineId}`, 'PUT', data);
  }

  private async syncDeleteUser(data: any): Promise<void> {
    await this.simulateApiCall(`/users/${data.offlineId}`, 'DELETE');
  }

  // Handle conflicts using Last-Write-Wins strategy
  private async handleConflict(operation: SyncQueueModel, conflictReason: string): Promise<void> {
    console.warn(`Conflict detected for operation ${operation.id}:`, conflictReason);

    // Mark transaction as conflicted
    if (operation.tableName === 'transactions') {
      await transactionService.markAsConflicted(operation.recordId);
    }

    // In a real implementation, you might:
    // 1. Fetch the server version
    // 2. Compare timestamps
    // 3. Apply LWW resolution
    // 4. Update local data
    // 5. Re-queue if needed
  }

  // Group operations by table for efficient processing
  private groupOperationsByTable(operations: SyncQueueModel[]): Record<string, SyncQueueModel[]> {
    return operations.reduce((groups, operation) => {
      if (!groups[operation.tableName]) {
        groups[operation.tableName] = [];
      }
      groups[operation.tableName].push(operation);
      return groups;
    }, {} as Record<string, SyncQueueModel[]>);
  }

  // Simulate API call (replace with actual API integration)
  private async simulateApiCall(endpoint: string, method: string, data?: any): Promise<void> {
    // Simulate network delay
    await this.delay(Math.random() * 1000 + 500);

    // Simulate occasional failures
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error('Network error');
    }

    // Simulate occasional conflicts
    if (Math.random() < 0.05) { // 5% conflict rate
      throw new Error('Version conflict detected');
    }

    console.log(`API ${method} ${endpoint}`, data ? JSON.stringify(data, null, 2) : '');
  }

  // Utility method for delays
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get sync status
  getSyncStatus(): {
    isRunning: boolean;
    config: SyncConfig;
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
    };
  }

  // Update sync configuration
  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const syncEngine = new SyncEngine();