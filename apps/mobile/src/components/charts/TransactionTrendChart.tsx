import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { TrendData } from '../../services/analytics';
import AnimatedCard from '../ui/AnimatedCard';
import { colors, semanticColors } from '../../theme/colors';

const { width } = Dimensions.get('window');

interface TransactionTrendChartProps {
  data: TrendData[];
  title: string;
  type?: 'line' | 'bar';
  height?: number;
  showRevenue?: boolean;
  showTransactions?: boolean;
  showCommission?: boolean;
}

export const TransactionTrendChart: React.FC<TransactionTrendChartProps> = ({
  data,
  title,
  type = 'line',
  height = 220,
  showRevenue = true,
  showTransactions = true,
  showCommission = false,
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = data.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-GH', { month: 'short', day: 'numeric' });
    });

    const datasets = [];

    if (showRevenue) {
      datasets.push({
        data: data.map(item => item.revenue),
        color: () => semanticColors.success,
        strokeWidth: 2,
      });
    }

    if (showTransactions) {
      datasets.push({
        data: data.map(item => item.transactions),
        color: () => semanticColors.primary,
        strokeWidth: 2,
      });
    }

    if (showCommission) {
      datasets.push({
        data: data.map(item => item.commission),
        color: () => colors.warning[500],
        strokeWidth: 2,
      });
    }

    return {
      labels,
      datasets,
    };
  }, [data, showRevenue, showTransactions, showCommission]);

  const chartConfig = {
    backgroundColor: colors.background.primary,
    backgroundGradientFrom: colors.background.primary,
    backgroundGradientTo: colors.background.primary,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
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

  const renderLegend = () => {
    const legendItems = [];
    if (showRevenue) {
      legendItems.push({ label: 'Revenue', color: semanticColors.success });
    }
    if (showTransactions) {
      legendItems.push({ label: 'Transactions', color: semanticColors.primary });
    }
    if (showCommission) {
      legendItems.push({ label: 'Commission', color: colors.warning[500] });
    }

    return (
      <View style={styles.legend}>
        {legendItems.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (!data || data.length === 0) {
    return (
      <AnimatedCard variant="fadeIn" style={styles.emptyCard}>
        <Text style={styles.emptyText}>No data available for chart</Text>
      </AnimatedCard>
    );
  }

  return (
    <Animated.View entering={FadeInUp} style={styles.container}>
      <AnimatedCard variant="slideUp" style={styles.card}>
        <Text style={styles.title}>{title}</Text>

        {renderLegend()}

        <View style={styles.chartContainer}>
          {type === 'line' ? (
            <LineChart
              data={chartData}
              width={width - 80}
              height={height}
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
          ) : (
            <BarChart
              data={chartData}
              width={width - 80}
              height={height}
              chartConfig={chartConfig}
              style={styles.chart}
              showValuesOnTopOfBars={false}
              withInnerLines={false}
              showBarTops={false}
              segments={4}
            />
          )}
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              GHS {data.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {data.reduce((sum, item) => sum + item.transactions, 0)}
            </Text>
            <Text style={styles.statLabel}>Total Transactions</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              GHS {(data.reduce((sum, item) => sum + item.revenue, 0) / Math.max(data.length, 1)).toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Daily Average</Text>
          </View>
        </View>
      </AnimatedCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: colors.shadow.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default TransactionTrendChart;