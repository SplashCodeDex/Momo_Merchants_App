import { database } from '../database';
import { SyncQueueModel } from '../database/models/SyncQueue';
import { Q } from '@nozbe/watermelondb';
import { SyncOperation } from '../types/transactions';

export interface QueueItem {
  id: string;
  operation: SyncOperation;
  tableName: string;
  recordId: string;
  data: any;
  priority: number;
  createdAt: Date;
  retryCount: number;
  lastAttempt?: Date;
  errorMessage?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  batchId?: string;
}

export class SyncQueueService {
  private get collection() {
    return database.get<SyncQueueModel>('sync_queue');
  }

  // Add operation to sync queue
  async addToQueue(
    operation: SyncOperation,
    tableName: string,
    recordId: string,
    data: any,
    priority: number = 1,
    batchId?: string
  ): Promise<SyncQueueModel> {
    return database.write(async () => {
      const queueItem = await this.collection.create((record) => {
        record.operation = operation;
        record.tableName = tableName;
        record.recordId = recordId;
        record.data = JSON.stringify(data);
        record.priority = priority;
        record.status = 'pending';
        record.batchId = batchId;
      });

      return queueItem;
    });
  }

  // Get pending operations ordered by priority and creation time
  async getPendingOperations(limit: number = 50): Promise<SyncQueueModel[]> {
    return this.collection
      .query(
        Q.where('status', 'pending'),
        Q.sortBy('priority', Q.desc),
        Q.sortBy('created_at', Q.asc)
      )
      .fetch(limit);
  }

  // Get operations by batch ID
  async getOperationsByBatch(batchId: string): Promise<SyncQueueModel[]> {
    return this.collection
      .query(
        Q.where('batch_id', batchId),
        Q.sortBy('created_at', Q.asc)
      )
      .fetch();
  }

  // Mark operation as processing
  async markAsProcessing(id: string): Promise<void> {
    return database.write(async () => {
      const operation = await this.collection.find(id);
      await operation.markAsProcessing();
    });
  }

  // Mark operation as completed
  async markAsCompleted(id: string): Promise<void> {
    return database.write(async () => {
      const operation = await this.collection.find(id);
      await operation.markAsCompleted();
    });
  }

  // Mark operation as failed with retry logic
  async markAsFailed(id: string, error: string): Promise<boolean> {
    return database.write(async () => {
      const operation = await this.collection.find(id);
      await operation.markAsFailed(error);

      // Return true if operation can be retried
      return operation.canRetry;
    });
  }

  // Reset failed operations for retry
  async resetFailedOperations(): Promise<SyncQueueModel[]> {
    return database.write(async () => {
      const failedOperations = await this.collection
        .query(
          Q.where('status', 'failed'),
          Q.where('retry_count', Q.lt(3)) // Less than max retries
        )
        .fetch();

      const resetPromises = failedOperations.map(async (operation) => {
        await operation.resetForRetry();
        return operation;
      });

      return Promise.all(resetPromises);
    });
  }

  // Clean up old completed operations
  async cleanupCompletedOperations(olderThanDays: number = 7): Promise<number> {
    return database.write(async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const oldOperations = await this.collection
        .query(
          Q.where('status', 'completed'),
          Q.where('created_at', Q.lt(cutoffDate.getTime()))
        )
        .fetch();

      const deletePromises = oldOperations.map(operation =>
        operation.destroyPermanently()
      );

      await Promise.all(deletePromises);
      return oldOperations.length;
    });
  }

  // Get queue statistics
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    const [pending, processing, completed, failed] = await Promise.all([
      this.collection.query(Q.where('status', 'pending')).fetchCount(),
      this.collection.query(Q.where('status', 'processing')).fetchCount(),
      this.collection.query(Q.where('status', 'completed')).fetchCount(),
      this.collection.query(Q.where('status', 'failed')).fetchCount(),
    ]);

    return {
      pending,
      processing,
      completed,
      failed,
      total: pending + processing + completed + failed,
    };
  }

  // Batch operations for efficiency
  async addBatchToQueue(
    operations: Array<{
      operation: SyncOperation;
      tableName: string;
      recordId: string;
      data: any;
      priority?: number;
    }>,
    batchId?: string
  ): Promise<SyncQueueModel[]> {
    return database.write(async () => {
      const batchPromises = operations.map(({ operation, tableName, recordId, data, priority = 1 }) =>
        this.collection.create((record) => {
          record.operation = operation;
          record.tableName = tableName;
          record.recordId = recordId;
          record.data = JSON.stringify(data);
          record.priority = priority;
          record.status = 'pending';
          record.batchId = batchId;
        })
      );

      return Promise.all(batchPromises);
    });
  }

  // Process operations in batch
  async processBatch(
    operations: SyncQueueModel[],
    processor: (operation: SyncQueueModel) => Promise<void>
  ): Promise<{
    successful: SyncQueueModel[];
    failed: Array<{ operation: SyncQueueModel; error: string }>;
  }> {
    const results = {
      successful: [] as SyncQueueModel[],
      failed: [] as Array<{ operation: SyncQueueModel; error: string }>,
    };

    for (const operation of operations) {
      try {
        await processor(operation);
        results.successful.push(operation);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ operation, error: errorMessage });
      }
    }

    return results;
  }

  // Get operations by table name for selective sync
  async getOperationsByTable(tableName: string, status: string = 'pending'): Promise<SyncQueueModel[]> {
    return this.collection
      .query(
        Q.where('table_name', tableName),
        Q.where('status', status),
        Q.sortBy('created_at', Q.asc)
      )
      .fetch();
  }

  // Clear all operations (for testing or reset)
  async clearAllOperations(): Promise<void> {
    return database.write(async () => {
      const allOperations = await this.collection.query().fetch();
      const deletePromises = allOperations.map(operation =>
        operation.destroyPermanently()
      );
      await Promise.all(deletePromises);
    });
  }

  // Get operation by record ID
  async getOperationByRecordId(recordId: string): Promise<SyncQueueModel | null> {
    try {
      const operations = await this.collection
        .query(Q.where('record_id', recordId))
        .fetch();
      return operations[0] || null;
    } catch {
      return null;
    }
  }

  // Update operation priority
  async updatePriority(id: string, priority: number): Promise<void> {
    return database.write(async () => {
      const operation = await this.collection.find(id);
      await operation.update((record) => {
        record.priority = priority;
      });
    });
  }

  // Get high priority operations
  async getHighPriorityOperations(): Promise<SyncQueueModel[]> {
    return this.collection
      .query(
        Q.where('status', 'pending'),
        Q.where('priority', Q.gte(5)),
        Q.sortBy('priority', Q.desc),
        Q.sortBy('created_at', Q.asc)
      )
      .fetch();
  }
}

export const syncQueueService = new SyncQueueService();