import dataSyncService from '../dataSyncService';

// Mock the apiService
jest.mock('../apiService', () => ({
  getTransactions: jest.fn(),
  getAvailableAggregators: jest.fn(() => ['pngme', 'okra', 'mono']),
}));

// Mock WatermelonDB
jest.mock('@nozbe/watermelondb', () => ({
  Database: jest.fn(),
}));

jest.mock('@nozbe/watermelondb/adapters/sqlite', () => ({
  SQLiteAdapter: jest.fn(),
}));

describe('DataSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSyncConfig', () => {
    it('should return sync config for valid aggregator', () => {
      const config = dataSyncService.getSyncConfig('pngme');
      expect(config).toBeDefined();
      expect(config?.aggregator).toBe('pngme');
      expect(config?.autoSync).toBe(true);
    });

    it('should return undefined for invalid aggregator', () => {
      const config = dataSyncService.getSyncConfig('invalid');
      expect(config).toBeUndefined();
    });
  });

  describe('getAllSyncConfigs', () => {
    it('should return all sync configurations', () => {
      const configs = dataSyncService.getAllSyncConfigs();
      expect(configs.length).toBeGreaterThan(0);
      expect(configs[0]).toHaveProperty('aggregator');
      expect(configs[0]).toHaveProperty('autoSync');
    });
  });

  describe('updateSyncConfig', () => {
    it('should update sync configuration', () => {
      const originalConfig = dataSyncService.getSyncConfig('pngme');
      dataSyncService.updateSyncConfig('pngme', { syncInterval: 60 });

      const updatedConfig = dataSyncService.getSyncConfig('pngme');
      expect(updatedConfig?.syncInterval).toBe(60);
    });
  });

  describe('Sync Status', () => {
    it('should return sync status for valid config', () => {
      const status = dataSyncService.getSyncStatus('pngme');
      expect(status).toHaveProperty('config');
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('lastSync');
    });

    it('should handle invalid config gracefully', () => {
      const status = dataSyncService.getSyncStatus('invalid');
      expect(status.config).toBeUndefined();
    });
  });

  describe('Sync Operations', () => {
    beforeEach(() => {
      // Mock successful API response
      const mockApiService = require('../apiService');
      mockApiService.getTransactions.mockResolvedValue({
        success: true,
        data: [
          {
            id: 'txn_001',
            amount: 100,
            type: 'credit',
            description: 'Test transaction',
            date: new Date().toISOString(),
          },
        ],
      });
    });

    it('should handle sync in progress', async () => {
      // Mock sync already in progress
      jest.spyOn(dataSyncService, 'isSyncInProgress').mockReturnValue(true);

      const result = await dataSyncService.syncNow('pngme');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Sync already in progress');
    });

    it('should handle invalid config', async () => {
      const result = await dataSyncService.syncNow('invalid');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('not found');
    });

    it('should handle API failure', async () => {
      const mockApiService = require('../apiService');
      mockApiService.getTransactions.mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      const result = await dataSyncService.syncNow('pngme');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('API Error');
    });
  });

  describe('Auto Sync', () => {
    it('should start auto sync for valid config', () => {
      dataSyncService.startAutoSync('pngme');
      const status = dataSyncService.getSyncStatus('pngme');
      expect(status.isRunning).toBe(true);
    });

    it('should stop auto sync', () => {
      dataSyncService.startAutoSync('pngme');
      dataSyncService.stopAutoSync('pngme');

      const status = dataSyncService.getSyncStatus('pngme');
      expect(status.isRunning).toBe(false);
    });

    it('should handle start auto sync for invalid config', () => {
      // Should not throw error
      expect(() => dataSyncService.startAutoSync('invalid')).not.toThrow();
    });

    it('should handle stop auto sync for invalid config', () => {
      // Should not throw error
      expect(() => dataSyncService.stopAutoSync('invalid')).not.toThrow();
    });
  });

  describe('Bulk Operations', () => {
    it('should sync all configurations', async () => {
      const results = await dataSyncService.syncAll();

      expect(results).toHaveProperty('pngme');
      expect(results).toHaveProperty('okra');
      expect(results).toHaveProperty('mono');

      Object.values(results).forEach(result => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('syncedTransactions');
        expect(result).toHaveProperty('errors');
      });
    });

    it('should start all auto sync', () => {
      dataSyncService.startAllAutoSync();

      const configs = dataSyncService.getAllSyncConfigs();
      configs.forEach(config => {
        const status = dataSyncService.getSyncStatus(config.aggregator);
        expect(status.isRunning).toBe(true);
      });
    });

    it('should stop all auto sync', () => {
      dataSyncService.startAllAutoSync();
      dataSyncService.stopAllAutoSync();

      const configs = dataSyncService.getAllSyncConfigs();
      configs.forEach(config => {
        const status = dataSyncService.getSyncStatus(config.aggregator);
        expect(status.isRunning).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transaction data', async () => {
      const mockApiService = require('../apiService');
      mockApiService.getTransactions.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await dataSyncService.syncNow('pngme');

      expect(result.success).toBe(true);
      expect(result.syncedTransactions).toBe(0);
    });

    it('should handle malformed transaction data', async () => {
      const mockApiService = require('../apiService');
      mockApiService.getTransactions.mockResolvedValue({
        success: true,
        data: [
          {
            id: null, // Invalid ID
            amount: 'invalid', // Invalid amount
            type: 'credit',
            description: 'Test',
            date: 'invalid-date',
          },
        ],
      });

      const result = await dataSyncService.syncNow('pngme');

      // Should handle gracefully without crashing
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('errors');
    });

    it('should handle network timeouts', async () => {
      const mockApiService = require('../apiService');
      mockApiService.getTransactions.mockRejectedValue(new Error('Network timeout'));

      const result = await dataSyncService.syncNow('pngme');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Network timeout');
    });
  });
});