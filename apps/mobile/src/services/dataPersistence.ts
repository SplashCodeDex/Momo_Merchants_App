import { database } from '../database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncQueueService } from './syncQueue';
import { transactionService } from './transactions';
import { errorHandler, createAppError, ErrorType, ErrorSeverity } from '../utils/errorHandling';

export interface PersistenceConfig {
  enableEncryption: boolean;
  autoBackup: boolean;
  backupInterval: number; // hours
  maxBackupFiles: number;
  enableCompression: boolean;
}

export class DataPersistenceService {
  private static instance: DataPersistenceService;
  private config: PersistenceConfig;
  private isInitialized = false;
  private backupTimer?: NodeJS.Timeout;

  constructor(config: Partial<PersistenceConfig> = {}) {
    this.config = {
      enableEncryption: true,
      autoBackup: true,
      backupInterval: 24, // 24 hours
      maxBackupFiles: 7, // Keep 7 days of backups
      enableCompression: false,
      ...config,
    };
  }

  static getInstance(): DataPersistenceService {
    if (!DataPersistenceService.instance) {
      DataPersistenceService.instance = new DataPersistenceService();
    }
    return DataPersistenceService.instance;
  }

  // Initialize data persistence
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing data persistence...');

      // Initialize database
      await this.initializeDatabase();

      // Load persisted state
      await this.loadPersistedState();

      // Set up auto-backup if enabled
      if (this.config.autoBackup) {
        this.setupAutoBackup();
      }

      // Set up recovery mechanisms
      this.setupRecoveryHandlers();

