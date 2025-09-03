import { Alert, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  SYNC = 'SYNC',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  PERMISSION = 'PERMISSION',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Error interface
export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  deviceId?: string;
  appVersion?: string;
}

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Array<(error: AppError) => void> = [];
  private errorQueue: AppError[] = [];
  private maxQueueSize = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle different types of errors
  async handleError(error: Error | AppError, context?: Record<string, any>): Promise<void> {
    const appError = this.normalizeError(error, context);

    // Log error
    this.logError(appError);

    // Add to queue for potential sync
    this.addToErrorQueue(appError);

    // Notify listeners
    this.notifyListeners(appError);

    // Handle error based on type and severity
    await this.handleErrorByType(appError);
  }

  // Normalize error to AppError format
  private normalizeError(error: Error | AppError, context?: Record<string, any>): AppError {
    if (this.isAppError(error)) {
      return {
        ...error,
        context: { ...error.context, ...context },
      };
    }

    // Determine error type from error message/content
    const errorType = this.determineErrorType(error);
    const severity = this.determineSeverity(error, errorType);

    return {
      type: errorType,
      severity,
      message: error.message || 'An unknown error occurred',
      originalError: error,
      context,
      timestamp: new Date(),
      deviceId: this.getDeviceId(),
      appVersion: this.getAppVersion(),
    };
  }

  // Determine error type from error content
  private determineErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return ErrorType.NETWORK;
    }

    if (message.includes('database') || message.includes('sqlite') || message.includes('watermelon')) {
      return ErrorType.DATABASE;
    }

    if (message.includes('sync') || message.includes('conflict') || message.includes('merge')) {
      return ErrorType.SYNC;
    }

    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorType.VALIDATION;
    }

    if (message.includes('auth') || message.includes('token') || message.includes('unauthorized')) {
      return ErrorType.AUTHENTICATION;
    }

    if (message.includes('permission') || message.includes('denied') || message.includes('access')) {
      return ErrorType.PERMISSION;
    }

    return ErrorType.UNKNOWN;
  }

  // Determine error severity
  private determineSeverity(error: Error, type: ErrorType): ErrorSeverity {
    // Network errors in offline-first app are usually low severity
    if (type === ErrorType.NETWORK) {
      return ErrorSeverity.LOW;
    }

    // Database errors are usually high severity
    if (type === ErrorType.DATABASE) {
      return ErrorSeverity.HIGH;
    }

    // Authentication errors are critical
    if (type === ErrorType.AUTHENTICATION) {
      return ErrorSeverity.CRITICAL;
    }

    // Validation errors are low severity
    if (type === ErrorType.VALIDATION) {
      return ErrorSeverity.LOW;
    }

    // Default to medium
    return ErrorSeverity.MEDIUM;
  }

  // Handle error based on type
  private async handleErrorByType(error: AppError): Promise<void> {
    switch (error.type) {
      case ErrorType.NETWORK:
        await this.handleNetworkError(error);
        break;
      case ErrorType.DATABASE:
        await this.handleDatabaseError(error);
        break;
      case ErrorType.SYNC:
        await this.handleSyncError(error);
        break;
      case ErrorType.VALIDATION:
        await this.handleValidationError(error);
        break;
      case ErrorType.AUTHENTICATION:
        await this.handleAuthenticationError(error);
        break;
      case ErrorType.PERMISSION:
        await this.handlePermissionError(error);
        break;
      default:
        await this.handleUnknownError(error);
    }
  }

  // Network error handler
  private async handleNetworkError(error: AppError): Promise<void> {
    // Check current network status
    const networkState = await NetInfo.fetch();

    if (!networkState.isConnected) {
      // User is offline - show offline message
      this.showOfflineMessage();
    } else {
      // Network issue - show retry option
      this.showNetworkErrorMessage(error);
    }
  }

  // Database error handler
  private async handleDatabaseError(error: AppError): Promise<void> {
    if (error.severity === ErrorSeverity.CRITICAL) {
      // Critical database error - show alert and suggest restart
      Alert.alert(
        'Database Error',
        'A critical database error occurred. The app may need to be restarted.',
        [
          { text: 'Restart App', onPress: () => this.restartApp() },
          { text: 'Report Issue', onPress: () => this.reportError(error) },
        ]
      );
    } else {
      // Non-critical - show user-friendly message
      Alert.alert(
        'Data Error',
        'There was an issue with data storage. Your data is safe.',
        [{ text: 'OK' }]
      );
    }
  }

  // Sync error handler
  private async handleSyncError(error: AppError): Promise<void> {
    if (error.message.includes('conflict')) {
      // Handle sync conflicts
      Alert.alert(
        'Sync Conflict',
        'Some data could not be synchronized due to conflicts. Please review and resolve.',
        [
          { text: 'Review Conflicts', onPress: () => this.navigateToConflicts() },
          { text: 'Retry Later', style: 'cancel' },
        ]
      );
    } else {
      // General sync error
      Alert.alert(
        'Sync Error',
        'Failed to synchronize data. Will retry automatically.',
        [{ text: 'OK' }]
      );
    }
  }

  // Validation error handler
  private async handleValidationError(error: AppError): Promise<void> {
    // Validation errors are usually handled by forms
    // Just log for monitoring
    console.warn('Validation error:', error);
  }

  // Authentication error handler
  private async handleAuthenticationError(error: AppError): Promise<void> {
    Alert.alert(
      'Authentication Error',
      'Your session has expired. Please log in again.',
      [
        { text: 'Log In', onPress: () => this.navigateToLogin() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  // Permission error handler
  private async handlePermissionError(error: AppError): Promise<void> {
    Alert.alert(
      'Permission Required',
      'This feature requires additional permissions. Please check your app settings.',
      [
        { text: 'Open Settings', onPress: () => this.openAppSettings() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  // Unknown error handler
  private async handleUnknownError(error: AppError): Promise<void> {
    Alert.alert(
      'Unexpected Error',
      'An unexpected error occurred. Please try again.',
      [
        { text: 'Retry', onPress: () => this.retryLastAction() },
        { text: 'Report', onPress: () => this.reportError(error) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  // UI helper methods
  private showOfflineMessage(): void {
    Alert.alert(
      'Offline',
      'You are currently offline. Some features may be limited.',
      [{ text: 'OK' }]
    );
  }

  private showNetworkErrorMessage(error: AppError): void {
    Alert.alert(
      'Connection Error',
      'Unable to connect to the server. Please check your internet connection.',
      [
        { text: 'Retry', onPress: () => this.retryLastAction() },
        { text: 'OK', style: 'cancel' },
      ]
    );
  }

  // Utility methods
  private isAppError(error: any): error is AppError {
    return error && typeof error.type === 'string' && typeof error.severity === 'string';
  }

  private getDeviceId(): string {
    // In a real app, get from device info
    return 'device-12345';
  }

  private getAppVersion(): string {
    // In a real app, get from package.json or native code
    return '1.0.0';
  }

  private logError(error: AppError): void {
    const logData = {
      timestamp: error.timestamp.toISOString(),
      type: error.type,
      severity: error.severity,
      message: error.message,
      context: error.context,
      userId: error.userId,
      deviceId: error.deviceId,
      appVersion: error.appVersion,
    };

    console.error('App Error:', logData);

    // In a real app, you might send to error reporting service
    // this.sendToErrorReporting(logData);
  }

  private addToErrorQueue(error: AppError): void {
    this.errorQueue.push(error);

    // Keep queue size manageable
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  // Public methods
  addErrorListener(listener: (error: AppError) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  getErrorQueue(): AppError[] {
    return [...this.errorQueue];
  }

  clearErrorQueue(): void {
    this.errorQueue = [];
  }

  // Placeholder methods for navigation/actions
  private restartApp(): void {
    // In a real app, implement app restart logic
    console.log('Restarting app...');
  }

  private navigateToConflicts(): void {
    // In a real app, navigate to conflicts screen
    console.log('Navigating to conflicts screen...');
  }

  private navigateToLogin(): void {
    // In a real app, navigate to login screen
    console.log('Navigating to login screen...');
  }

  private openAppSettings(): void {
    // In a real app, open app settings
    console.log('Opening app settings...');
  }

  private retryLastAction(): void {
    // In a real app, retry the last failed action
    console.log('Retrying last action...');
  }

  private reportError(error: AppError): void {
    // In a real app, send error report
    console.log('Reporting error:', error);
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Convenience functions
export const handleError = (error: Error | AppError, context?: Record<string, any>) =>
  errorHandler.handleError(error, context);

export const createAppError = (
  type: ErrorType,
  message: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context?: Record<string, any>
): AppError => ({
  type,
  severity,
  message,
  context,
  timestamp: new Date(),
  deviceId: errorHandler['getDeviceId'](),
  appVersion: errorHandler['getAppVersion'](),
});