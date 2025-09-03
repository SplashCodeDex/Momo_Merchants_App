import BackgroundFetch from 'react-native-background-fetch';
import { syncEngine } from './syncEngine';
import { networkService } from './network';
import { syncQueueService } from './syncQueue';

export interface BackgroundSyncConfig {
  minimumInterval: number; // minutes
  stopOnTerminate: boolean;
  startOnBoot: boolean;
  enableHeadless: boolean;
}

export class BackgroundSyncService {
  private isRegistered = false;
  private config: BackgroundSyncConfig;

  constructor(config: Partial<BackgroundSyncConfig> = {}) {
    this.config = {
      minimumInterval: 15, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      ...config,
    };
  }

  // Initialize background sync
  async initialize(): Promise<void> {
    try {
      // Configure background fetch
      await BackgroundFetch.configure(
        {
          minimumFetchInterval: this.config.minimumInterval,
          stopOnTerminate: this.config.stopOnTerminate,
          startOnBoot: this.config.startOnBoot,
          enableHeadless: this.config.enableHeadless,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
          requiresBatteryNotLow: false,
          requiresCharging: false,
          requiresDeviceIdle: false,
          requiresStorageNotLow: false,
        },
        this.handleBackgroundFetch.bind(this),
        this.handleBackgroundFetchTimeout.bind(this)
      );

      // Register background fetch
      await BackgroundFetch.registerHeadlessTask(this.handleHeadlessTask.bind(this));

      this.isRegistered = true;
      console.log('Background sync initialized successfully');
    } catch (error) {
      console.error('Failed to initialize background sync:', error);
      throw error;
    }
  }

  // Start background sync
  async start(): Promise<void> {
    if (!this.isRegistered) {
      await this.initialize();
    }

    try {
      const started = await BackgroundFetch.start();
      if (started) {
        console.log('Background sync started successfully');
      } else {
        console.log('Background sync failed to start');
      }
    } catch (error) {
      console.error('Error starting background sync:', error);
    }
  }

  // Stop background sync
  async stop(): Promise<void> {
    try {
      await BackgroundFetch.stop();
      console.log('Background sync stopped');
    } catch (error) {
      console.error('Error stopping background sync:', error);
    }
  }

  // Handle background fetch event
  private async handleBackgroundFetch(taskId: string): Promise<void> {
    console.log('Background fetch triggered:', taskId);

    try {
      // Check if we should perform sync
      if (await this.shouldPerformSync()) {
        const result = await syncEngine.startSync();
        console.log('Background sync completed:', result);

        // Schedule next fetch
        BackgroundFetch.finish(taskId);
      } else {
        console.log('Skipping background sync - conditions not met');
        BackgroundFetch.finish(taskId);
      }
    } catch (error) {
      console.error('Background sync failed:', error);
      BackgroundFetch.finish(taskId);
    }
  }

  // Handle background fetch timeout
  private handleBackgroundFetchTimeout(taskId: string): void {
    console.log('Background fetch timed out:', taskId);
    BackgroundFetch.finish(taskId);
  }

  // Handle headless task (Android only)
  private async handleHeadlessTask(event: { taskId: string; timeout: boolean }): Promise<void> {
    console.log('Headless task triggered:', event);

    if (event.timeout) {
      console.log('Headless task timed out');
      BackgroundFetch.finish(event.taskId);
      return;
    }

    try {
      if (await this.shouldPerformSync()) {
        const result = await syncEngine.startSync();
        console.log('Headless sync completed:', result);
      }
      BackgroundFetch.finish(event.taskId);
    } catch (error) {
      console.error('Headless sync failed:', error);
      BackgroundFetch.finish(event.taskId);
    }
  }

  // Determine if sync should be performed
  private async shouldPerformSync(): Promise<boolean> {
    // Check network connectivity
    if (!networkService.isOnline()) {
      console.log('Skipping sync: No network connection');
      return false;
    }

    // Check if there are pending operations
    const queueStats = await syncQueueService.getQueueStats();
    if (queueStats.pending === 0) {
      console.log('Skipping sync: No pending operations');
      return false;
    }

    // Check network quality for large syncs
    const networkQuality = networkService.getNetworkQuality();
    if (queueStats.pending > 100 && networkQuality === 'poor') {
      console.log('Skipping large sync on poor network');
      return false;
    }

    // Check battery level (if available)
    // This would require additional battery monitoring

    return true;
  }

  // Schedule immediate sync
  async scheduleImmediateSync(): Promise<void> {
    try {
      await BackgroundFetch.scheduleTask({
        taskId: `sync-${Date.now()}`,
        delay: 0, // Execute immediately
        periodic: false,
        enableHeadless: true,
      });
      console.log('Immediate sync scheduled');
    } catch (error) {
      console.error('Failed to schedule immediate sync:', error);
    }
  }

  // Get background sync status
  async getStatus(): Promise<{
    isRegistered: boolean;
    isRunning: boolean;
    config: BackgroundSyncConfig;
  }> {
    try {
      const status = await BackgroundFetch.status();
      return {
        isRegistered: this.isRegistered,
        isRunning: status !== BackgroundFetch.STATUS_RESTRICTED,
        config: this.config,
      };
    } catch (error) {
      console.error('Error getting background sync status:', error);
      return {
        isRegistered: this.isRegistered,
        isRunning: false,
        config: this.config,
      };
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<BackgroundSyncConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Reconfigure if already running
    if (this.isRegistered) {
      this.restartWithNewConfig();
    }
  }

  // Restart with new configuration
  private async restartWithNewConfig(): Promise<void> {
    try {
      await this.stop();
      await this.initialize();
      await this.start();
    } catch (error) {
      console.error('Failed to restart with new config:', error);
    }
  }

  // Clean up resources
  async cleanup(): Promise<void> {
    await this.stop();
    this.isRegistered = false;
  }

  // Get sync schedule information
  getScheduleInfo(): {
    nextSyncTime: Date | null;
    intervalMinutes: number;
    isEnabled: boolean;
  } {
    // This is a simplified implementation
    // In a real app, you might store more detailed schedule information
    return {
      nextSyncTime: new Date(Date.now() + this.config.minimumInterval * 60 * 1000),
      intervalMinutes: this.config.minimumInterval,
      isEnabled: this.isRegistered,
    };
  }

  // Force sync for testing
  async forceSync(): Promise<void> {
    console.log('Forcing background sync...');
    await this.scheduleImmediateSync();
  }
}

// Export singleton instance
export const backgroundSyncService = new BackgroundSyncService();