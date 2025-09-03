import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { PieChart, ProgressChart } from 'react-native-chart-kit';
import Animated, { FadeInUp, FadeInLeft } from 'react-native-reanimated';
import { KPIMetrics } from '../../services/analytics';
import AnimatedCard from '../ui/AnimatedCard';
import { colors, semanticColors } from '../../theme/colors';

const { width } = Dimensions.get('window');

interface RevenueAnalyticsChartProps {
  kpiData: KPIMetrics;
  title?: string;
}

export const RevenueAnalyticsChart: React.FC<RevenueAnalyticsChartProps> = ({
  kpiData,
  title = 'Revenue Analytics',
}) => {
  const pieChartData = useMemo(() => {
    const total = kpiData.totalRevenue + kpiData.totalCommission;
    if (total === 0) return [];

    return [
      {
        name: 'Revenue',
        amount: kpiData.totalRevenue,
        color: semanticColors.success,
        legendFontColor: colors.text.primary,
        legendFontSize: 14,
      },
      {
        name: 'Commission',
        amount: kpiData.totalCommission,
        color: colors.warning[500],
        legendFontColor: colors.text.primary,
        legendFontSize: 14,
      },
    ];
  }, [kpiData]);

  const progressChartData = useMemo(() => {
    const maxRevenue = Math.max(kpiData.todayRevenue, kpiData.weekRevenue, kpiData.monthRevenue);
    if (maxRevenue === 0) return { labels: [], data: [] };

    return {
      labels: ['Today', 'This Week', 'This Month'],
      data: [
        kpiData.todayRevenue / maxRevenue,
        kpiData.weekRevenue / maxRevenue,
        kpiData.monthRevenue / maxRevenue,
      ],
    };
  }, [kpiData]);

  const chartConfig = {
    backgroundColor: colors.background.primary,
    backgroundGradientFrom: colors.background.primary,
    backgroundGradientTo: colors.background.primary,
    color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
    labelColor: (opacity = 1) => colors.text.secondary,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  const renderRevenueBreakdown = () => (
    <Animated.View entering={FadeInLeft.delay(200)} style={styles.breakdownSection}>
      <Text style={styles.sectionTitle}>Revenue Breakdown</Text>

      <View style={styles.breakdownGrid}>
        <AnimatedCard variant="scale" delay={300} style={styles.breakdownCard}>
          <Text style={styles.breakdownValue}>
            GHS {kpiData.totalRevenue.toLocaleString()}
          </Text>
          <Text style={styles.breakdownLabel}>Total Revenue</Text>
          <Text style={[styles.breakdownChange, { color: semanticColors.success }]}>
            +{kpiData.growthRate.toFixed(1)}% growth
          </Text>
        </AnimatedCard>

        <AnimatedCard variant="scale" delay={400} style={styles.breakdownCard}>
          <Text style={styles.breakdownValue}>
            GHS {kpiData.totalCommission.toLocaleString()}
          </Text>
          <Text style={styles.breakdownLabel}>Total Commission</Text>
          <Text style={styles.breakdownSubtext}>
            {((kpiData.totalCommission / Math.max(kpiData.totalRevenue, 1)) * 100).toFixed(1)}% of revenue
          </Text>
        </AnimatedCard>

        <AnimatedCard variant="scale" delay={500} style={styles.breakdownCard}>
          <Text style={styles.breakdownValue}>
            GHS {kpiData.netIncome.toLocaleString()}
          </Text>
          <Text style={styles.breakdownLabel}>Net Income</Text>
          <Text style={[styles.breakdownChange, {
            color: kpiData.netIncome >= 0 ? semanticColors.success : semanticColors.error
          }]}>
            {kpiData.netIncome >= 0 ? 'Profit' : 'Loss'}
          </Text>
        </AnimatedCard>

        <AnimatedCard variant="scale" delay={600} style={styles.breakdownCard}>
          <Text style={styles.breakdownValue}>
            GHS {kpiData.averageTransactionValue.toFixed(2)}
          </Text>
          <Text style={styles.breakdownLabel}>Avg Transaction</Text>
          <Text style={styles.breakdownSubtext}>
            Per transaction value
          </Text>
        </AnimatedCard>
      </View>
    </Animated.View>
  );

  const renderPieChart = () => {
    if (pieChartData.length === 0) {
      return (
        <AnimatedCard variant="fadeIn" style={styles.emptyChart}>
          <Text style={styles.emptyText}>No revenue data available</Text>
        </AnimatedCard>
      );
    }

    return (
      <Animated.View entering={FadeInUp.delay(100)} style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Revenue vs Commission</Text>
        <AnimatedCard variant="slideUp" delay={200} style={styles.chartCard}>
          <PieChart
            data={pieChartData}
            width={width - 80}
            height={200}
            chartConfig={chartConfig}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </AnimatedCard>
      </Animated.View>
    );
  };

  const renderProgressChart = () => (
    <Animated.View entering={FadeInUp.delay(300)} style={styles.chartSection}>
      <Text style={styles.sectionTitle}>Revenue Progress</Text>
      <AnimatedCard variant="slideUp" delay={400} style={styles.chartCard}>
        <ProgressChart
          data={progressChartData}
          width={width - 80}
          height={200}
          strokeWidth={12}
          radius={32}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => semanticColors.primary,
          }}
          hideLegend={false}
        />

        <View style={styles.progressLabels}>
          <View style={styles.progressLabel}>
            <Text style={styles.progressValue}>
              GHS {kpiData.todayRevenue.toLocaleString()}
            </Text>
            <Text style={styles.progressText}>Today</Text>
          </View>
          <View style={styles.progressLabel}>
            <Text style={styles.progressValue}>
              GHS {kpiData.weekRevenue.toLocaleString()}
            </Text>
            <Text style={styles.progressText}>This Week</Text>
          </View>
          <View style={styles.progressLabel}>
            <Text style={styles.progressValue}>
              GHS {kpiData.monthRevenue.toLocaleString()}
            </Text>
            <Text style={styles.progressText}>This Month</Text>
          </View>
        </View>
      </AnimatedCard>
    </Animated.View>
  );

  const renderPerformanceMetrics = () => (
    <Animated.View entering={FadeInLeft.delay(500)} style={styles.metricsSection}>
      <Text style={styles.sectionTitle}>Performance Metrics</Text>

      <View style={styles.metricsGrid}>
        <AnimatedCard variant="scale" delay={600} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricIcon}>📊</Text>
            <Text style={styles.metricTitle}>Success Rate</Text>
          </View>
          <Text style={styles.metricValue}>
            {kpiData.totalTransactions > 0
              ? ((kpiData.successfulTransactions / kpiData.totalTransactions) * 100).toFixed(1)
              : 0}%
          </Text>
          <Text style={styles.metricSubtext}>
            {kpiData.successfulTransactions}/{kpiData.totalTransactions} transactions
          </Text>
        </AnimatedCard>

        <AnimatedCard variant="scale" delay={700} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricIcon}>👥</Text>
            <Text style={styles.metricTitle}>Customers</Text>
          </View>
          <Text style={styles.metricValue}>
            {kpiData.uniqueCustomers}
          </Text>
          <Text style={styles.metricSubtext}>
            {kpiData.repeatCustomers} repeat customers
          </Text>
        </AnimatedCard>

        <AnimatedCard variant="scale" delay={800} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricIcon}>⚡</Text>
            <Text style={styles.metricTitle}>Daily Average</Text>
          </View>
          <Text style={styles.metricValue}>
            {kpiData.transactionsPerDay.toFixed(1)}
          </Text>
          <Text style={styles.metricSubtext}>
            Transactions per day
          </Text>
        </AnimatedCard>

        <AnimatedCard variant="scale" delay={900} style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Text style={styles.metricIcon}>📈</Text>
            <Text style={styles.metricTitle}>Growth Rate</Text>
          </View>
          <Text style={[styles.metricValue, {
            color: kpiData.growthRate >= 0 ? semanticColors.success : semanticColors.error
          }]}>
            {kpiData.growthRate >= 0 ? '+' : ''}{kpiData.growthRate.toFixed(1)}%
          </Text>
          <Text style={styles.metricSubtext}>
            vs last week
          </Text>
        </AnimatedCard>
      </View>
    </Animated.View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInUp} style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </Animated.View>

      {renderRevenueBreakdown()}
      {renderPieChart()}
      {renderProgressChart()}
      {renderPerformanceMetrics()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
    marginLeft: 20,
  },
  breakdownSection: {
    paddingHorizontal: 20,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  breakdownCard: {
    flex: 1,
    minWidth: (width - 56) / 2,
    alignItems: 'center',
    padding: 16,
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  breakdownChange: {
    fontSize: 11,
    fontWeight: '600',
  },
  breakdownSubtext: {
    fontSize: 10,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  chartSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  chartCard: {
    alignItems: 'center',
    padding: 16,
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  progressLabel: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  metricsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: (width - 56) / 2,
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: 11,
    color: colors.text.tertiary,
    lineHeight: 14,
  },
});

export default RevenueAnalyticsChart;