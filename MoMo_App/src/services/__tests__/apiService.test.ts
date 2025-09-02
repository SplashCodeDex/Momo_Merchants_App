import apiService from '../apiService';

// Mock fetch for testing
global.fetch = jest.fn();

describe('APIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAvailableAggregators', () => {
    it('should return list of configured aggregators', () => {
      const aggregators = apiService.getAvailableAggregators();
      expect(aggregators).toContain('pngme');
      expect(aggregators).toContain('okra');
      expect(aggregators).toContain('mono');
    });
  });

  describe('getConfig', () => {
    it('should return config for valid aggregator', () => {
      const config = apiService.getConfig('pngme');
      expect(config).toBeDefined();
      expect(config?.name).toBe('Pngme');
      expect(config?.baseUrl).toContain('pngme.com');
    });

    it('should return undefined for invalid aggregator', () => {
      const config = apiService.getConfig('invalid');
      expect(config).toBeUndefined();
    });
  });

  describe('updateConfig', () => {
    it('should update config for existing aggregator', () => {
      const originalConfig = apiService.getConfig('pngme');
      apiService.updateConfig('pngme', { timeout: 60000 });

      const updatedConfig = apiService.getConfig('pngme');
      expect(updatedConfig?.timeout).toBe(60000);
      expect(updatedConfig?.name).toBe(originalConfig?.name);
    });

    it('should not update config for non-existing aggregator', () => {
      apiService.updateConfig('nonexistent', { timeout: 60000 });
      const config = apiService.getConfig('nonexistent');
      expect(config).toBeUndefined();
    });
  });

  describe('API Calls', () => {
    beforeEach(() => {
      // Mock successful fetch response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'mock response' }),
      });
    });

    describe('getTransactions', () => {
      it('should make correct API call for transactions', async () => {
        const result = await apiService.getTransactions('pngme');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/transactions'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': expect.stringContaining('Bearer'),
              'Content-Type': 'application/json',
            }),
          })
        );
      });

      it('should handle API errors gracefully', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        const result = await apiService.getTransactions('pngme');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Network error');
      });
    });

    describe('getAccounts', () => {
      it('should make correct API call for accounts', async () => {
        const result = await apiService.getAccounts('okra');

        expect(result.success).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/accounts'),
          expect.any(Object)
        );
      });
    });

    describe('getBalance', () => {
      it('should make correct API call for balance', async () => {
        const result = await apiService.getBalance('mono', 'acc_123');

        expect(result.success).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/accounts/acc_123/balance'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid aggregator gracefully', async () => {
      const result = await apiService.getTransactions('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should handle network timeouts', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: false,
          status: 408,
          statusText: 'Request Timeout'
        }), 100))
      );

      const result = await apiService.getTransactions('pngme');

      expect(result.success).toBe(false);
    });

    it('should handle server errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await apiService.getTransactions('pngme');

      expect(result.success).toBe(false);
    });
  });
});