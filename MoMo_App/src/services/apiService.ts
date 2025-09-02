import configManager from '../utils/config';

// API Service Layer for Aggregator Integrations
// This provides a unified interface for different financial data aggregators

export interface AggregatorConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

export interface TransactionData {
  id: string;
  amount: number;
  type: string;
  description: string;
  date: string;
  balance?: number;
  counterparty?: string;
}

export interface AccountData {
  id: string;
  name: string;
  balance: number;
  currency: string;
  type: string;
}

export interface AggregatorResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    requestId: string;
    timestamp: string;
    processingTime: number;
  };
}

class ApiService {
  private configs: Map<string, AggregatorConfig> = new Map();

  constructor() {
    // Initialize configurations based on environment
    this.initializeConfigs();
  }

  private initializeConfigs() {
    try {
      // Try to use production configuration first
      if (configManager.isReady()) {
        const appConfig = configManager.getConfig();

        // Pngme Configuration
        this.configs.set('pngme', {
          name: 'Pngme',
          baseUrl: appConfig.apis.pngme.baseUrl,
          apiKey: appConfig.apis.pngme.apiKey,
          timeout: appConfig.apis.pngme.timeout,
        });

        // Okra Configuration
        this.configs.set('okra', {
          name: 'Okra',
          baseUrl: appConfig.apis.okra.baseUrl,
          apiKey: appConfig.apis.okra.apiKey,
          timeout: appConfig.apis.okra.timeout,
        });

        // Mono Configuration
        this.configs.set('mono', {
          name: 'Mono',
          baseUrl: appConfig.apis.mono.baseUrl,
          apiKey: appConfig.apis.mono.apiKey,
          timeout: appConfig.apis.mono.timeout,
        });

        console.log('✅ API Service initialized with production configuration');
      } else {
        // Fallback to mock configuration for development
        console.warn('⚠️  ConfigManager not ready, using mock configuration');
        this.initializeMockConfigs();
      }
    } catch (error) {
      console.error('❌ Failed to initialize API configurations:', error);
      // Fallback to mock configuration
      this.initializeMockConfigs();
    }
  }

  private initializeMockConfigs() {
    // Mock Configuration for Development
    this.configs.set('pngme', {
      name: 'Pngme (Mock)',
      baseUrl: 'https://api.pngme.com/v1',
      apiKey: 'mock_pngme_key',
      timeout: 30000,
    });

    this.configs.set('okra', {
      name: 'Okra (Mock)',
      baseUrl: 'https://api.okra.ng/v2',
      apiKey: 'mock_okra_key',
      timeout: 30000,
    });

    this.configs.set('mono', {
      name: 'Mono (Mock)',
      baseUrl: 'https://api.withmono.com/v1',
      apiKey: 'mock_mono_key',
      timeout: 30000,
    });

    console.log('🔧 API Service initialized with mock configuration');
  }

  private async makeRequest<T>(
    aggregator: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<AggregatorResponse<T>> {
    const config = this.configs.get(aggregator);
    if (!config) {
      return {
        success: false,
        error: `Aggregator ${aggregator} not configured`,
      };
    }

    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const url = `${config.baseUrl}${endpoint}`;
      const headers = {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...options.headers,
      };

      console.log(`[${aggregator}] Making request to: ${url}`);

      // Determine if we should use mock data or real API calls
      const useMockData = this.shouldUseMockData(aggregator);

      let response: Response;
      if (useMockData) {
        // Return mock data for development/testing
        const mockResponse = await this.getMockResponse<T>(aggregator, endpoint, options);
        return {
          success: true,
          data: mockResponse,
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime,
          },
        };
      } else {
        // Make real API call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        try {
          response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new Error(`Request timeout after ${config.timeout}ms`);
          }
          throw fetchError;
        }

        // Handle HTTP response
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Parse response
        const responseData = await response.json().catch(() => null);
        if (!responseData) {
          throw new Error('Invalid JSON response from API');
        }

