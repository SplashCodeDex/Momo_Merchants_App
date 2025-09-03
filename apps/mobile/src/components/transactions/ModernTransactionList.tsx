import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInUp, Layout, SlideInRight } from 'react-native-reanimated';
import { TransactionModel } from '../../database/models/Transaction';
import { transactionService } from '../../services/transactions';
import { networkService, NetworkStatus } from '../../services/network';
import { syncEngine } from '../../services/syncEngine';
import AnimatedCard from '../ui/AnimatedCard';
import AnimatedButton from '../ui/AnimatedButton';
import AnimatedSpinner from '../ui/AnimatedSpinner';
import { colors, semanticColors } from '../../theme/colors';

interface ModernTransactionListProps {
  userId: string;
  merchantId?: string;
  onTransactionPress?: (transaction: TransactionModel) => void;
  onRefresh?: () => void;
}

interface TransactionItemProps {
  transaction: TransactionModel;
  onPress?: (transaction: TransactionModel) => void;
  networkStatus: NetworkStatus;
  index: number;
}

const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
  networkStatus,
  index,
}) => {
  const getStatusColor = () => {
    switch (transaction.syncStatus) {
      case 'synced':
        return semanticColors.success;
      case 'pending':
        return networkStatus === 'online' ? semanticColors.sync : semanticColors.pending;
      case 'error':
        return semanticColors.error;
      case 'conflict':
        return colors.warning[500];
      default:
        return colors.gray[400];
    }
  };

  const getStatusText = () => {
    switch (transaction.syncStatus) {
      case 'synced':
        return '✓ Synced';
      case 'pending':
        return networkStatus === 'online' ? '⟳ Syncing...' : '⏳ Pending';
      case 'error':
        return '⚠️ Failed';
      case 'conflict':
        return '⚡ Conflict';
      default:
        return '❓ Unknown';
    }
  };

  const formatAmount = (amount: number): string => {
    return `GHS ${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-GH', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getTransactionIcon = () => {
    switch (transaction.type) {
      case 'deposit':
        return '💰';
      case 'withdrawal':
        return '💸';
      case 'bill_payment':
        return '📄';
      case 'airtime':
        return '📱';
      default:
        return '💳';
    }
  };

  const getTransactionColor = () => {
    switch (transaction.type) {
      case 'deposit':
        return semanticColors.deposit;
      case 'withdrawal':
        return semanticColors.withdrawal;
      case 'bill_payment':
        return semanticColors.billPayment;
      case 'airtime':
        return semanticColors.airtime;
      default:
        return semanticColors.primary;
    }
  };

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 50).springify()}
      layout={Layout.springify()}
    >
      <AnimatedCard
        variant="fadeIn"
        delay={index * 100}
        style={styles.transactionItem}
      >
        <TouchableOpacity
          style={styles.transactionContent}
          onPress={() => onPress?.(transaction)}
          activeOpacity={0.7}
        >
          <View style={styles.transactionHeader}>
            <View style={styles.iconContainer}>
              <Text style={styles.transactionIcon}>{getTransactionIcon()}</Text>
            </View>

            <View style={styles.transactionInfo}>
              <Text style={styles.transactionType}>
                {transaction.type.replace('_', ' ').toUpperCase()}
              </Text>
              <Text style={styles.customerName} numberOfLines={1}>
                {transaction.customerName || transaction.customerNumber || 'N/A'}
              </Text>
            </View>

            <View style={styles.amountContainer}>
              <Text style={[styles.transactionAmount, { color: getTransactionColor() }]}>
                {transaction.type === 'deposit' ? '+' : '-'}
                {formatAmount(transaction.amount)}
              </Text>
              <Text style={styles.transactionDate}>
                {formatDate(transaction.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.transactionFooter}>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: getStatusColor() },
                ]}
              />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>

            {transaction.notes && (
              <Text style={styles.transactionNotes} numberOfLines={1}>
                {transaction.notes}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </AnimatedCard>
    </Animated.View>
  );
};

export const ModernTransactionList: React.FC<ModernTransactionListProps> = ({
  userId,
  merchantId,
  onTransactionPress,
  onRefresh,
}) => {
  const [transactions, setTransactions] = useState<TransactionModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('unknown');
  const [error, setError] = useState<string | null>(null);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    try {
      setError(null);
      const result = await transactionService.getTransactions({
        userId,
        merchantId,
        limit: 50,
      });
      setTransactions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [userId, merchantId]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTransactions();
      onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  }, [loadTransactions, onRefresh]);

  // Handle manual sync
  const handleManualSync = useCallback(async () => {
    if (networkStatus === 'offline') {
      Alert.alert(
        'Offline Mode',
        'You are currently offline. Transactions will sync automatically when connection is restored.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      Alert.alert('Syncing', 'Synchronizing transactions...', [{ text: 'OK' }]);
      const result = await syncEngine.startSync();
      Alert.alert(
        'Sync Complete',
        `Successfully processed ${result.successful} transactions in ${result.duration}ms`,
        [{ text: 'OK' }]
      );
      await loadTransactions();
    } catch (error) {
      Alert.alert('Sync Failed', 'Failed to synchronize transactions. Please try again.');
    }
  }, [networkStatus, loadTransactions]);

  // Set up network monitoring
  useEffect(() => {
    const unsubscribe = networkService.addListener((state) => {
      setNetworkStatus(state.status);
    });

    return unsubscribe;
  }, []);

  // Load transactions when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  // Initial load
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const renderTransaction = ({ item, index }: { item: TransactionModel; index: number }) => (
    <TransactionItem
      transaction={item}
      onPress={onTransactionPress}
      networkStatus={networkStatus}
      index={index}
    />
  );

  const renderEmpty = () => (
    <Animated.View entering={FadeInUp} style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Text style={styles.emptyText}>No transactions found</Text>
      <Text style={styles.emptySubtext}>
        {networkStatus === 'offline'
          ? 'You are offline. Transactions will appear when synced.'
          : 'Create your first transaction to get started.'}
      </Text>
    </Animated.View>
  );

  const renderError = () => (
    <Animated.View entering={FadeInUp} style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorText}>Failed to load transactions</Text>
      <Text style={styles.errorSubtext}>{error}</Text>
      <AnimatedButton
        title="Retry"
        onPress={loadTransactions}
        variant="outline"
        style={styles.retryButton}
      />
    </Animated.View>
  );

  if (loading && transactions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <AnimatedSpinner size="large" variant="bounce" color={semanticColors.primary} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with sync status */}
      <Animated.View entering={FadeInUp} style={styles.header}>
        <View style={styles.networkStatus}>
          <View
            style={[
              styles.networkIndicator,
              {
                backgroundColor:
                  networkStatus === 'online' ? semanticColors.online :
                  networkStatus === 'offline' ? semanticColors.offline : semanticColors.pending
              },
            ]}
          />
          <Text style={styles.networkText}>
            {networkStatus === 'online' ? '🟢 Online' :
             networkStatus === 'offline' ? '🔴 Offline' : '🟡 Checking...'}
          </Text>
        </View>

        <AnimatedButton
          title="Sync"
          onPress={handleManualSync}
          variant={networkStatus === 'offline' ? 'outline' : 'primary'}
          disabled={networkStatus === 'offline'}
          size="small"
        />
      </Animated.View>

      {/* Transaction list */}
      {error ? (
        renderError()
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.offlineId}
          renderItem={renderTransaction}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[semanticColors.primary]}
              tintColor={semanticColors.primary}
              title="Pull to refresh"
              titleColor={colors.text.secondary}
            />
          }
          contentContainerStyle={transactions.length === 0 ? styles.emptyList : styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  networkText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  transactionItem: {
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: colors.shadow.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionContent: {
    padding: 16,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIcon: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  customerName: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 10,
    color: colors.text.tertiary,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  transactionNotes: {
    flex: 1,
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyList: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
    lineHeight: 20,
  },
  retryButton: {
    minWidth: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 16,
  },
});

export default ModernTransactionList;