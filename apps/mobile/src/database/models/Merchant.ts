import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, json, relation } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

export class MerchantModel extends Model {
  static table = 'merchants';

  static associations: Associations = {
    users: { type: 'belongs_to', key: 'user_id' },
    transactions: { type: 'has_many', foreignKey: 'merchant_id' },
  };

  @field('offline_id') offlineId!: string;
  @field('server_id') serverId?: string;
  @field('business_name') businessName!: string;
  @field('business_type') businessType!: string;
  @field('registration_number') registrationNumber?: string;
  @field('tax_id') taxId?: string;
  @field('address_street') addressStreet?: string;
  @field('address_city') addressCity?: string;
  @field('address_region') addressRegion?: string;
  @field('address_country') addressCountry?: string;
  @field('address_postal_code') addressPostalCode?: string;
  @field('contact_phone') contactPhone?: string;
  @field('contact_email') contactEmail?: string;
  @field('contact_website') contactWebsite?: string;
  @field('is_verified') isVerified?: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
  @field('sync_status') syncStatus!: string;
  @field('version') version!: number;
  @field('user_id') userId!: string;

  // Relations
  @relation('users', 'user_id') user;
  @relation('transactions', 'merchant_id') transactions;

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

  get fullAddress(): string {
    const parts = [
      this.addressStreet,
      this.addressCity,
      this.addressRegion,
      this.addressCountry,
      this.addressPostalCode,
    ].filter(Boolean);

    return parts.join(', ');
  }

  get contactInfo(): {
    phone?: string;
    email?: string;
    website?: string;
  } {
    return {
      phone: this.contactPhone,
      email: this.contactEmail,
      website: this.contactWebsite,
    };
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
      this.businessName &&
      this.businessType &&
      this.userId
    );
  }
}