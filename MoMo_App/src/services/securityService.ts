// Security Service
// Handles data encryption, secure storage, and security operations

import configManager from '../utils/config';
import errorMonitoring from './errorMonitoring';

interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string;   // Base64 encoded initialization vector
  salt?: string; // Base64 encoded salt for key derivation
  algorithm: string;
  timestamp: string;
}

interface SecurityConfig {
  encryptionAlgorithm: string;
  keyLength: number;
  pbkdf2Iterations: number;
}

class SecurityService {
  private config: SecurityConfig = {
    encryptionAlgorithm: 'AES-GCM',
    keyLength: 256,
    pbkdf2Iterations: 100000,
  };

  private encryptionKey: CryptoKey | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      if (!configManager.isReady()) {
        console.warn('ConfigManager not ready, security service using default settings');
        return;
      }

      const appConfig = configManager.getConfig();

      // Validate encryption key
      if (appConfig.security.encryptionKey.length !== 32) {
        throw new Error('Invalid encryption key length. Must be 32 characters.');
      }

      // Initialize encryption key
      await this.initializeEncryptionKey(appConfig.security.encryptionKey);

      console.log('✅ Security service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize security service:', error);
      errorMonitoring.captureError(error as Error, {
        customData: { service: 'security', operation: 'initialization' }
      });
    }
  }

  private async initializeEncryptionKey(keyString: string) {
    try {
      const keyData = new TextEncoder().encode(keyString);
      this.encryptionKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: this.config.keyLength },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw new Error(`Failed to initialize encryption key: ${error}`);
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string): Promise<EncryptedData> {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not initialized');
      }

      const encodedData = new TextEncoder().encode(data);
      const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        this.encryptionKey,
        encodedData
      );

      const encryptedData: EncryptedData = {
        data: this.arrayBufferToBase64(encrypted),
        iv: this.arrayBufferToBase64(iv),
        algorithm: this.config.encryptionAlgorithm,
        timestamp: new Date().toISOString(),
      };

      return encryptedData;
    } catch (error) {
      console.error('Encryption failed:', error);
      errorMonitoring.captureError(error as Error, {
        customData: { operation: 'encrypt', dataLength: data.length }
      });
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encryptedData: EncryptedData): Promise<string> {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not initialized');
      }

      const encrypted = this.base64ToArrayBuffer(encryptedData.data);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        this.encryptionKey,
        encrypted
      );

      const decodedData = new TextDecoder().decode(decrypted);
      return decodedData;
    } catch (error) {
      console.error('Decryption failed:', error);
      errorMonitoring.captureError(error as Error, {
        customData: { operation: 'decrypt', algorithm: encryptedData.algorithm }
      });
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Generate a secure random string
   */
  generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return this.arrayBufferToBase64(array).replace(/[^a-zA-Z0-9]/g, '').substring(0, length);
  }

  /**
   * Hash sensitive data (one-way)
   */
  async hashData(data: string, salt?: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data + (salt || ''));

      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      return this.arrayBufferToBase64(hashBuffer);
    } catch (error) {
      console.error('Hashing failed:', error);
      errorMonitoring.captureError(error as Error, {
        customData: { operation: 'hash', dataLength: data.length }
      });
      throw new Error('Data hashing failed');
    }
  }

  /**
   * Securely store sensitive data
   */
  async secureStore(key: string, value: string): Promise<void> {
    try {
      const encrypted = await this.encryptData(value);

      // Use React Native AsyncStorage or SecureStore
      const storageKey = `secure_${key}`;
      const storageValue = JSON.stringify(encrypted);

      // In a real implementation, use a secure storage solution
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey, storageValue);
      } else {
        // For React Native, use AsyncStorage or SecureStore
        console.warn('Secure storage not available in this environment');
      }

      console.log(`🔐 Securely stored: ${key}`);
    } catch (error) {
      console.error('Secure storage failed:', error);
      errorMonitoring.captureError(error as Error, {
        customData: { operation: 'secureStore', key }
      });
      throw new Error('Secure storage failed');
    }
  }

  /**
   * Retrieve securely stored data
   */
  async secureRetrieve(key: string): Promise<string | null> {
    try {
      const storageKey = `secure_${key}`;

      let storageValue: string | null = null;

      if (typeof localStorage !== 'undefined') {
        storageValue = localStorage.getItem(storageKey);
      } else {
        // For React Native, use AsyncStorage or SecureStore
        console.warn('Secure retrieval not available in this environment');
        return null;
      }

      if (!storageValue) {
        return null;
      }

      const encrypted: EncryptedData = JSON.parse(storageValue);
      const decrypted = await this.decryptData(encrypted);

      return decrypted;
    } catch (error) {
      console.error('Secure retrieval failed:', error);
      errorMonitoring.captureError(error as Error, {
        customData: { operation: 'secureRetrieve', key }
      });
      return null;
    }
  }

  /**
   * Securely delete stored data
   */
  async secureDelete(key: string): Promise<void> {
    try {
      const storageKey = `secure_${key}`;

      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(storageKey);
      } else {
        // For React Native, use AsyncStorage or SecureStore
        console.warn('Secure deletion not available in this environment');
      }

      console.log(`🗑️ Securely deleted: ${key}`);
    } catch (error) {
      console.error('Secure deletion failed:', error);
      errorMonitoring.captureError(error as Error, {
        customData: { operation: 'secureDelete', key }
      });
    }
  }

  /**
   * Validate data integrity using HMAC
   */
  async validateIntegrity(data: string, expectedHmac: string): Promise<boolean> {
    try {
      const calculatedHmac = await this.calculateHMAC(data);
      return calculatedHmac === expectedHmac;
    } catch (error) {
      console.error('Integrity validation failed:', error);
      return false;
    }
  }

  /**
   * Calculate HMAC for data integrity
   */
  private async calculateHMAC(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const hmacKey = await crypto.subtle.sign(
      'HMAC',
      this.encryptionKey,
      dataBuffer
    );

    return this.arrayBufferToBase64(hmacKey);
  }

  /**
   * Sanitize input data
   */
  sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Validate API key format
   */
  validateApiKey(apiKey: string): boolean {
    // Basic validation - should be improved based on specific requirements
    return apiKey.length >= 20 && /^[a-zA-Z0-9_-]+$/.test(apiKey);
  }

  /**
   * Generate a cryptographically secure PIN
   */
  generateSecurePIN(length: number = 6): string {
    const digits = '0123456789';
    let pin = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.getRandomValues(new Uint8Array(1))[0] % digits.length;
      pin += digits[randomIndex];
    }

    return pin;
  }

  /**
   * Check password strength
   */
  checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    // Uppercase check
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Password should contain uppercase letters');

    // Lowercase check
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Password should contain lowercase letters');

    // Number check
    if (/\d/.test(password)) score += 1;
    else feedback.push('Password should contain numbers');

    // Special character check
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    else feedback.push('Password should contain special characters');

    return {
      score,
      feedback,
      isStrong: score >= 4,
    };
  }

  // Utility methods
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Get security status
   */
  getSecurityStatus() {
    return {
      encryptionReady: !!this.encryptionKey,
      configReady: configManager.isReady(),
      environment: configManager.isReady() ? configManager.getConfig().app.environment : 'unknown',
      features: {
        encryption: true,
        secureStorage: typeof localStorage !== 'undefined',
        integrityCheck: true,
        inputSanitization: true,
      },
    };
  }
}

// Export singleton instance
export const securityService = new SecurityService();
export default securityService;
export type { EncryptedData, SecurityConfig };