import BackgroundTimer from 'react-native-background-timer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsService, KPIMetrics } from './analytics';
import { alertService } from './alerts';
import { notificationService } from './notifications';

export interface BackgroundAnalyticsConfig {
  enabled: boolean;
  updateInterval: number; // minutes
  cacheAnalytics: boolean;
  backgroundProcessing: boolean;
  lowPowerMode: boolean;
}

export interface AnalyticsCache {
  kpis: KPIMetrics;
  lastUpdated: Date;
  userId: string;
  merchantId?: string;
}

class BackgroundAnalyticsService {
  private static instance: BackgroundAnalyticsService;
  private config: BackgroundAnalyticsConfig;
  private isRunning: boolean = false;
  private backgroundTimer?: NodeJS.Timeout;
  private currentUserId?: string;
  private currentMerchantId?: string;

  private readonly STORAGE_KEYS = {
    CONFIG: 'background_analytics_config',
    CACHE: 'analytics_cache',
  };

  private constructor() {
    this.config = this.getDefaultConfig();
    this.initializeService();
  }

  static getInstance(): BackgroundAnalyticsService {
    if (!BackgroundAnalyticsService.instance) {
      BackgroundAnalyticsService.instance = new BackgroundAnalyticsService();
    }
    return BackgroundAnalyticsService.instance;
  }

  private getDefaultConfig(): BackgroundAnalyticsConfig {
    return {
      enabled: true,
      updateInterval: 15, // 15 minutes
      cacheAnalytics: true,
      backgroundProcessing: true,
      lowPowerMode: false,
    };
  }

  private async initializeService(): Promise<void> {
    await this.loadConfig();
    if (this.config.enabled) {
      this.startBackgroundProcessing();
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem(this.STORAGE_KEYS.CONFIG);
      if (configData) {
        this.config = { ...this.getDefaultConfig(), ...JSON.parse(configData) };
      }
    } catch (error) {
      console.error('Error loading background analytics config:', error);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving background analytics config:', error);
    }
  }

  // Set current user context
  setUserContext(userId: string, merchantId?: string): void {
    this.currentUserId = userId;
    this.currentMerchantId = merchantId;
  }

  // Start background analytics processing
  startBackgroundProcessing(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('Starting background analytics processing...');

    // Use BackgroundTimer for reliable background execution
    BackgroundTimer.runBackgroundTimer(() => {
      this.performBackgroundAnalytics();
    }, this.config.updateInterval * 60 * 1000); // Convert minutes to milliseconds
  }

