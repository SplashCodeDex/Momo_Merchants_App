import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json, relation } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export class TransactionModel extends Model {
  static table = 'transactions';

  static associations: Associations = {
    merchants: { type: 'belongs_to', key: 'merchant_id' },
    users: { type: 'belongs_to', key: 'user_id' },
  };

  @field('offline_id') offlineId!: string;
  @field('server_id') serverId?: string;
  @field('type') type!: string;
  @field('amount') amount!: number;
  @field('customer_number') customerNumber?: string;
  @field('customer_name') customerName?: string;
  @field('commission') commission?: number;
  @field('balance_after') balanceAfter?: number;
  @field('notes') notes?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @field('sync_status') syncStatus!: string;
  @field('sync_attempts') syncAttempts?: number;
  @field('last_sync_attempt') lastSyncAttempt?: number;
  @field('sync_error') syncError?: string;
  @field('version') version!: number;
  @field('device_id') deviceId!: string;
  @field('app_version') appVersion!: string;
  @field('merchant_id') merchantId!: string;
  @field('user_id') userId!: string;
  @field('location_lat') locationLat?: number;
  @field('location_lng') locationLng?: number;
  @field('transaction_hash') transactionHash?: string;

  // Relations
  @relation('merchants', 'merchant_id') merchant;
  @relation('users', 'user_id') user;

  // Computed properties
  get isSynced(): boolean {
    return this.syncStatus === 'synced';
  }

  get isPending(): boolean {
    return this.syncStatus === 'pending';
  }

  get hasError(): boolean {
    return this.syncStatus === 'error';
  }

  get hasConflict(): boolean {
    return this.syncStatus === 'conflict';
  }

  // Helper methods
  async markAsSynced(serverId: string): Promise<void> {
    await this.update(record => {
      record.serverId = serverId;
      record.syncStatus = 'synced';
      record.syncAttempts = 0;
      record.lastSyncAttempt = Date.now();
      record.syncError = undefined;
    });
  }

  async markAsError(error: string): Promise<void> {
    await this.update(record => {
      record.syncStatus = 'error';
      record.syncError = error;
      record.lastSyncAttempt = Date.now();
      record.syncAttempts = (record.syncAttempts || 0) + 1;
    });
  }

  async markAsConflict(): Promise<void> {
    await this.update(record => {
      record.syncStatus = 'conflict';
      record.lastSyncAttempt = Date.now();
    });
  }

  async incrementVersion(): Promise<void> {
    await this.update(record => {
      record.version = record.version + 1;
      record.updatedAt = new Date();
    });
  }

  // Validation
  validate(): boolean {
    return (
      this.offlineId &&
      this.type &&
      this.amount > 0 &&
      this.merchantId &&
      this.userId &&
      this.deviceId &&
      this.appVersion
    );
  }
}