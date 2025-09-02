// Secure Configuration Manager
// Handles environment variables and configuration validation

interface AppConfig {
  // API Configuration
  apis: {
    pngme: {
      apiKey: string;
      baseUrl: string;
      timeout: number;
    };
    okra: {
      apiKey: string;
      baseUrl: string;
      timeout: number;
    };
    mono: {
      apiKey: string;
      baseUrl: string;
      timeout: number;
    };
  };

  // App Configuration
  app: {
    environment: 'development' | 'staging' | 'production';
    apiBaseUrl: string;
    stagingApiBaseUrl: string;
  };

  // Security Configuration
  security: {
    encryptionKey: string;
    jwtSecret: string;
    sslCertPin?: string;
  };

  // Monitoring Configuration
  monitoring: {
    sentryDsn?: string;
    rollbarToken?: string;
    mixpanelToken?: string;
    amplitudeKey?: string;
  };

  // External Services
  services: {
    expoAccessToken?: string;
    fcmServerKey?: string;
    twilio: {
      accountSid?: string;
      authToken?: string;
      phoneNumber?: string;
    };
  };

  // Feature Flags
  features: {
    fraudDetection: boolean;
    advancedAnalytics: boolean;
    pushNotifications: boolean;
    biometricAuth: boolean;
  };

  // Development Settings
  development: {
    enableConsoleLogging: boolean;
    enableDevTools: boolean;
    enableMockData: boolean;
  };
}

class ConfigManager {
  private config: AppConfig | null = null;
  private isInitialized = false;

