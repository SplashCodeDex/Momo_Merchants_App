// Data Synchronization Service
// Handles offline-first data sync with backend services

import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { mySchema } from '../models/schema';
import Transaction from '../models/Transaction';
import apiService, { TransactionData } from './apiService';

const adapter = new SQLiteAdapter({
  schema: mySchema,
});

const database = new Database({
  adapter,
  modelClasses: [Transaction],
});

export interface SyncResult {
  success: boolean;
  syncedTransactions: number;
  errors: string[];
  lastSync: string;
}

export interface SyncConfig {
  aggregator: string;
  accountId?: string;
  autoSync: boolean;
  syncInterval: number; // in minutes
  lastSync?: string;
}

class DataSyncService {
  private syncConfigs: Map<string, SyncConfig> = new Map();
  private syncInProgress: boolean = false;
  private syncTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs() {
    // Default sync configurations for each aggregator
    const aggregators = apiService.getAvailableAggregators();

    aggregators.forEach(aggregator => {
      this.syncConfigs.set(aggregator, {
        aggregator,
        autoSync: true,
        syncInterval: 30, // 30 minutes
      });
    });
  }

  // Manual sync trigger
  async syncNow(configId: string): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        syncedTransactions: 0,
        errors: ['Sync already in progress'],
        lastSync: new Date().toISOString(),
      };
    }

    const config = this.syncConfigs.get(configId);
    if (!config) {
      return {
        success: false,
        syncedTransactions: 0,
        errors: [`Sync configuration '${configId}' not found`],
        lastSync: new Date().toISOString(),
      };
    }

    this.syncInProgress = true;
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      console.log(`Starting sync for ${config.aggregator}`);

      // Fetch data from aggregator
      const transactionResponse = await apiService.getTransactions(
        config.aggregator,
        config.accountId
      );

      if (!transactionResponse.success || !transactionResponse.data) {
        errors.push(`Failed to fetch transactions: ${transactionResponse.error}`);
      } else {
        // Sync transactions to local database
        syncedCount = await this.syncTransactionsToLocal(transactionResponse.data);
      }

      // Update last sync timestamp
      config.lastSync = new Date().toISOString();
      this.syncConfigs.set(configId, config);

      console.log(`Sync completed for ${config.aggregator}: ${syncedCount} transactions`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      errors.push(errorMessage);
      console.error('Sync error:', error);
    } finally {
      this.syncInProgress = false;
    }

    return {
      success: errors.length === 0,
      syncedTransactions: syncedCount,
      errors,
      lastSync: new Date().toISOString(),
    };
  }

  private async syncTransactionsToLocal(apiTransactions: TransactionData[]): Promise<number> {
    let syncedCount = 0;

    try {
      await database.write(async () => {
        for (const apiTxn of apiTransactions) {
          // Check if transaction already exists
          const existingTxn = await database
            .get('transactions')
            .query()
            .fetch();

          const exists = existingTxn.some(t => t.id === apiTxn.id);

          if (!exists) {
            // Create new transaction
            await database.get('transactions').create((transaction: any) => {
              transaction._raw.id = apiTxn.id;
              transaction.type = this.mapApiTypeToLocal(apiTxn.type);
              transaction.amount = Math.abs(apiTxn.amount); // Ensure positive amount
              transaction.description = apiTxn.description;
              transaction.timestamp = new Date(apiTxn.date);
              transaction.balance = apiTxn.balance;
            });

            syncedCount++;
          }
        }
      });
    } catch (error) {
      console.error('Error syncing transactions to local DB:', error);
      throw error;
    }

    return syncedCount;
  }

  private mapApiTypeToLocal(apiType: string): 'Cash-In' | 'Cash-Out' | 'Bill Pay' | 'Transfer' {
    switch (apiType.toLowerCase()) {
      case 'credit':
      case 'deposit':
        return 'Cash-In';
      case 'debit':
      case 'withdrawal':
        return 'Cash-Out';
      case 'payment':
        return 'Bill Pay';
      case 'transfer':
        return 'Transfer';
      default:
        return 'Transfer';
    }
  }

  // Auto-sync setup
  startAutoSync(configId: string) {
    const config = this.syncConfigs.get(configId);
    if (!config || !config.autoSync) return;

    // Clear existing timer
    this.stopAutoSync(configId);

    // Set up new timer
    const intervalMs = config.syncInterval * 60 * 1000; // Convert minutes to milliseconds
    const timer = setInterval(() => {
      this.syncNow(configId).catch(error => {
        console.error(`Auto-sync failed for ${configId}:`, error);
      });
    }, intervalMs);

    this.syncTimers.set(configId, timer);
    console.log(`Auto-sync started for ${configId} (every ${config.syncInterval} minutes)`);
  }

  stopAutoSync(configId: string) {
    const timer = this.syncTimers.get(configId);
    if (timer) {
      clearInterval(timer);
      this.syncTimers.delete(configId);
      console.log(`Auto-sync stopped for ${configId}`);
    }
  }

  // Configuration management
  updateSyncConfig(configId: string, updates: Partial<SyncConfig>) {
    const config = this.syncConfigs.get(configId);
    if (config) {
      const updatedConfig = { ...config, ...updates };
      this.syncConfigs.set(configId, updatedConfig);

      // Restart auto-sync if interval changed
      if (updates.syncInterval || updates.autoSync !== undefined) {
        if (updatedConfig.autoSync) {
          this.startAutoSync(configId);
        } else {
          this.stopAutoSync(configId);
        }
      }
    }
  }

  getSyncConfig(configId: string): SyncConfig | undefined {
    return this.syncConfigs.get(configId);
  }

  getAllSyncConfigs(): SyncConfig[] {
    return Array.from(this.syncConfigs.values());
  }

  // Sync status
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  getSyncStatus(configId: string) {
    const config = this.syncConfigs.get(configId);
    return {
      config,
      isRunning: this.syncTimers.has(configId),
      lastSync: config?.lastSync,
      nextSync: config?.lastSync
        ? new Date(new Date(config.lastSync).getTime() + (config.syncInterval * 60 * 1000)).toISOString()
        : null,
    };
  }

  // Bulk operations
  async syncAll(): Promise<{ [key: string]: SyncResult }> {
    const results: { [key: string]: SyncResult } = {};

    for (const [configId] of this.syncConfigs) {
      results[configId] = await this.syncNow(configId);
    }

    return results;
  }

  startAllAutoSync() {
    for (const [configId] of this.syncConfigs) {
      this.startAutoSync(configId);
    }
  }

  stopAllAutoSync() {
    for (const [configId] of this.syncConfigs) {
      this.stopAutoSync(configId);
    }
  }

  // Cleanup
  destroy() {
    this.stopAllAutoSync();
    this.syncConfigs.clear();
  }
}

// Export singleton instance
export const dataSyncService = new DataSyncService();
export default dataSyncService;