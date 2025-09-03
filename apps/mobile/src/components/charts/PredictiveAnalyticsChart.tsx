import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Animated, { FadeInUp, FadeInLeft } from 'react-native-reanimated';
import { PredictiveMetrics } from '../../services/analytics';
import AnimatedCard from '../ui/AnimatedCard';
import AnimatedSpinner from '../ui/AnimatedSpinner';
import { colors, semanticColors } from '../../theme/colors';

const { width } = Dimensions.get('width');

interface PredictiveAnalyticsChartProps {
  predictiveData: PredictiveMetrics;
  title?: string;
  loading?: boolean;
}

export const PredictiveAnalyticsChart: React.FC<PredictiveAnalyticsChartProps> = ({
  predictiveData,
  title = 'Cash Flow Predictions',
  loading = false,
}) => {
  const chartData = useMemo(() => {
    if (!predictiveData.cashFlowProjection || predictiveData.cashFlowProjection.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = predictiveData.cashFlowProjection.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-GH', { month: 'short', day: 'numeric' });
    });

    return {
      labels,
      datasets: [
        {
          data: predictiveData.cashFlowProjection.map(item => item.predictedAmount),
          color: () => semanticColors.primary,
          strokeWidth: 3,
        },
        {
          data: predictiveData.cashFlowProjection.map(item => item.predictedAmount * (1 - item.confidence * 0.2)),
          color: () => colors.gray[300],
          strokeWidth: 1,
          strokeDashArray: [5, 5],
        },
        {
          data: predictiveData.cashFlowProjection.map(item => item.predictedAmount * (1 + item.confidence * 0.2)),
          color: () => colors.gray[300],
          strokeWidth: 1,
          strokeDashArray: [5, 5],
        },
      ],
    };
  }, [predictiveData]);

  const chartConfig = {
    backgroundColor: colors.background.primary,
    backgroundGradientFrom: colors.background.primary,
    backgroundGradientTo: colors.background.primary,
    decimalPlaces: 0,
    color: (opacity = 1) => semanticColors.primary,
    labelColor: (opacity = 1) => colors.text.secondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: semanticColors.primary,
    },
  };

  const getTrendIcon = () => {
    switch (predictiveData.trend) {
      case 'increasing':
        return '📈';
      case 'decreasing':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getTrendColor = () => {
    switch (predictiveData.trend) {
      case 'increasing':
        return semanticColors.success;
      case 'decreasing':
        return semanticColors.error;
      default:
        return colors.gray[500];
    }
  };

  const renderPredictionSummary = () => (
    <Animated.View entering={FadeInLeft.delay(100)} style={styles.summarySection}>
      <Text style={styles.sectionTitle}>Prediction Summary</Text>

      <View style={styles.summaryGrid}>
        <AnimatedCard variant="scale" delay={200} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryIcon}>🎯</Text>
            <Text style={styles.summaryTitle}>Tomorrow's Revenue</Text>
          </View>
          <Text style={styles.summaryValue}>
            GHS {predictiveData.predictedRevenue.toLocaleString()}
          </Text>
          <Text style={styles.summaryConfidence}>
            {Math.round(predictiveData.confidence * 100)}% confidence
          </Text>
        </AnimatedCard>

        <AnimatedCard variant="scale" delay={300} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryIcon}>📊</Text>
            <Text style={styles.summaryTitle}>Next Week</Text>
          </View>
          <Text style={styles.summaryValue}>
            GHS {predictiveData.nextWeekPrediction.toLocaleString()}
          </Text>
          <Text style={styles.summarySubtext}>
            7-day projection
          </Text>
        </AnimatedCard>

        <AnimatedCard variant="scale" delay={400} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryIcon}>{getTrendIcon()}</Text>
            <Text style={styles.summaryTitle}>Trend</Text>
          </View>
          <Text style={[styles.summaryValue, { color: getTrendColor() }]}>
            {predictiveData.trend.charAt(0).toUpperCase() + predictiveData.trend.slice(1)}
          </Text>
          <Text style={styles.summarySubtext}>
            Revenue direction
          </Text>
        </AnimatedCard>

        <AnimatedCard variant="scale" delay={500} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryIcon}>🎲</Text>
            <Text style={styles.summaryTitle}>Transactions</Text>
          </View>
          <Text style={styles.summaryValue}>
            {Math.round(predictiveData.predictedTransactions)}
          </Text>
          <Text style={styles.summarySubtext}>
            Expected tomorrow
          </Text>
        </AnimatedCard>
      </View>
    </Animated.View>
  );

  const renderChart = () => {
    if (loading) {
      return (
        <AnimatedCard variant="fadeIn" style={styles.loadingCard}>
          <AnimatedSpinner size="large" variant="pulse" color={semanticColors.primary} />
          <Text style={styles.loadingText}>Analyzing trends...</Text>
        </AnimatedCard>
      );
    }

    if (!predictiveData.cashFlowProjection || predictiveData.cashFlowProjection.length === 0) {
      return (
        <AnimatedCard variant="fadeIn" style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>Not enough data for predictions</Text>
          <Text style={styles.emptySubtext}>
            Need at least 7 days of transaction history
          </Text>
        </AnimatedCard>
      );
    }

    return (
      <Animated.View entering={FadeInUp.delay(600)} style={styles.chartSection}>
        <Text style={styles.sectionTitle}>7-Day Cash Flow Projection</Text>
        <AnimatedCard variant="slideUp" delay={700} style={styles.chartCard}>
          <LineChart
            data={chartData}
            width={width - 80}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withDots={true}
            withShadow={false}
            withInnerLines={false}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            segments={4}
          />

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: semanticColors.primary }]} />
              <Text style={styles.legendText}>Predicted Revenue</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, styles.dashedLine, { borderColor: colors.gray[300] }]} />
              <Text style={styles.legendText}>Confidence Range</Text>
            </View>
          </View>
        </AnimatedCard>
      </Animated.View>
    );
  };

  const renderInsights = () => (
    <Animated.View entering={FadeInLeft.delay(800)} style={styles.insightsSection}>
      <Text style={styles.sectionTitle}>AI Insights</Text>

      <View style={styles.insightsList}>
        <AnimatedCard variant="slideUp" delay={900} style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Text style={styles.insightIcon}>💡</Text>
            <Text style={styles.insightTitle}>Revenue Trend</Text>
          </View>
          <Text style={styles.insightText}>
            {predictiveData.trend === 'increasing'
              ? 'Your revenue is trending upward. Consider increasing inventory or expanding services.'
              : predictiveData.trend === 'decreasing'
              ? 'Revenue is declining. Review recent changes and customer feedback.'
              : 'Revenue is stable. Focus on maintaining current performance and customer satisfaction.'}
          </Text>
        </AnimatedCard>

        <AnimatedCard variant="slideUp" delay={1000} style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Text style={styles.insightIcon}>🎯</Text>
            <Text style={styles.insightTitle}>Cash Flow Planning</Text>
          </View>
          <Text style={styles.insightText}>
            Based on current trends, plan for GHS {predictiveData.nextWeekPrediction.toLocaleString()}
            in revenue next week. Consider this for inventory and expense planning.
          </Text>
        </AnimatedCard>

        <AnimatedCard variant="slideUp" delay={1100} style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Text style={styles.insightIcon}>📈</Text>
            <Text style={styles.insightTitle}>Performance Confidence</Text>
          </View>
          <Text style={styles.insightText}>
            Prediction confidence is {Math.round(predictiveData.confidence * 100)}%.
            {predictiveData.confidence > 0.8
              ? ' High confidence - these predictions are reliable.'
              : predictiveData.confidence > 0.6
              ? ' Moderate confidence - monitor actual performance closely.'
              : ' Low confidence - gather more data for better predictions.'}
          </Text>
        </AnimatedCard>
      </View>
    </Animated.View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInUp} style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>AI-powered cash flow predictions</Text>
      </Animated.View>

      {renderPredictionSummary()}
      {renderChart()}
      {renderInsights()}
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
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
  summarySection: {
    paddingHorizontal: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: (width - 56) / 2,
    padding: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  summaryConfidence: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  summarySubtext: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  chartSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  chartCard: {
    alignItems: 'center',
    padding: 16,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 16,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendLine: {
    width: 16,
    height: 2,
    marginRight: 8,
  },
  dashedLine: {
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  legendText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  insightsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  insightsList: {
    gap: 12,
  },
  insightCard: {
    padding: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  insightText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});

export default PredictiveAnalyticsChart;