  /**
   * Initialize configuration from environment variables
   */
  initialize(): void {
    if (this.isInitialized) {
      console.warn('ConfigManager already initialized');
      return;
    }

    try {
      this.config = this.loadConfig();
      this.validateConfig();
      this.isInitialized = true;

      if (this.config.development.enableConsoleLogging) {
        console.log('✅ Configuration loaded successfully');
      }
    } catch (error) {
      console.error('❌ Failed to initialize configuration:', error);
      throw new Error('Configuration initialization failed');
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): AppConfig {
    if (!this.isInitialized || !this.config) {
      throw new Error('ConfigManager not initialized. Call initialize() first.');
    }
    return this.config;
  }

  /**
   * Check if configuration is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): AppConfig {
    return {
      apis: {
        pngme: {
          apiKey: this.getRequiredEnvVar('PNGME_API_KEY'),
          baseUrl: this.getEnvVar('PNGME_BASE_URL', 'https://api.pngme.com/v1'),
          timeout: parseInt(this.getEnvVar('PNGME_TIMEOUT', '30000')),
        },
        okra: {
          apiKey: this.getRequiredEnvVar('OKRA_API_KEY'),
          baseUrl: this.getEnvVar('OKRA_BASE_URL', 'https://api.okra.ng/v2'),
          timeout: parseInt(this.getEnvVar('OKRA_TIMEOUT', '30000')),
        },
        mono: {
          apiKey: this.getRequiredEnvVar('MONO_API_KEY'),
          baseUrl: this.getEnvVar('MONO_BASE_URL', 'https://api.withmono.com/v1'),
          timeout: parseInt(this.getEnvVar('MONO_TIMEOUT', '30000')),
        },
      },
      app: {
        environment: this.getEnvVar('NODE_ENV', 'development') as 'development' | 'staging' | 'production',
        apiBaseUrl: this.getEnvVar('API_BASE_URL', 'https://api.momomerchant.com'),
        stagingApiBaseUrl: this.getEnvVar('STAGING_API_BASE_URL', 'https://staging-api.momomerchant.com'),
      },
      security: {
        encryptionKey: this.getRequiredEnvVar('ENCRYPTION_KEY'),
        jwtSecret: this.getRequiredEnvVar('JWT_SECRET'),
        sslCertPin: this.getEnvVar('SSL_CERT_PIN'),
      },
      monitoring: {
        sentryDsn: this.getEnvVar('SENTRY_DSN'),
        rollbarToken: this.getEnvVar('ROLLBAR_ACCESS_TOKEN'),
        mixpanelToken: this.getEnvVar('MIXPANEL_TOKEN'),
        amplitudeKey: this.getEnvVar('AMPLITUDE_API_KEY'),
      },
      services: {
        expoAccessToken: this.getEnvVar('EXPO_ACCESS_TOKEN'),
        fcmServerKey: this.getEnvVar('FCM_SERVER_KEY'),
        twilio: {
          accountSid: this.getEnvVar('TWILIO_ACCOUNT_SID'),
          authToken: this.getEnvVar('TWILIO_AUTH_TOKEN'),
          phoneNumber: this.getEnvVar('TWILIO_PHONE_NUMBER'),
        },
      },
      features: {
        fraudDetection: this.getBooleanEnvVar('ENABLE_FRAUD_DETECTION', true),
        advancedAnalytics: this.getBooleanEnvVar('ENABLE_ADVANCED_ANALYTICS', true),
        pushNotifications: this.getBooleanEnvVar('ENABLE_PUSH_NOTIFICATIONS', true),
        biometricAuth: this.getBooleanEnvVar('ENABLE_BIOMETRIC_AUTH', true),
      },
      development: {
        enableConsoleLogging: this.getBooleanEnvVar('ENABLE_CONSOLE_LOGGING', false),
        enableDevTools: this.getBooleanEnvVar('ENABLE_DEV_TOOLS', false),
        enableMockData: this.getBooleanEnvVar('ENABLE_MOCK_DATA', false),
      },
    };
  }

  /**
   * Validate configuration values
   */
  private validateConfig(): void {
    if (!this.config) return;

    // Validate API keys format (basic validation)
    const apiKeys = [
      this.config.apis.pngme.apiKey,
      this.config.apis.okra.apiKey,
      this.config.apis.mono.apiKey,
    ];

    apiKeys.forEach((key, index) => {
      if (key.length < 20) {
        const provider = ['Pngme', 'Okra', 'Mono'][index];
        console.warn(`⚠️  ${provider} API key seems too short. Please verify it's correct.`);
      }
    });

    // Validate encryption key length
    if (this.config.security.encryptionKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }

    // Validate URLs
    const urls = [
      this.config.apis.pngme.baseUrl,
      this.config.apis.okra.baseUrl,
      this.config.apis.mono.baseUrl,
      this.config.app.apiBaseUrl,
    ];

    urls.forEach(url => {
      try {
        new URL(url);
      } catch {
        throw new Error(`Invalid URL format: ${url}`);
      }
    });

    // Environment-specific validations
    if (this.config.app.environment === 'production') {
      if (!this.config.monitoring.sentryDsn) {
        console.warn('⚠️  Production environment detected but SENTRY_DSN not configured');
      }

      if (this.config.development.enableConsoleLogging) {
        console.warn('⚠️  Console logging is enabled in production. Consider disabling for security.');
      }
    }
  }

  /**
   * Get required environment variable
   */
  private getRequiredEnvVar(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  /**
   * Get environment variable with default value
   */
  private getEnvVar(key: string, defaultValue: string = ''): string {
    return process.env[key] || defaultValue;
  }

  /**
   * Get boolean environment variable
   */
  private getBooleanEnvVar(key: string, defaultValue: boolean = false): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;

    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Get current API base URL based on environment
   */
  getApiBaseUrl(): string {
    const config = this.getConfig();
    return config.app.environment === 'staging'
      ? config.app.stagingApiBaseUrl
      : config.app.apiBaseUrl;
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    const config = this.getConfig();
    return config.features[feature];
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    const config = this.getConfig();
    return config.app.environment === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment(): boolean {
    const config = this.getConfig();
    return config.app.environment === 'development';
  }

  /**
   * Get API configuration for a specific provider
   */
  getApiConfig(provider: 'pngme' | 'okra' | 'mono') {
    const config = this.getConfig();
    return config.apis[provider];
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
export default configManager;
export type { AppConfig };