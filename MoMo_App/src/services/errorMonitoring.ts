// Production Error Monitoring Service
// Integrates with Sentry, Rollbar, and custom error tracking

import configManager from '../utils/config';

interface ErrorContext {
  userId?: string;
  sessionId?: string;
  deviceInfo?: {
    platform: string;
    version: string;
    model: string;
  };
  appState?: {
    currentScreen?: string;
    userAuthenticated?: boolean;
    networkConnected?: boolean;
  };
  customData?: Record<string, any>;
}

interface ErrorEvent {
  message: string;
  stack?: string;
  level: 'error' | 'warning' | 'info';
  context?: ErrorContext;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

class ErrorMonitoringService {
  private isInitialized = false;
  private errorQueue: ErrorEvent[] = [];
  private maxQueueSize = 50;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      if (!configManager.isReady()) {
        console.warn('ConfigManager not ready, error monitoring will use console logging only');
        return;
      }

      const appConfig = configManager.getConfig();

      // Initialize Sentry if configured
      if (appConfig.monitoring.sentryDsn) {
        await this.initializeSentry(appConfig.monitoring.sentryDsn);
      }

      // Initialize Rollbar if configured
      if (appConfig.monitoring.rollbarToken) {
        await this.initializeRollbar(appConfig.monitoring.rollbarToken);
      }

      this.isInitialized = true;
      console.log('✅ Error monitoring initialized');