        return {
          success: true,
          data: responseData,
          metadata: {
            requestId,
            timestamp: new Date().toISOString(),
            processingTime: Date.now() - startTime,
          },
        };
      }

      // This should never be reached due to early returns above
      throw new Error('Unexpected code path in makeRequest');
    } catch (error) {
      console.error(`[${aggregator}] Request failed:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  private shouldUseMockData(aggregator: string): boolean {
    // Use mock data if:
    // 1. ConfigManager is not ready (development)
    // 2. Explicitly enabled in config
    // 3. API key is still mock
    try {
      if (!configManager.isReady()) return true;

      const appConfig = configManager.getConfig();
      if (appConfig.development.enableMockData) return true;

      const apiConfig = configManager.getApiConfig(aggregator as 'pngme' | 'okra' | 'mono');
      if (apiConfig.apiKey.startsWith('mock_')) return true;

      return false;
    } catch {
      return true; // Default to mock data on error
    }
  }

  private async getMockResponse<T>(
    aggregator: string,
    endpoint: string,
    options: RequestInit
  ): Promise<T> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Return mock data based on endpoint
    if (endpoint.includes('/transactions')) {
      return this.getMockTransactions() as T;
    } else if (endpoint.includes('/accounts')) {
      return this.getMockAccounts() as T;
    } else if (endpoint.includes('/balance')) {
      return this.getMockBalance() as T;
    } else {
      return { message: 'Mock response from ' + aggregator } as T;
    }
  }

  private getMockTransactions(): TransactionData[] {
    const transactions: TransactionData[] = [
      {
        id: 'txn_001',
        amount: 150.00,
        type: 'credit',
        description: 'Payment received from customer',
        date: new Date(Date.now() - 86400000).toISOString(),
        balance: 1250.00,
        counterparty: 'Customer A',
      },
      {
        id: 'txn_002',
        amount: -75.50,
        type: 'debit',
        description: 'Bill payment - Electricity',
        date: new Date(Date.now() - 172800000).toISOString(),
        balance: 1100.00,
        counterparty: 'ECG',
      },
      {
        id: 'txn_003',
        amount: 200.00,
        type: 'credit',
        description: 'Transfer from business partner',
        date: new Date(Date.now() - 259200000).toISOString(),
        balance: 1175.50,
        counterparty: 'Business Partner B',
      },
    ];

    return transactions;
  }

  private getMockAccounts(): AccountData[] {
    return [
      {
        id: 'acc_001',
        name: 'Main Business Account',
        balance: 1250.00,
        currency: 'GHS',
        type: 'business',
      },
      {
        id: 'acc_002',
        name: 'Savings Account',
        balance: 5000.00,
        currency: 'GHS',
        type: 'savings',
      },
    ];
  }

  private getMockBalance(): { balance: number; currency: string; lastUpdated: string } {
    return {
      balance: 1250.00,
      currency: 'GHS',
      lastUpdated: new Date().toISOString(),
    };
  }

  // Public API methods
  async getTransactions(aggregator: string, accountId?: string): Promise<AggregatorResponse<TransactionData[]>> {
    const endpoint = accountId ? `/accounts/${accountId}/transactions` : '/transactions';
    return this.makeRequest<TransactionData[]>(aggregator, endpoint);
  }

  async getAccounts(aggregator: string): Promise<AggregatorResponse<AccountData[]>> {
    return this.makeRequest<AccountData[]>(aggregator, '/accounts');
  }

  async getBalance(aggregator: string, accountId: string): Promise<AggregatorResponse<any>> {
    return this.makeRequest(aggregator, `/accounts/${accountId}/balance`);
  }

  async syncData(aggregator: string): Promise<AggregatorResponse<any>> {
    return this.makeRequest(aggregator, '/sync');
  }

  // Configuration management
  updateConfig(aggregator: string, config: Partial<AggregatorConfig>) {
    const existing = this.configs.get(aggregator);
    if (existing) {
      this.configs.set(aggregator, { ...existing, ...config });
    }
  }

  getConfig(aggregator: string): AggregatorConfig | undefined {
    return this.configs.get(aggregator);
  }

  getAvailableAggregators(): string[] {
    return Array.from(this.configs.keys());
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;