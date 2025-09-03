import { database } from '../database';
import { TransactionModel } from '../database/models/Transaction';
import { Q } from '@nozbe/watermelondb';
import { subDays, startOfDay, endOfDay, format, parseISO } from 'date-fns';

export interface KPIMetrics {
  // Financial Metrics
  totalRevenue: number;
  totalCommission: number;
  netIncome: number;
  averageTransactionValue: number;

  // Transaction Metrics
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;

  // Performance Metrics
  transactionsPerDay: number;
  revenuePerDay: number;
  commissionPerDay: number;
  growthRate: number;

  // Customer Metrics
  uniqueCustomers: number;
  repeatCustomers: number;
  newCustomersToday: number;

  // Time-based Metrics
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  todayTransactions: number;
  weekTransactions: number;
  monthTransactions: number;
}

export interface TrendData {
  date: string;
  revenue: number;
  transactions: number;
  commission: number;
  customers: number;
}

export interface PredictiveMetrics {
  predictedRevenue: number;
  predictedTransactions: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  nextWeekPrediction: number;
  cashFlowProjection: Array<{
    date: string;
    predictedAmount: number;
    confidence: number;
  }>;
}

export interface AlertThresholds {
  lowBalance: number;
  highTransactionVolume: number;
  unusualActivity: number;
  dailyRevenueTarget: number;
  weeklyRevenueTarget: number;
  monthlyRevenueTarget: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // Calculate comprehensive KPI metrics
  async calculateKPIs(userId: string, merchantId?: string): Promise<KPIMetrics> {
    const cacheKey = `kpis_${userId}_${merchantId || 'all'}`;

    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Get all transactions for the user
      const transactions = await this.getTransactionsForUser(userId, merchantId);

      // Calculate basic metrics
      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
      const totalCommission = transactions.reduce((sum, t) => sum + (t.commission || 0), 0);
      const netIncome = totalRevenue - totalCommission;

      // Transaction counts
      const totalTransactions = transactions.length;
      const successfulTransactions = transactions.filter(t => t.syncStatus === 'synced').length;
      const failedTransactions = transactions.filter(t => t.syncStatus === 'error').length;
      const pendingTransactions = transactions.filter(t => t.syncStatus === 'pending').length;

      // Performance metrics
      const daysActive = this.calculateDaysActive(transactions);
      const transactionsPerDay = daysActive > 0 ? totalTransactions / daysActive : 0;
      const revenuePerDay = daysActive > 0 ? totalRevenue / daysActive : 0;
      const commissionPerDay = daysActive > 0 ? totalCommission / daysActive : 0;

      // Growth rate (comparing last 7 days to previous 7 days)
      const growthRate = await this.calculateGrowthRate(userId, merchantId);

      // Customer metrics
      const uniqueCustomers = this.calculateUniqueCustomers(transactions);
      const repeatCustomers = this.calculateRepeatCustomers(transactions);
      const newCustomersToday = await this.calculateNewCustomersToday(userId, merchantId);

      // Time-based metrics
      const todayRevenue = await this.calculatePeriodRevenue(userId, merchantId, 1);
      const weekRevenue = await this.calculatePeriodRevenue(userId, merchantId, 7);
      const monthRevenue = await this.calculatePeriodRevenue(userId, merchantId, 30);
      const todayTransactions = await this.calculatePeriodTransactions(userId, merchantId, 1);
      const weekTransactions = await this.calculatePeriodTransactions(userId, merchantId, 7);
      const monthTransactions = await this.calculatePeriodTransactions(userId, merchantId, 30);

      const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      const metrics: KPIMetrics = {
        totalRevenue,
        totalCommission,
        netIncome,
        averageTransactionValue,
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        pendingTransactions,
        transactionsPerDay,
        revenuePerDay,
        commissionPerDay,
        growthRate,
        uniqueCustomers,
        repeatCustomers,
        newCustomersToday,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        todayTransactions,
        weekTransactions,
        monthTransactions,
      };

      // Cache the results
      this.setCachedData(cacheKey, metrics);

      return metrics;
    } catch (error) {
      console.error('Error calculating KPIs:', error);
      throw error;
    }
  }

  // Get trend data for charts
  async getTrendData(userId: string, merchantId?: string, days: number = 30): Promise<TrendData[]> {
    const cacheKey = `trends_${userId}_${merchantId || 'all'}_${days}`;

    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const trends: TrendData[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const dayTransactions = await database.get<TransactionModel>('transactions')
          .query(
            Q.where('user_id', userId),
            merchantId ? Q.where('merchant_id', merchantId) : Q,
            Q.where('created_at', Q.gte(dayStart.getTime())),
            Q.where('created_at', Q.lte(dayEnd.getTime())),
            Q.where('sync_status', 'synced')
          )
          .fetch();

        const revenue = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
        const commission = dayTransactions.reduce((sum, t) => sum + (t.commission || 0), 0);
        const customers = new Set(dayTransactions.map(t => t.customerNumber || t.customerName)).size;

        trends.push({
          date: format(date, 'yyyy-MM-dd'),
          revenue,
          transactions: dayTransactions.length,
          commission,
          customers,
        });
      }

      this.setCachedData(cacheKey, trends);
      return trends;
    } catch (error) {
      console.error('Error getting trend data:', error);
      throw error;
    }
  }

  // Calculate predictive analytics
  async calculatePredictions(userId: string, merchantId?: string): Promise<PredictiveMetrics> {
    try {
      // Get historical data for the last 30 days
      const historicalData = await this.getTrendData(userId, merchantId, 30);

      if (historicalData.length < 7) {
        return {
          predictedRevenue: 0,
          predictedTransactions: 0,
          confidence: 0,
          trend: 'stable',
          nextWeekPrediction: 0,
          cashFlowProjection: [],
        };
      }

      // Simple linear regression for prediction
      const { slope: revenueSlope, intercept: revenueIntercept } = this.linearRegression(
        historicalData.map((d, i) => [i, d.revenue])
      );

      const { slope: transactionSlope, intercept: transactionIntercept } = this.linearRegression(
        historicalData.map((d, i) => [i, d.transactions])
      );

      // Predict next 7 days
      const predictions = [];
      for (let i = 1; i <= 7; i++) {
        const dayIndex = historicalData.length + i - 1;
        const predictedRevenue = Math.max(0, revenueSlope * dayIndex + revenueIntercept);
        const predictedTransactions = Math.max(0, transactionSlope * dayIndex + transactionIntercept);

        predictions.push({
          date: format(new Date(Date.now() + i * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
          predictedAmount: predictedRevenue,
          confidence: Math.min(0.95, Math.max(0.1, 1 - Math.abs(revenueSlope) / 1000)), // Simplified confidence
        });
      }

      const nextWeekPrediction = predictions.reduce((sum, p) => sum + p.predictedAmount, 0);
      const trend = revenueSlope > 50 ? 'increasing' : revenueSlope < -50 ? 'decreasing' : 'stable';

      return {
        predictedRevenue: predictions[0]?.predictedAmount || 0,
        predictedTransactions: Math.round(transactionSlope * (historicalData.length) + transactionIntercept),
        confidence: 0.75, // Simplified confidence calculation
        trend,
        nextWeekPrediction,
        cashFlowProjection: predictions,
      };
    } catch (error) {
      console.error('Error calculating predictions:', error);
      throw error;
    }
  }

  // Check if metrics exceed alert thresholds
  async checkAlerts(userId: string, merchantId?: string, thresholds: AlertThresholds): Promise<Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    value: number;
    threshold: number;
  }>> {
    const alerts = [];
    const metrics = await this.calculateKPIs(userId, merchantId);

    // Low balance alert
    if (metrics.netIncome < thresholds.lowBalance) {
      alerts.push({
        type: 'low_balance',
        message: `Net income is below threshold: GHS ${metrics.netIncome.toFixed(2)}`,
        severity: 'high',
        value: metrics.netIncome,
        threshold: thresholds.lowBalance,
      });
    }

    // High transaction volume alert
    if (metrics.todayTransactions > thresholds.highTransactionVolume) {
      alerts.push({
        type: 'high_volume',
        message: `High transaction volume today: ${metrics.todayTransactions} transactions`,
        severity: 'medium',
        value: metrics.todayTransactions,
        threshold: thresholds.highTransactionVolume,
      });
    }

    // Revenue target alerts
    if (metrics.todayRevenue < thresholds.dailyRevenueTarget) {
      alerts.push({
        type: 'daily_target',
        message: `Daily revenue target not met: GHS ${metrics.todayRevenue.toFixed(2)} / GHS ${thresholds.dailyRevenueTarget.toFixed(2)}`,
        severity: 'medium',
        value: metrics.todayRevenue,
        threshold: thresholds.dailyRevenueTarget,
      });
    }

    return alerts;
  }

  // Private helper methods
  private async getTransactionsForUser(userId: string, merchantId?: string): Promise<TransactionModel[]> {
    const query = [
      Q.where('user_id', userId),
      Q.where('sync_status', Q.oneOf(['synced', 'pending'])),
    ];

    if (merchantId) {
      query.push(Q.where('merchant_id', merchantId));
    }

    return await database.get<TransactionModel>('transactions')
      .query(...query)
      .fetch();
  }

  private calculateDaysActive(transactions: TransactionModel[]): number {
    if (transactions.length === 0) return 1;

    const dates = transactions.map(t => startOfDay(new Date(t.createdAt)).getTime());
    const uniqueDates = new Set(dates);
    return uniqueDates.size;
  }

  private calculateUniqueCustomers(transactions: TransactionModel[]): number {
    const customers = new Set(
      transactions
        .map(t => t.customerNumber || t.customerName)
        .filter(Boolean)
    );
    return customers.size;
  }

  private calculateRepeatCustomers(transactions: TransactionModel[]): number {
    const customerCounts = new Map<string, number>();

    transactions.forEach(t => {
      const customerId = t.customerNumber || t.customerName;
      if (customerId) {
        customerCounts.set(customerId, (customerCounts.get(customerId) || 0) + 1);
      }
    });

    return Array.from(customerCounts.values()).filter(count => count > 1).length;
  }

  private async calculateNewCustomersToday(userId: string, merchantId?: string): Promise<number> {
    const today = new Date();
    const todayStart = startOfDay(today);
    const yesterdayStart = startOfDay(subDays(today, 1));

    const [todayTransactions, previousTransactions] = await Promise.all([
      database.get<TransactionModel>('transactions')
        .query(
          Q.where('user_id', userId),
          merchantId ? Q.where('merchant_id', merchantId) : Q,
          Q.where('created_at', Q.gte(todayStart.getTime())),
          Q.where('sync_status', 'synced')
        )
        .fetch(),
      database.get<TransactionModel>('transactions')
        .query(
          Q.where('user_id', userId),
          merchantId ? Q.where('merchant_id', merchantId) : Q,
          Q.where('created_at', Q.lt(todayStart.getTime())),
          Q.where('sync_status', 'synced')
        )
        .fetch(),
    ]);

    const todayCustomers = new Set(
      todayTransactions
        .map(t => t.customerNumber || t.customerName)
        .filter(Boolean)
    );

    const previousCustomers = new Set(
      previousTransactions
        .map(t => t.customerNumber || t.customerName)
        .filter(Boolean)
    );

    return Array.from(todayCustomers).filter(customer => !previousCustomers.has(customer)).length;
  }

  private async calculatePeriodRevenue(userId: string, merchantId?: string, days: number): Promise<number> {
    const startDate = startOfDay(subDays(new Date(), days - 1));

    const transactions = await database.get<TransactionModel>('transactions')
      .query(
        Q.where('user_id', userId),
        merchantId ? Q.where('merchant_id', merchantId) : Q,
        Q.where('created_at', Q.gte(startDate.getTime())),
        Q.where('sync_status', 'synced')
      )
      .fetch();

    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }

  private async calculatePeriodTransactions(userId: string, merchantId?: string, days: number): Promise<number> {
    const startDate = startOfDay(subDays(new Date(), days - 1));

    const count = await database.get<TransactionModel>('transactions')
      .query(
        Q.where('user_id', userId),
        merchantId ? Q.where('merchant_id', merchantId) : Q,
        Q.where('created_at', Q.gte(startDate.getTime())),
        Q.where('sync_status', 'synced')
      )
      .fetchCount();

    return count;
  }

  private async calculateGrowthRate(userId: string, merchantId?: string): Promise<number> {
    const [currentWeek, previousWeek] = await Promise.all([
      this.calculatePeriodRevenue(userId, merchantId, 7),
      this.calculatePeriodRevenue(userId, merchantId, 14) - this.calculatePeriodRevenue(userId, merchantId, 7),
    ]);

    if (previousWeek === 0) return 0;
    return ((currentWeek - previousWeek) / previousWeek) * 100;
  }

  private linearRegression(data: [number, number][]): { slope: number; intercept: number } {
    const n = data.length;
    if (n === 0) return { slope: 0, intercept: 0 };

    const sumX = data.reduce((sum, [x]) => sum + x, 0);
    const sumY = data.reduce((sum, [, y]) => sum + y, 0);
    const sumXY = data.reduce((sum, [x, y]) => sum + x * y, 0);
    const sumXX = data.reduce((sum, [x]) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();