      // Process any queued errors
      this.processErrorQueue();

    } catch (error) {
      console.error('❌ Failed to initialize error monitoring:', error);
      // Continue with console logging as fallback
    }
  }

  private async initializeSentry(dsn: string) {
    try {
      // Dynamic import to avoid bundling Sentry in development
      if (configManager.isProduction()) {
        const Sentry = await import('@sentry/react-native');
        Sentry.init({
          dsn,
          environment: configManager.getConfig().app.environment,
          tracesSampleRate: 1.0,
          beforeSend: (event) => {
            // Add custom context
            event.tags = {
              ...event.tags,
              app_version: '1.0.0',
              platform: 'react-native',
            };
            return event;
          },
        });
        console.log('✅ Sentry initialized');
      }
    } catch (error) {
      console.warn('⚠️  Failed to initialize Sentry:', error);
    }
  }

  private async initializeRollbar(token: string) {
    try {
      // Dynamic import for Rollbar
      if (configManager.isProduction()) {
        const Rollbar = await import('rollbar-react-native');
        Rollbar.init({
          accessToken: token,
          environment: configManager.getConfig().app.environment,
          captureUncaught: true,
          captureUnhandledRejections: true,
        });
        console.log('✅ Rollbar initialized');
      }
    } catch (error) {
      console.warn('⚠️  Failed to initialize Rollbar:', error);
    }
  }

  /**
   * Capture and report an error
   */
  async captureError(
    error: Error | string,
    context?: ErrorContext,
    level: 'error' | 'warning' | 'info' = 'error'
  ) {
    const errorEvent: ErrorEvent = {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      level,
      context,
      timestamp: new Date().toISOString(),
      userAgent: 'MoMoMerchant/1.0.0',
      url: 'app://current',
    };

    // Log to console first
    this.logToConsole(errorEvent);

    // Queue for external services
    this.errorQueue.push(errorEvent);

    // Trim queue if too large
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }

    // Send to external services if initialized
    if (this.isInitialized) {
      await this.sendToExternalServices(errorEvent);
    }
  }

  /**
   * Capture a warning
   */
  async captureWarning(message: string, context?: ErrorContext) {
    await this.captureError(message, context, 'warning');
  }

  /**
   * Capture an info message
   */
  async captureInfo(message: string, context?: ErrorContext) {
    await this.captureError(message, context, 'info');
  }

  /**
   * Set user context for error tracking
   */
  setUserContext(userId: string, additionalData?: Record<string, any>) {
    try {
      // Sentry user context
      if (configManager.isProduction()) {
        import('@sentry/react-native').then(Sentry => {
          Sentry.setUser({
            id: userId,
            ...additionalData,
          });
        }).catch(() => {
          // Sentry not available
        });
      }

      console.log(`👤 Error monitoring user context set: ${userId}`);
    } catch (error) {
      console.warn('⚠️  Failed to set user context:', error);
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info') {
    try {
      if (configManager.isProduction()) {
        import('@sentry/react-native').then(Sentry => {
          Sentry.addBreadcrumb({
            message,
            category,
            level: level === 'warning' ? 'warning' : level === 'error' ? 'error' : 'info',
            timestamp: Date.now() / 1000,
          });
        }).catch(() => {
          // Sentry not available
        });
      }

      console.log(`🍞 Breadcrumb: [${category}] ${message}`);
    } catch (error) {
      console.warn('⚠️  Failed to add breadcrumb:', error);
    }
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetric(name: string, value: number, unit: string = 'ms') {
    try {
      if (configManager.isProduction()) {
        import('@sentry/react-native').then(Sentry => {
          Sentry.metrics.increment(name, value, {
            unit,
            tags: { environment: configManager.getConfig().app.environment },
          });
        }).catch(() => {
          // Sentry not available
        });
      }

      console.log(`📊 Performance: ${name} = ${value}${unit}`);
    } catch (error) {
      console.warn('⚠️  Failed to log performance metric:', error);
    }
  }

  private logToConsole(errorEvent: ErrorEvent) {
    const emoji = errorEvent.level === 'error' ? '❌' :
                  errorEvent.level === 'warning' ? '⚠️' : 'ℹ️';

    console.log(`${emoji} [${errorEvent.level.toUpperCase()}] ${errorEvent.message}`);

    if (errorEvent.stack) {
      console.log(errorEvent.stack);
    }

    if (errorEvent.context) {
      console.log('Context:', errorEvent.context);
    }
  }

  private async sendToExternalServices(errorEvent: ErrorEvent) {
    try {
      // Send to Sentry
      if (configManager.getConfig().monitoring.sentryDsn) {
        await this.sendToSentry(errorEvent);
      }

      // Send to Rollbar
      if (configManager.getConfig().monitoring.rollbarToken) {
        await this.sendToRollbar(errorEvent);
      }

      // Send to custom monitoring endpoint
      await this.sendToCustomEndpoint(errorEvent);

    } catch (error) {
      console.warn('⚠️  Failed to send error to external services:', error);
    }
  }

  private async sendToSentry(errorEvent: ErrorEvent) {
    try {
      const Sentry = await import('@sentry/react-native');
      Sentry.captureException(
        new Error(errorEvent.message),
        {
          tags: {
            level: errorEvent.level,
            environment: configManager.getConfig().app.environment,
          },
          extra: {
            stack: errorEvent.stack,
            context: errorEvent.context,
            timestamp: errorEvent.timestamp,
          },
        }
      );
    } catch (error) {
      console.warn('⚠️  Failed to send to Sentry:', error);
    }
  }

  private async sendToRollbar(errorEvent: ErrorEvent) {
    try {
      const Rollbar = await import('rollbar-react-native');
      Rollbar.error(
        new Error(errorEvent.message),
        {
          level: errorEvent.level,
          environment: configManager.getConfig().app.environment,
          stack: errorEvent.stack,
          context: errorEvent.context,
          timestamp: errorEvent.timestamp,
        }
      );
    } catch (error) {
      console.warn('⚠️  Failed to send to Rollbar:', error);
    }
  }

  private async sendToCustomEndpoint(errorEvent: ErrorEvent) {
    try {
      const appConfig = configManager.getConfig();
      const customEndpoint = `${appConfig.app.apiBaseUrl}/errors`;

      const response = await fetch(customEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appConfig.security.jwtSecret}`,
        },
        body: JSON.stringify(errorEvent),
      });

      if (!response.ok) {
        console.warn('⚠️  Custom error endpoint returned:', response.status);
      }
    } catch (error) {
      // Silently fail for custom endpoint
    }
  }

  private processErrorQueue() {
    if (this.errorQueue.length === 0) return;

    console.log(`📤 Processing ${this.errorQueue.length} queued errors`);

    this.errorQueue.forEach(async (errorEvent) => {
      await this.sendToExternalServices(errorEvent);
    });

    this.errorQueue = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      totalErrors: this.errorQueue.length,
      isInitialized: this.isInitialized,
      environment: configManager.isReady() ? configManager.getConfig().app.environment : 'unknown',
      monitoringEnabled: {
        sentry: !!configManager.getConfig().monitoring.sentryDsn,
        rollbar: !!configManager.getConfig().monitoring.rollbarToken,
      },
    };

    return stats;
  }

  /**
   * Flush any pending errors
   */
  async flush() {
    if (this.errorQueue.length > 0) {
      console.log('🧹 Flushing error queue...');
      await this.processErrorQueue();
    }
  }
}

// Global error handler
const setupGlobalErrorHandler = () => {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Call original console.error
    originalConsoleError.apply(console, args);

    // Capture error with monitoring service
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    errorMonitoring.captureError(message, {
      customData: { source: 'console.error' }
    });
  };

  // Handle unhandled promise rejections
  if (typeof global !== 'undefined' && global.process) {
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      errorMonitoring.captureError(
        `Unhandled promise rejection: ${reason}`,
        { customData: { type: 'unhandledRejection' } }
      );
    });
  }
};

// Initialize global error handler
setupGlobalErrorHandler();

// Export singleton instance
export const errorMonitoring = new ErrorMonitoringService();
export default errorMonitoring;
export type { ErrorContext, ErrorEvent };