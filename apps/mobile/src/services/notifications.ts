import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface PushNotificationData {
  id: string;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showPreview: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
  };
}

class NotificationService {
  private static instance: NotificationService;
  private settings: NotificationSettings;
  private notifications: PushNotificationData[] = [];
  private readonly STORAGE_KEYS = {
    NOTIFICATIONS: 'push_notifications',
    SETTINGS: 'notification_settings',
  };

  private constructor() {
    this.settings = this.getDefaultSettings();
    this.initializeService();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      showPreview: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
    };
  }

  private async initializeService(): Promise<void> {
    await this.loadFromStorage();
    this.configurePushNotifications();
    this.requestPermissions();
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const [notificationsData, settingsData] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.NOTIFICATIONS),
        AsyncStorage.getItem(this.STORAGE_KEYS.SETTINGS),
      ]);

      if (notificationsData) {
        this.notifications = JSON.parse(notificationsData);
        // Convert timestamps back to Date objects
        this.notifications.forEach(notification => {
          notification.timestamp = new Date(notification.timestamp);
        });
      }

      if (settingsData) {
        this.settings = { ...this.getDefaultSettings(), ...JSON.parse(settingsData) };
      }
    } catch (error) {
      console.error('Error loading notification data:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(this.notifications)),
        AsyncStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings)),
      ]);
    } catch (error) {
      console.error('Error saving notification data:', error);
    }
  }

  private configurePushNotifications(): void {
    PushNotification.configure({
      onRegister: (token) => {
        console.log('FCM Token:', token.token);
        // Store token for server-side push notifications
        this.storeFCMToken(token.token);
      },

      onNotification: (notification) => {
        console.log('Notification received:', notification);

        // Handle notification when app is in foreground
        if (notification.foreground) {
          this.handleForegroundNotification(notification);
        }

        // Store notification
        this.storeNotification({
          id: notification.id || `notification_${Date.now()}`,
          title: notification.title || 'Notification',
          message: notification.message || '',
          data: notification.data,
          timestamp: new Date(),
          read: false,
        });
      },

      onAction: (notification) => {
        console.log('Action received:', notification.action);
      },

      onRegistrationError: (err) => {
        console.error('Registration error:', err);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'momo-merchant-alerts',
          channelName: 'MoMo Merchant Alerts',
          channelDescription: 'Business alerts and notifications',
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Channel created: ${created}`)
      );
    }
  }

  private async requestPermissions(): Promise<void> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Notification permission granted');
        const fcmToken = await messaging().getToken();
        await this.storeFCMToken(fcmToken);
      } else {
        console.log('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
    }
  }

  private async storeFCMToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('fcm_token', token);
      // In a real app, you would send this token to your server
      console.log('FCM Token stored:', token);
    } catch (error) {
      console.error('Error storing FCM token:', error);
    }
  }

  private handleForegroundNotification(notification: any): void {
    // Show local notification when app is in foreground
    PushNotification.localNotification({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      playSound: this.settings.soundEnabled,
      soundName: 'default',
      vibrate: this.settings.vibrationEnabled,
      vibration: 300,
      channelId: 'momo-merchant-alerts',
    });
  }

  private async storeNotification(notification: PushNotificationData): Promise<void> {
    this.notifications.unshift(notification); // Add to beginning

    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    await this.saveToStorage();
  }

  // Public API methods
  async sendLocalNotification(
    title: string,
    message: string,
    data?: any,
    options?: {
      sound?: boolean;
      vibration?: boolean;
      channelId?: string;
    }
  ): Promise<void> {
    if (!this.settings.enabled) return;

    // Check quiet hours
    if (this.isQuietHour()) return;

    const notificationId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    PushNotification.localNotification({
      id: notificationId,
      title,
      message,
      data,
      playSound: options?.sound ?? this.settings.soundEnabled,
      soundName: 'default',
      vibrate: options?.vibration ?? this.settings.vibrationEnabled,
      vibration: 300,
      channelId: options?.channelId ?? 'momo-merchant-alerts',
      bigText: message,
      subText: title,
      largeIcon: 'ic_launcher',
      smallIcon: 'ic_notification',
    });

    // Store notification
    await this.storeNotification({
      id: notificationId,
      title,
      message,
      data,
      timestamp: new Date(),
      read: false,
    });
  }

  async sendAlertNotification(
    alertType: string,
    title: string,
    message: string,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    const channelId = severity === 'high' ? 'momo-merchant-alerts' : 'momo-merchant-alerts';

    await this.sendLocalNotification(
      title,
      message,
      { type: 'alert', alertType, severity },
      {
        sound: severity === 'high',
        vibration: true,
        channelId,
      }
    );
  }

  private isQuietHour(): boolean {
    if (!this.settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMinute] = this.settings.quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = this.settings.quietHours.end.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    // Handle overnight quiet hours
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  async getNotifications(limit: number = 50): Promise<PushNotificationData[]> {
    return this.notifications.slice(0, limit);
  }

  async getUnreadCount(): Promise<number> {
    return this.notifications.filter(notification => !notification.read).length;
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
    if (notificationIndex === -1) return;

    this.notifications[notificationIndex].read = true;
    await this.saveToStorage();
  }

  async markAllAsRead(): Promise<void> {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    await this.saveToStorage();
  }

  async deleteNotification(notificationId: string): Promise<void> {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    await this.saveToStorage();
  }

  async clearAllNotifications(): Promise<void> {
    this.notifications = [];
    await this.saveToStorage();
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    return { ...this.settings };
  }

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    await this.saveToStorage();
  }

  // Background message handler for when app is killed
  setupBackgroundMessageHandler(): void {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background message received:', remoteMessage);

      // Store notification for when app opens
      await this.storeNotification({
        id: remoteMessage.messageId || `bg_${Date.now()}`,
        title: remoteMessage.notification?.title || 'Background Notification',
        message: remoteMessage.notification?.body || '',
        data: remoteMessage.data,
        timestamp: new Date(),
        read: false,
      });
    });
  }

  // Get FCM token for server-side push notifications
  async getFCMToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('fcm_token');
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  // Test notification (for development)
  async sendTestNotification(): Promise<void> {
    await this.sendLocalNotification(
      'Test Notification',
      'This is a test notification to verify the notification system is working.',
      { type: 'test' }
    );
  }

  // Cleanup
  destroy(): void {
    PushNotification.cancelAllLocalNotifications();
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();