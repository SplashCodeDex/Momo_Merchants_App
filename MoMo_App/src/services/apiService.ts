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
    // Initialize with mock configurations
    this.initializeMockConfigs();
  }

  private initializeMockConfigs() {
    // Pngme Configuration
    this.configs.set('pngme', {
      name: 'Pngme',
      baseUrl: 'https://api.pngme.com/v1',
      apiKey: process.env.PNGME_API_KEY || 'mock_pngme_key',
      timeout: 30000,
    });

    // Okra Configuration
    this.configs.set('okra', {
      name: 'Okra',
      baseUrl: 'https://api.okra.ng/v2',
      apiKey: process.env.OKRA_API_KEY || 'mock_okra_key',
      timeout: 30000,
    });

    // Mono Configuration
    this.configs.set('mono', {
      name: 'Mono',
      baseUrl: 'https://api.withmono.com/v1',
      apiKey: process.env.MONO_API_KEY || 'mock_mono_key',
      timeout: 30000,
    });
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

      // For development, return mock data instead of making real API calls
      const mockResponse = await this.getMockResponse<T>(aggregator, endpoint, options);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: mockResponse,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          processingTime,
        },
      };
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