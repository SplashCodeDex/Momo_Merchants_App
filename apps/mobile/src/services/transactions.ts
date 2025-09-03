import { database } from '../database';
import { TransactionModel } from '../database/models/Transaction';
import { Q } from '@nozbe/watermelondb';
import { v4 as uuidv4 } from 'uuid';

export interface CreateTransactionData {
  type: 'deposit' | 'withdrawal' | 'bill_payment' | 'airtime';
  amount: number;
  customerNumber?: string;
  customerName?: string;
  commission?: number;
  balanceAfter?: number;
  notes?: string;
  merchantId: string;
  userId: string;
  locationLat?: number;
  locationLng?: number;
}

export interface UpdateTransactionData {
  customerNumber?: string;
  customerName?: string;
  commission?: number;
  balanceAfter?: number;
  notes?: string;
  locationLat?: number;
  locationLng?: number;
}

export class TransactionService {
  private get collection() {
    return database.get<TransactionModel>('transactions');
  }

  // Create a new transaction
  async createTransaction(data: CreateTransactionData): Promise<TransactionModel> {
    const offlineId = uuidv4();
    const deviceId = await this.getDeviceId();
    const appVersion = await this.getAppVersion();

    return database.write(async () => {
      const transaction = await this.collection.create((record) => {
        record.offlineId = offlineId;
        record.type = data.type;
        record.amount = data.amount;
        record.customerNumber = data.customerNumber;
        record.customerName = data.customerName;
        record.commission = data.commission;
        record.balanceAfter = data.balanceAfter;
        record.notes = data.notes;
        record.syncStatus = 'pending';
        record.version = 1;
        record.deviceId = deviceId;
        record.appVersion = appVersion;
        record.merchantId = data.merchantId;
        record.userId = data.userId;
        record.locationLat = data.locationLat;
        record.locationLng = data.locationLng;
        record.transactionHash = this.generateTransactionHash(data);
      });

      // Add to sync queue
      await this.addToSyncQueue('create', transaction);

      return transaction;
    });
  }

  // Get transaction by ID
  async getTransaction(id: string): Promise<TransactionModel | null> {
    try {
      const transaction = await this.collection.find(id);
      return transaction;
    } catch {
      return null;
    }
  }

  // Get transaction by offline ID
  async getTransactionByOfflineId(offlineId: string): Promise<TransactionModel | null> {
    try {
      const transactions = await this.collection
        .query(Q.where('offline_id', offlineId))
        .fetch();
      return transactions[0] || null;
    } catch {
      return null;
    }
  }

  // Update transaction
  async updateTransaction(
    id: string,
    data: UpdateTransactionData
  ): Promise<TransactionModel | null> {
    return database.write(async () => {
      try {
        const transaction = await this.collection.find(id);

        await transaction.update((record) => {
          if (data.customerNumber !== undefined) record.customerNumber = data.customerNumber;
          if (data.customerName !== undefined) record.customerName = data.customerName;
          if (data.commission !== undefined) record.commission = data.commission;
          if (data.balanceAfter !== undefined) record.balanceAfter = data.balanceAfter;
          if (data.notes !== undefined) record.notes = data.notes;
          if (data.locationLat !== undefined) record.locationLat = data.locationLat;
          if (data.locationLng !== undefined) record.locationLng = data.locationLng;

          record.version = record.version + 1;
          record.syncStatus = 'pending';
          record.updatedAt = new Date();
        });

        // Add to sync queue
        await this.addToSyncQueue('update', transaction);

        return transaction;
      } catch {
        return null;
      }
    });
  }

  // Delete transaction (soft delete)
  async deleteTransaction(id: string): Promise<boolean> {
    return database.write(async () => {
      try {
        const transaction = await this.collection.find(id);

        // Mark as deleted but keep in database for sync
        await transaction.update((record) => {
          record.syncStatus = 'pending';
          record.version = record.version + 1;
          record.updatedAt = new Date();
        });

        // Add to sync queue as delete operation
        await this.addToSyncQueue('delete', transaction);

        return true;
      } catch {
        return false;
      }
    });
  }