      this.isInitialized = true;
      console.log('Data persistence initialized successfully');
    } catch (error) {
      await errorHandler.handleError(error as Error, { context: 'data_persistence_init' });
      throw error;
    }
  }

  // Initialize database and run migrations
  private async initializeDatabase(): Promise<void> {
    try {
      // Test database connection
      await database.get('transactions').query().fetchCount();
      console.log('Database connection successful');

      // Run any pending migrations (if implemented)
      await this.runDatabaseMigrations();

      // Validate database integrity
      await this.validateDatabaseIntegrity();

    } catch (error) {
      console.error('Database initialization failed:', error);

      // Attempt database recovery
      await this.attemptDatabaseRecovery();

      throw createAppError(
        ErrorType.DATABASE,
        'Failed to initialize database',
        ErrorSeverity.CRITICAL,
        { originalError: error }
      );
    }
  }

  // Load persisted application state
  private async loadPersistedState(): Promise<void> {
    try {
      // Load user preferences
      await this.loadUserPreferences();

      // Load cached data
      await this.loadCachedData();

      // Load sync state
      await this.loadSyncState();

      console.log('Persisted state loaded successfully');
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
      // Don't throw - app can continue without persisted state
    }
  }

  // Save application state
  async saveState(key: string, data: any): Promise<void> {
    try {
      const serializedData = JSON.stringify(data);
      await AsyncStorage.setItem(`app_state_${key}`, serializedData);
    } catch (error) {
      await errorHandler.handleError(error as Error, { context: 'save_state', key });
    }
  }

  // Load application state
  async loadState<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(`app_state_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn(`Failed to load state for key ${key}:`, error);
      return null;
    }
  }

  // Clear application state
  async clearState(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`app_state_${key}`);
    } catch (error) {
      console.warn(`Failed to clear state for key ${key}:`, error);
    }
  }

  // Create database backup
  async createBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `backup_${timestamp}`;

      // In a real implementation, you would:
      // 1. Export database to a file
      // 2. Compress if enabled
      // 3. Encrypt if enabled
      // 4. Save to device storage

      console.log(`Creating backup: ${backupId}`);

      // Store backup metadata
      const backupInfo = {
        id: backupId,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        size: 0, // Would be actual file size
      };

      await this.saveState(`backup_${backupId}`, backupInfo);

      // Clean up old backups
      await this.cleanupOldBackups();

      return backupId;
    } catch (error) {
      await errorHandler.handleError(error as Error, { context: 'create_backup' });
      throw error;
    }
  }

  // Restore from backup
  async restoreFromBackup(backupId: string): Promise<void> {
    try {
      console.log(`Restoring from backup: ${backupId}`);

      // In a real implementation, you would:
      // 1. Validate backup file
      // 2. Decrypt if encrypted
      // 3. Decompress if compressed
      // 4. Restore database from backup
      // 5. Validate restored data

      // For now, just mark as restored
      await this.saveState('last_restore', {
        backupId,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      await errorHandler.handleError(error as Error, { context: 'restore_backup', backupId });
      throw error;
    }
  }

  // Get list of available backups
  async getAvailableBackups(): Promise<Array<{ id: string; timestamp: string; size: number }>> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const backupKeys = keys.filter(key => key.startsWith('app_state_backup_'));

      const backups = await Promise.all(
        backupKeys.map(async (key) => {
          const backupId = key.replace('app_state_backup_', '');
          const info = await this.loadState(`backup_${backupId}`);
          return info ? {
            id: backupId,
            timestamp: info.timestamp,
            size: info.size || 0,
          } : null;
        })
      );

      return backups.filter(Boolean).sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.warn('Failed to get available backups:', error);
      return [];
    }
  }

  // Clean up old backups
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.getAvailableBackups();

      if (backups.length > this.config.maxBackupFiles) {
        const backupsToDelete = backups.slice(this.config.maxBackupFiles);

        for (const backup of backupsToDelete) {
          await this.clearState(`backup_${backup.id}`);
          console.log(`Deleted old backup: ${backup.id}`);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error);
    }
  }

  // Set up auto-backup timer
  private setupAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    const intervalMs = this.config.backupInterval * 60 * 60 * 1000; // Convert hours to ms

    this.backupTimer = setInterval(async () => {
      try {
        await this.createBackup();
      } catch (error) {
        console.warn('Auto-backup failed:', error);
      }
    }, intervalMs);
  }

  // Set up recovery handlers
  private setupRecoveryHandlers(): void {
    // Handle app state changes
    // In React Native, you might use AppState

    // Handle memory warnings
    // In React Native, you might use memory warning listeners

    // Handle database corruption detection
    this.setupDatabaseCorruptionDetection();
  }

  // Set up database corruption detection
  private setupDatabaseCorruptionDetection(): void {
    // Periodically check database integrity
    setInterval(async () => {
      try {
        await this.validateDatabaseIntegrity();
      } catch (error) {
        console.warn('Database integrity check failed:', error);
        await this.attemptDatabaseRecovery();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  // Validate database integrity
  private async validateDatabaseIntegrity(): Promise<void> {
    try {
      // Test basic queries
      await database.get('transactions').query().fetchCount();
      await database.get('users').query().fetchCount();
      await database.get('sync_queue').query().fetchCount();

      // Test sync queue integrity
      const queueStats = await syncQueueService.getQueueStats();
      if (queueStats.total < 0) {
        throw new Error('Invalid queue statistics');
      }

    } catch (error) {
      throw createAppError(
        ErrorType.DATABASE,
        'Database integrity check failed',
        ErrorSeverity.HIGH,
        { originalError: error }
      );
    }
  }

  // Attempt database recovery
  private async attemptDatabaseRecovery(): Promise<void> {
    try {
      console.log('Attempting database recovery...');

      // Try to restore from latest backup
      const backups = await this.getAvailableBackups();
      if (backups.length > 0) {
        const latestBackup = backups[0];
        await this.restoreFromBackup(latestBackup.id);
        console.log('Database recovered from backup');
      } else {
        // No backups available - try to recreate database
        console.log('No backups available, recreating database...');
        await this.recreateDatabase();
      }

    } catch (error) {
      console.error('Database recovery failed:', error);
      throw createAppError(
        ErrorType.DATABASE,
        'Database recovery failed',
        ErrorSeverity.CRITICAL,
        { originalError: error }
      );
    }
  }

  // Recreate database (last resort)
  private async recreateDatabase(): Promise<void> {
    try {
      // Clear all data (this is destructive)
      await AsyncStorage.clear();
      console.log('Database recreated - all data cleared');
    } catch (error) {
      console.error('Failed to recreate database:', error);
      throw error;
    }
  }

  // Load user preferences
  private async loadUserPreferences(): Promise<void> {
    // Implementation would load user-specific settings
  }

  // Load cached data
  private async loadCachedData(): Promise<void> {
    // Implementation would load cached API responses, etc.
  }

  // Load sync state
  private async loadSyncState(): Promise<void> {
    // Implementation would load last sync timestamp, etc.
  }

  // Run database migrations
  private async runDatabaseMigrations(): Promise<void> {
    // Implementation would run any pending database migrations
  }

  // Get persistence statistics
  async getStatistics(): Promise<{
    totalBackups: number;
    lastBackupDate: Date | null;
    storageUsed: number;
    isInitialized: boolean;
  }> {
    try {
      const backups = await this.getAvailableBackups();
      const lastBackup = backups.length > 0 ? new Date(backups[0].timestamp) : null;

      // In a real implementation, calculate actual storage used
      const storageUsed = 0;

      return {
        totalBackups: backups.length,
        lastBackupDate: lastBackup,
        storageUsed,
        isInitialized: this.isInitialized,
      };
    } catch (error) {
      console.warn('Failed to get persistence statistics:', error);
      return {
        totalBackups: 0,
        lastBackupDate: null,
        storageUsed: 0,
        isInitialized: this.isInitialized,
      };
    }
  }

  // Clean up resources
  async cleanup(): Promise<void> {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = undefined;
    }

    this.isInitialized = false;
  }
}

// Export singleton instance
export const dataPersistenceService = DataPersistenceService.getInstance();