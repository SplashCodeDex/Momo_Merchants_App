import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, relation } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export class UserModel extends Model {
  static table = 'users';

  static associations: Associations = {
    merchants: { type: 'has_many', foreignKey: 'user_id' },
    transactions: { type: 'has_many', foreignKey: 'user_id' },
  };

  @field('offline_id') offlineId!: string;
  @field('server_id') serverId?: string;
  @field('phone_number') phoneNumber!: string;
  @field('country_code') countryCode!: string;
  @field('business_name') businessName?: string;
  @field('agent_number') agentNumber?: string;
  @field('email') email?: string;
  @field('kyc_status') kycStatus!: string;
  @field('is_email_verified') isEmailVerified?: boolean;
  @field('is_phone_verified') isPhoneVerified?: boolean;
  @field('last_login_at') lastLoginAt?: number;
  @field('login_count') loginCount?: number;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @field('sync_status') syncStatus!: string;
  @field('version') version!: number;

  // Relations
  @relation('merchants', 'user_id') merchants;
  @relation('transactions', 'user_id') transactions;

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

  get isKycPending(): boolean {
    return this.kycStatus === 'pending';
  }

  get isKycVerified(): boolean {
    return this.kycStatus === 'verified';
  }

  get isKycRejected(): boolean {
    return this.kycStatus === 'rejected';
  }

  get fullPhoneNumber(): string {
    return `+${this.countryCode}${this.phoneNumber}`;
  }

  get displayName(): string {
    return this.businessName || `Agent ${this.agentNumber || this.phoneNumber}`;
  }

  // Helper methods
  async markAsSynced(serverId: string): Promise<void> {
    await this.update(record => {
      record.serverId = serverId;
      record.syncStatus = 'synced';
    });
  }

  async markAsError(): Promise<void> {
    await this.update(record => {
      record.syncStatus = 'error';
    });
  }

  async updateLastLogin(): Promise<void> {
    await this.update(record => {
      record.lastLoginAt = Date.now();
      record.loginCount = (record.loginCount || 0) + 1;
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
      this.phoneNumber &&
      this.countryCode &&
      this.kycStatus
    );
  }
}