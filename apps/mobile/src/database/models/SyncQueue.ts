import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncStatus = 'pending' | 'processing' | 'completed' | 'failed';

export class SyncQueueModel extends Model {
  static table = 'sync_queue';

  @field('operation') operation!: SyncOperation;
  @field('table_name') tableName!: string;
  @field('record_id') recordId!: string;
  @field('data') data!: string; // JSON string
  @field('priority') priority!: number;
  @readonly @date('created_at') createdAt!: Date;
  @field('retry_count') retryCount?: number;
  @field('last_attempt') lastAttempt?: number;
  @field('error_message') errorMessage?: string;
  @field('status') status!: SyncStatus;
  @field('batch_id') batchId?: string;

  // Computed properties
  get isPending(): boolean {
    return this.status === 'pending';
  }

  get isProcessing(): boolean {
    return this.status === 'processing';
  }

  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  get hasFailed(): boolean {
    return this.status === 'failed';
  }

  get canRetry(): boolean {
    return (this.retryCount || 0) < 3; // Max 3 retries
  }

  get parsedData(): any {
    try {
      return JSON.parse(this.data);
    } catch {
      return null;
    }
  }

  // Helper methods
  async markAsProcessing(): Promise<void> {
    await this.update(record => {
      record.status = 'processing';
      record.lastAttempt = Date.now();
    });
  }

  async markAsCompleted(): Promise<void> {
    await this.update(record => {
      record.status = 'completed';
      record.errorMessage = undefined;
    });
  }

  async markAsFailed(error: string): Promise<void> {
    await this.update(record => {
      record.status = 'failed';
      record.errorMessage = error;
      record.retryCount = (record.retryCount || 0) + 1;
      record.lastAttempt = Date.now();
    });
  }

  async resetForRetry(): Promise<void> {
    await this.update(record => {
      record.status = 'pending';
      record.errorMessage = undefined;
      record.lastAttempt = Date.now();
    });
  }

  // Validation
  validate(): boolean {
    return (
      this.operation &&
      this.tableName &&
      this.recordId &&
      this.data &&
      this.priority >= 0 &&
      this.status
    );
  }
}