  // Stop background analytics processing
  stopBackgroundProcessing(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    console.log('Stopping background analytics processing...');

    if (BackgroundTimer) {
      BackgroundTimer.stopBackgroundTimer();
    }

    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = undefined;
    }
  }

  // Perform background analytics calculations
  private async performBackgroundAnalytics(): Promise<void> {
    if (!this.currentUserId) {
      console.log('No user context set for background analytics');
      return;
    }

    try {
      console.log('Performing background analytics...');

      // Calculate KPIs in background
      const kpis = await analyticsService.calculateKPIs(
        this.currentUserId,
        this.currentMerchantId
      );

      // Cache the results
      if (this.config.cacheAnalytics) {
        await this.cacheAnalyticsResults(kpis);
      }

      // Check for alerts
      await alertService.checkAlertsNow();

      // Perform additional background tasks
      await this.performMaintenanceTasks();

      console.log('Background analytics completed successfully');
    } catch (error) {
      console.error('Error in background analytics:', error);
    }
  }

  // Cache analytics results
  private async cacheAnalyticsResults(kpis: KPIMetrics): Promise<void> {
    try {
      const cacheData: AnalyticsCache = {
        kpis,
        lastUpdated: new Date(),
        userId: this.currentUserId!,
        merchantId: this.currentMerchantId,
      };

      await AsyncStorage.setItem(
        this.STORAGE_KEYS.CACHE,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.error('Error caching analytics results:', error);
    }
  }

  // Get cached analytics results
  async getCachedAnalytics(): Promise<AnalyticsCache | null> {
    try {
      const cacheData = await AsyncStorage.getItem(this.STORAGE_KEYS.CACHE);
      if (cacheData) {
        const cache: AnalyticsCache = JSON.parse(cacheData);
        // Check if cache is still valid (within 1 hour)
        const cacheAge = Date.now() - new Date(cache.lastUpdated).getTime();
        if (cacheAge < 60 * 60 * 1000) { // 1 hour
          return cache;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached analytics:', error);
      return null;
    }
  }

  // Perform maintenance tasks
  private async performMaintenanceTasks(): Promise<void> {
    try {
      // Clear old analytics cache if needed
      await this.cleanupOldCache();

      // Update notification badges
      await this.updateNotificationBadges();

      // Perform database maintenance
      await this.performDatabaseMaintenance();

    } catch (error) {
      console.error('Error in maintenance tasks:', error);
    }
  }

  // Clean up old cached data
  private async cleanupOldCache(): Promise<void> {
    try {
      // Get all cache keys
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('analytics_cache_'));

      for (const key of cacheKeys) {
        const cacheData = await AsyncStorage.getItem(key);
        if (cacheData) {
          const cache: AnalyticsCache = JSON.parse(cacheData);
          const cacheAge = Date.now() - new Date(cache.lastUpdated).getTime();

          // Remove cache older than 24 hours
          if (cacheAge > 24 * 60 * 60 * 1000) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up old cache:', error);
    }
  }

  // Update notification badges
  private async updateNotificationBadges(): Promise<void> {
    try {
      const unreadCount = await notificationService.getUnreadCount();
      // Update app badge (platform-specific implementation would go here)
      console.log(`Updating badge count: ${unreadCount}`);
    } catch (error) {
      console.error('Error updating notification badges:', error);
    }
  }

  // Perform database maintenance
  private async performDatabaseMaintenance(): Promise<void> {
    try {
      // Clear old analytics cache entries
      analyticsService.clearCache();

      // Optimize database if needed
      // This would involve database-specific maintenance tasks

      console.log('Database maintenance completed');
    } catch (error) {
      console.error('Error in database maintenance:', error);
    }
  }

  // Get analytics with smart caching
  async getAnalyticsWithCache(userId: string, merchantId?: string): Promise<KPIMetrics> {
    // Check cache first
    const cached = await this.getCachedAnalytics();
    if (cached &&
        cached.userId === userId &&
        cached.merchantId === merchantId) {
      // Return cached data if it's recent
      const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
      if (cacheAge < this.config.updateInterval * 60 * 1000) {
        return cached.kpis;
      }
    }

    // Calculate fresh analytics
    const kpis = await analyticsService.calculateKPIs(userId, merchantId);

    // Cache the results
    if (this.config.cacheAnalytics) {
      await this.cacheAnalyticsResults(kpis);
    }

    return kpis;
  }

  // Update configuration
  async updateConfig(newConfig: Partial<BackgroundAnalyticsConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();

    // Restart background processing if needed
    if (this.config.enabled && !this.isRunning) {
      this.startBackgroundProcessing();
    } else if (!this.config.enabled && this.isRunning) {
      this.stopBackgroundProcessing();
    }
  }

  // Get current configuration
  getConfig(): BackgroundAnalyticsConfig {
    return { ...this.config };
  }

  // Force immediate analytics update
  async forceAnalyticsUpdate(): Promise<void> {
    await this.performBackgroundAnalytics();
  }

  // Get background processing status
  getStatus(): {
    isRunning: boolean;
    config: BackgroundAnalyticsConfig;
    lastUpdate?: Date;
  } {
    return {
      isRunning: this.isRunning,
      config: { ...this.config },
    };
  }

  // Clean up resources
  destroy(): void {
    this.stopBackgroundProcessing();
  }

  // Handle app state changes
  onAppStateChange(isActive: boolean): void {
    if (isActive && this.config.lowPowerMode) {
      // App became active, can perform more frequent updates
      this.forceAnalyticsUpdate();
    }
  }

  // Handle network state changes
  onNetworkStateChange(isConnected: boolean): void {
    if (isConnected && !this.isRunning && this.config.enabled) {
      // Network restored, restart background processing
      this.startBackgroundProcessing();
    } else if (!isConnected && this.isRunning) {
      // Network lost, pause background processing
      this.stopBackgroundProcessing();
    }
  }
}

// Export singleton instance
export const backgroundAnalytics = BackgroundAnalyticsService.getInstance();