import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';
import { analyticsService, KPIMetrics } from '../../services/analytics';
import { useBalanceStore } from '../../stores/balanceStore';
import AnimatedCard from '../ui/AnimatedCard';
import AnimatedSpinner from '../ui/AnimatedSpinner';
import { colors, semanticColors } from '../../theme/colors';

const { width } = Dimensions.get('window');

interface MainDashboardProps {
  userId: string;
  merchantId?: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  delay: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  delay,
  trend,
}) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `GHS ${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `GHS ${(val / 1000).toFixed(1)}K`;
      } else {
        return `GHS ${val.toFixed(2)}`;
      }
    }
    return val.toString();
  };

  return (
    <Animated.View entering={FadeInUp.delay(delay)} layout={Layout.springify()}>
      <AnimatedCard variant="scale" delay={delay + 100} style={styles.kpiCard}>
        <View style={styles.kpiHeader}>
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <Text style={[styles.icon, { color }]}>{icon}</Text>
          </View>
          {trend && (
            <View style={styles.trendContainer}>
              <Text style={[styles.trendText, { color: trend.isPositive ? semanticColors.success : semanticColors.error }]}>
                {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.kpiContent}>
          <Text style={styles.kpiValue}>{formatValue(value)}</Text>
          <Text style={styles.kpiTitle}>{title}</Text>
          {subtitle && <Text style={styles.kpiSubtitle}>{subtitle}</Text>}
        </View>
      </AnimatedCard>
    </Animated.View>
  );
};

export const MainDashboard: React.FC<MainDashboardProps> = ({ userId, merchantId }) => {
  const [kpiData, setKpiData] = useState<KPIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentBalance, availableBalance, refreshBalance } = useBalanceStore();

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [kpis] = await Promise.all([
        analyticsService.calculateKPIs(userId, merchantId),
        refreshBalance(),
      ]);
      setKpiData(kpis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [userId, merchantId, refreshBalance]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    analyticsService.clearCache(); // Clear analytics cache
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  // Load data when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading && !kpiData) {
    return (
      <View style={styles.loadingContainer}>
        <AnimatedSpinner size="large" variant="bounce" color={semanticColors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (error && !kpiData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>Failed to load dashboard</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <AnimatedCard variant="fadeIn" delay={300}>
          <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </AnimatedCard>
      </View>
    );
  }

  const data = kpiData!;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[semanticColors.primary]}
          tintColor={semanticColors.primary}
          title="Refreshing dashboard..."
          titleColor={colors.text.secondary}
        />
      }
    >
      {/* Header */}
      <Animated.View entering={FadeInDown} style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Business Overview</Text>
      </Animated.View>

      {/* Balance Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Balance Overview</Text>
        <View style={styles.balanceGrid}>
          <KPICard
            title="Current Balance"
            value={currentBalance}
            subtitle="Available funds"
            icon="💰"
            color={semanticColors.success}
            delay={200}
          />
          <KPICard
            title="Available Balance"
            value={availableBalance}
            subtitle="Spendable amount"
            icon="✅"
            color={semanticColors.primary}
            delay={300}
          />
        </View>
      </View>

      {/* Today's Performance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Performance</Text>
        <View style={styles.performanceGrid}>
          <KPICard
            title="Today's Revenue"
            value={data.todayRevenue}
            subtitle={`${data.todayTransactions} transactions`}
            icon="📈"
            color={semanticColors.success}
            delay={400}
          />
          <KPICard
            title="Avg Transaction"
            value={data.averageTransactionValue}
            subtitle="Per transaction"
            icon="📊"
            color={semanticColors.primary}
            delay={500}
          />
        </View>
      </View>

      {/* Weekly Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.weeklyGrid}>
          <KPICard
            title="Weekly Revenue"
            value={data.weekRevenue}
            subtitle={`${data.weekTransactions} transactions`}
            icon="📅"
            color={semanticColors.secondary}
            delay={600}
            trend={{
              value: data.growthRate,
              isPositive: data.growthRate >= 0,
            }}
          />
          <KPICard
            title="Commission Earned"
            value={data.totalCommission}
            subtitle="This week"
            icon="💼"
            color={colors.warning[500]}
            delay={700}
          />
        </View>
      </View>

      {/* Business Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Metrics</Text>
        <View style={styles.metricsGrid}>
          <KPICard
            title="Total Customers"
            value={data.uniqueCustomers}
            subtitle={`${data.repeatCustomers} repeat customers`}
            icon="👥"
            color={semanticColors.primary}
            delay={800}
          />
          <KPICard
            title="Success Rate"
            value={`${data.totalTransactions > 0 ? ((data.successfulTransactions / data.totalTransactions) * 100).toFixed(1) : 0}%`}
            subtitle={`${data.successfulTransactions}/${data.totalTransactions} transactions`}
            icon="🎯"
            color={semanticColors.success}
            delay={900}
          />
          <KPICard
            title="Transactions/Day"
            value={data.transactionsPerDay.toFixed(1)}
            subtitle="Average daily volume"
            icon="⚡"
            color={semanticColors.secondary}
            delay={1000}
          />
          <KPICard
            title="Revenue/Day"
            value={data.revenuePerDay}
            subtitle="Daily average"
            icon="💹"
            color={semanticColors.success}
            delay={1100}
          />
        </View>
      </View>

      {/* Growth Indicators */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Growth Indicators</Text>
        <View style={styles.growthGrid}>
          <KPICard
            title="Growth Rate"
            value={`${data.growthRate >= 0 ? '+' : ''}${data.growthRate.toFixed(1)}%`}
            subtitle="vs last week"
            icon={data.growthRate >= 0 ? "📈" : "📉"}
            color={data.growthRate >= 0 ? semanticColors.success : semanticColors.error}
            delay={1200}
          />
          <KPICard
            title="New Customers"
            value={data.newCustomersToday}
            subtitle="Joined today"
            icon="🎉"
            color={semanticColors.primary}
            delay={1300}
          />
        </View>
      </View>

      {/* Footer */}
      <Animated.View entering={FadeInUp.delay(1400)} style={styles.footer}>
        <Text style={styles.footerText}>
          Last updated: {new Date().toLocaleTimeString('en-GH', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.background.secondary,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: semanticColors.error,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: semanticColors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  balanceGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  performanceGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  weeklyGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  growthGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: width * 0.4,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: colors.shadow.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
  trendContainer: {
    alignItems: 'flex-end',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  kpiContent: {
    flex: 1,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  kpiTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  kpiSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
});

export default MainDashboard;