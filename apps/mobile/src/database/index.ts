import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { TransactionModel } from './models/Transaction';
import { MerchantModel } from './models/Merchant';
import { SyncQueueModel } from './models/SyncQueue';
import { UserModel } from './models/User';

// Define all models
const modelClasses = [
  TransactionModel,
  MerchantModel,
  SyncQueueModel,
  UserModel,
];

// Database configuration
const adapter = new SQLiteAdapter({
  schema: schema,
  dbName: 'momo_merchant.db',
  jsi: true, // Enable JSI for better performance
  migrationsEnabled: true,
});

// Create database instance
export const database = new Database({
  adapter,
  modelClasses,
});

// Export types
export type DatabaseType = typeof database;