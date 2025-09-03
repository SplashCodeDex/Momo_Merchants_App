import { analyticsService, AlertThresholds } from './analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AlertRule {
  id: string;
  name: string;
  type: 'low_balance' | 'high_transaction_volume' | 'unusual_activity' | 'daily_revenue_target' | 'weekly_revenue_target' | 'monthly_revenue_target' | 'custom';
  threshold: number;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high';
  message: string;
  cooldownMinutes: number; // Prevent spam alerts
  lastTriggered?: Date;
  customCondition?: (metrics: any) => boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  value: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  alertTypes: {
    low_balance: boolean;
    high_transaction_volume: boolean;
    unusual_activity: boolean;
    daily_revenue_target: boolean;
    weekly_revenue_target: boolean;
    monthly_revenue_target: boolean;
    custom: boolean;
  };
}

class AlertService {
  private static instance: AlertService;
  private alertRules: AlertRule[] = [];
  private alerts: Alert[] = [];
  private preferences: NotificationPreferences;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEYS = {
    ALERT_RULES: 'alert_rules',
    ALERTS: 'alerts',
    PREFERENCES: 'notification_preferences',
  };

  private constructor() {
    this.preferences = this.getDefaultPreferences();
    this.initializeService();
  }

  static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      pushEnabled: true,
      emailEnabled: false,
      smsEnabled: false,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      alertTypes: {
        low_balance: true,
        high_transaction_volume: true,
        unusual_activity: true,
        daily_revenue_target: true,
        weekly_revenue_target: true,
        monthly_revenue_target: true,
        custom: true,
      },
    };
  }

  private async initializeService(): Promise<void> {
    await this.loadFromStorage();
    this.createDefaultRules();
    this.startMonitoring();
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const [rulesData, alertsData, preferencesData] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.ALERT_RULES),
        AsyncStorage.getItem(this.STORAGE_KEYS.ALERTS),
        AsyncStorage.getItem(this.STORAGE_KEYS.PREFERENCES),
      ]);

      if (rulesData) {
        this.alertRules = JSON.parse(rulesData);
        // Convert lastTriggered back to Date objects
        this.alertRules.forEach(rule => {
          if (rule.lastTriggered) {
            rule.lastTriggered = new Date(rule.lastTriggered);
          }
        });
      }

      if (alertsData) {
        this.alerts = JSON.parse(alertsData);
        // Convert timestamps back to Date objects
        this.alerts.forEach(alert => {
          alert.timestamp = new Date(alert.timestamp);
          if (alert.acknowledgedAt) {
            alert.acknowledgedAt = new Date(alert.acknowledgedAt);
          }
        });
      }

      if (preferencesData) {
        this.preferences = { ...this.getDefaultPreferences(), ...JSON.parse(preferencesData) };
      }
    } catch (error) {
      console.error('Error loading alert data from storage:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.ALERT_RULES, JSON.stringify(this.alertRules)),
        AsyncStorage.setItem(this.STORAGE_KEYS.ALERTS, JSON.stringify(this.alerts)),
        AsyncStorage.setItem(this.STORAGE_KEYS.PREFERENCES, JSON.stringify(this.preferences)),
      ]);
    } catch (error) {
      console.error('Error saving alert data to storage:', error);
    }
  }

  private createDefaultRules(): void {
    if (this.alertRules.length === 0) {
      const defaultRules: AlertRule[] = [
        {
          id: 'low_balance',
          name: 'Low Balance Alert',
          type: 'low_balance',
          threshold: 100, // GHS 100
          enabled: true,
          severity: 'high',
          message: 'Account balance is below minimum threshold',
          cooldownMinutes: 60,
        },
        {
          id: 'high_volume',
          name: 'High Transaction Volume',
          type: 'high_transaction_volume',
          threshold: 50, // 50 transactions per day
          enabled: true,
          severity: 'medium',
          message: 'Unusually high transaction volume detected',
          cooldownMinutes: 120,
        },
        {
          id: 'daily_target',
          name: 'Daily Revenue Target',
          type: 'daily_revenue_target',
          threshold: 500, // GHS 500 per day
          enabled: true,
          severity: 'medium',
          message: 'Daily revenue target not met',
          cooldownMinutes: 1440, // 24 hours
        },
        {
          id: 'unusual_activity',
          name: 'Unusual Activity',
          type: 'unusual_activity',
          threshold: 200, // 200% of normal activity
          enabled: true,
          severity: 'high',
          message: 'Unusual transaction activity detected',
          cooldownMinutes: 30,
        },
      ];

      this.alertRules = defaultRules;
      this.saveToStorage();
    }
  }

  private startMonitoring(): void {
    // Check for alerts every 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkAlerts();
    }, 5 * 60 * 1000);

    // Initial check
    setTimeout(() => {
      this.checkAlerts();
    }, 10000); // 10 seconds after startup
  }

  private async checkAlerts(): Promise<void> {
    try {
      // Get current metrics (you'll need to pass userId and merchantId)
      // For now, we'll use placeholder values
      const mockUserId = 'current_user';
      const mockMerchantId = 'current_merchant';

      const kpis = await analyticsService.calculateKPIs(mockUserId, mockMerchantId);

      // Check each enabled rule
      for (const rule of this.alertRules) {
        if (!rule.enabled) continue;

        // Check cooldown
        if (rule.lastTriggered) {
          const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
          const cooldownMs = rule.cooldownMinutes * 60 * 1000;
          if (timeSinceLastTrigger < cooldownMs) continue;
        }

        let shouldTrigger = false;
        let actualValue = 0;

        switch (rule.type) {
          case 'low_balance':
            actualValue = kpis.netIncome;
            shouldTrigger = actualValue < rule.threshold;
            break;
          case 'high_transaction_volume':
            actualValue = kpis.todayTransactions;
            shouldTrigger = actualValue > rule.threshold;
            break;
          case 'daily_revenue_target':
            actualValue = kpis.todayRevenue;
            shouldTrigger = actualValue < rule.threshold;
            break;
          case 'unusual_activity':
            // Calculate unusual activity based on historical data
            const avgTransactions = kpis.transactionsPerDay;
            actualValue = (kpis.todayTransactions / Math.max(avgTransactions, 1)) * 100;
            shouldTrigger = actualValue > rule.threshold;
            break;
          case 'custom':
            if (rule.customCondition) {
              shouldTrigger = rule.customCondition(kpis);
            }
            break;
        }

        if (shouldTrigger) {
          await this.triggerAlert(rule, actualValue);
        }
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  private async triggerAlert(rule: AlertRule, actualValue: number): Promise<void> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      type: rule.type,
      message: rule.message,
      severity: rule.severity,
      value: actualValue,
      threshold: rule.threshold,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.unshift(alert); // Add to beginning of array
    rule.lastTriggered = new Date();

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    await this.saveToStorage();

    // Send notification if enabled
    if (this.shouldSendNotification(alert)) {
      await this.sendNotification(alert);
    }
  }

  private shouldSendNotification(alert: Alert): boolean {
    // Check if notifications are enabled for this alert type
    if (!this.preferences.alertTypes[alert.type as keyof typeof this.preferences.alertTypes]) {
      return false;
    }

    // Check quiet hours
    if (this.preferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startHour, startMinute] = this.preferences.quietHours.start.split(':').map(Number);
      const [endHour, endMinute] = this.preferences.quietHours.end.split(':').map(Number);
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      if (currentTime >= startTime || currentTime <= endTime) {
        return false;
      }
    }

    return this.preferences.pushEnabled;
  }

  private async sendNotification(alert: Alert): Promise<void> {
    // This would integrate with push notification service
    // For now, we'll just log it
    console.log('Sending notification:', {
      title: `Alert: ${alert.type.replace('_', ' ').toUpperCase()}`,
      message: alert.message,
      severity: alert.severity,
    });

    // In a real implementation, you would:
    // 1. Use Firebase Cloud Messaging for push notifications
    // 2. Send email notifications
    // 3. Send SMS notifications
    // 4. Update notification badge
  }

  // Public API methods
  async getAlertRules(): Promise<AlertRule[]> {
    return [...this.alertRules];
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    const ruleIndex = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) return;

    this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
    await this.saveToStorage();
  }

  async createAlertRule(rule: Omit<AlertRule, 'id'>): Promise<void> {
    const newRule: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.alertRules.push(newRule);
    await this.saveToStorage();
  }

  async deleteAlertRule(ruleId: string): Promise<void> {
    this.alertRules = this.alertRules.filter(rule => rule.id !== ruleId);
    await this.saveToStorage();
  }

  async getAlerts(limit: number = 50): Promise<Alert[]> {
    return this.alerts.slice(0, limit);
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alertIndex = this.alerts.findIndex(alert => alert.id === alertId);
    if (alertIndex === -1) return;

    this.alerts[alertIndex].acknowledged = true;
    this.alerts[alertIndex].acknowledgedAt = new Date();
    await this.saveToStorage();
  }

  async getUnacknowledgedAlerts(): Promise<Alert[]> {
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    return { ...this.preferences };
  }

  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...preferences };
    await this.saveToStorage();
  }

  // Manual alert checking (for testing or immediate checks)
  async checkAlertsNow(): Promise<void> {
    await this.checkAlerts();
  }

  // Cleanup
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Export singleton instance
export const alertService = AlertService.getInstance();