  // Get transactions with filtering and pagination
  async getTransactions(options: {
    userId?: string;
    merchantId?: string;
    type?: string;
    limit?: number;
    offset?: number;
    orderBy?: 'created_at' | 'updated_at' | 'amount';
    orderDirection?: 'asc' | 'desc';
  } = {}): Promise<TransactionModel[]> {
    const {
      userId,
      merchantId,
      type,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
    } = options;

    const queries = [];

    if (userId) {
      queries.push(Q.where('user_id', userId));
    }

    if (merchantId) {
      queries.push(Q.where('merchant_id', merchantId));
    }

    if (type) {
      queries.push(Q.where('type', type));
    }

    // Order by specified field
    const orderQuery = orderDirection === 'desc'
      ? Q.sortBy(orderBy, Q.desc)
      : Q.sortBy(orderBy, Q.asc);

    queries.push(orderQuery);

    return this.collection
      .query(...queries)
      .fetch(offset, limit);
  }

  // Get pending transactions for sync
  async getPendingTransactions(): Promise<TransactionModel[]> {
    return this.collection
      .query(
        Q.where('sync_status', Q.oneOf(['pending', 'error'])),
        Q.sortBy('created_at', Q.asc)
      )
      .fetch();
  }

  // Get transactions with conflicts
  async getConflictedTransactions(): Promise<TransactionModel[]> {
    return this.collection
      .query(Q.where('sync_status', 'conflict'))
      .fetch();
  }

  // Mark transaction as synced
  async markAsSynced(offlineId: string, serverId: string): Promise<void> {
    return database.write(async () => {
      const transaction = await this.getTransactionByOfflineId(offlineId);
      if (transaction) {
        await transaction.markAsSynced(serverId);
      }
    });
  }

  // Mark transaction as conflicted
  async markAsConflicted(offlineId: string): Promise<void> {
    return database.write(async () => {
      const transaction = await this.getTransactionByOfflineId(offlineId);
      if (transaction) {
        await transaction.markAsConflict();
      }
    });
  }

  // Get transaction statistics
  async getTransactionStats(userId: string, merchantId?: string): Promise<{
    totalCount: number;
    totalVolume: number;
    totalCommission: number;
    pendingCount: number;
    syncedCount: number;
    errorCount: number;
  }> {
    const baseQuery = merchantId
      ? [Q.where('user_id', userId), Q.where('merchant_id', merchantId)]
      : [Q.where('user_id', userId)];

    const [allTransactions, pendingTransactions, syncedTransactions, errorTransactions] =
      await Promise.all([
        this.collection.query(...baseQuery).fetch(),
        this.collection.query(...baseQuery, Q.where('sync_status', 'pending')).fetch(),
        this.collection.query(...baseQuery, Q.where('sync_status', 'synced')).fetch(),
        this.collection.query(...baseQuery, Q.where('sync_status', Q.oneOf(['error', 'conflict']))).fetch(),
      ]);

    const totalVolume = allTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalCommission = allTransactions.reduce((sum, t) => sum + (t.commission || 0), 0);

    return {
      totalCount: allTransactions.length,
      totalVolume,
      totalCommission,
      pendingCount: pendingTransactions.length,
      syncedCount: syncedTransactions.length,
      errorCount: errorTransactions.length,
    };
  }

  // Private helper methods
  private async addToSyncQueue(operation: 'create' | 'update' | 'delete', transaction: TransactionModel): Promise<void> {
    const syncQueueCollection = database.get('sync_queue');

    await syncQueueCollection.create((record) => {
      record.operation = operation;
      record.tableName = 'transactions';
      record.recordId = transaction.offlineId;
      record.data = JSON.stringify({
        offlineId: transaction.offlineId,
        serverId: transaction.serverId,
        type: transaction.type,
        amount: transaction.amount,
        customerNumber: transaction.customerNumber,
        customerName: transaction.customerName,
        commission: transaction.commission,
        balanceAfter: transaction.balanceAfter,
        notes: transaction.notes,
        version: transaction.version,
        merchantId: transaction.merchantId,
        userId: transaction.userId,
        locationLat: transaction.locationLat,
        locationLng: transaction.locationLng,
      });
      record.priority = 1; // High priority for transactions
      record.status = 'pending';
    });
  }

  private async getDeviceId(): Promise<string> {
    // In a real app, this would get the actual device ID
    // For now, return a mock device ID
    return 'device-12345';
  }

  private async getAppVersion(): Promise<string> {
    // In a real app, this would get the actual app version
    // For now, return a mock version
    return '1.0.0';
  }

  private generateTransactionHash(data: CreateTransactionData): string {
    const dataString = `${data.type}:${data.amount}:${data.customerNumber || ''}:${Date.now()}`;
    // In a real app, use crypto.createHash
    return dataString; // Simplified for demo
  }
}

export const transactionService = new TransactionService();