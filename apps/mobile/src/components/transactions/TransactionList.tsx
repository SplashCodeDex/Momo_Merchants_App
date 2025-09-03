import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TransactionModel } from '../../database/models/Transaction';
import { transactionService } from '../../services/transactions';
import { networkService, NetworkStatus } from '../../services/network';
import { syncEngine } from '../../services/syncEngine';

interface TransactionListProps {
  userId: string;
  merchantId?: string;
  onTransactionPress?: (transaction: TransactionModel) => void;
  onRefresh?: () => void;
}

interface TransactionItemProps {
  transaction: TransactionModel;
  onPress?: (transaction: TransactionModel) => void;
  networkStatus: NetworkStatus;
}

const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
  networkStatus,
}) => {
  const getStatusColor = () => {
    switch (transaction.syncStatus) {
      case 'synced':
        return '#4CAF50'; // Green
      case 'pending':
        return '#FF9800'; // Orange
      case 'error':
        return '#F44336'; // Red
      case 'conflict':
        return '#9C27B0'; // Purple
      default:
        return '#9E9E9E'; // Grey
    }
  };

  const getStatusText = () => {
    switch (transaction.syncStatus) {
      case 'synced':
        return 'Synced';
      case 'pending':
        return networkStatus === 'online' ? 'Syncing...' : 'Pending';
      case 'error':
        return 'Sync Failed';
      case 'conflict':
        return 'Conflict';
      default:
        return 'Unknown';
    }
  };

  const formatAmount = (amount: number): string => {
    return `GHS ${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = () => {
    switch (transaction.type) {
      case 'deposit':
        return '↓';
      case 'withdrawal':
        return '↑';
      case 'bill_payment':
        return '📄';
      case 'airtime':
        return '📱';
      default:
        return '💰';
    }
  };

  return (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => onPress?.(transaction)}
      activeOpacity={0.7}
    >
      <View style={styles.transactionIcon}>
        <Text style={styles.iconText}>{getTransactionIcon()}</Text>
      </View>

      <View style={styles.transactionContent}>
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionType}>
            {transaction.type.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={styles.transactionAmount}>
            {transaction.type === 'deposit' ? '+' : '-'}
            {formatAmount(transaction.amount)}
          </Text>
        </View>

        <View style={styles.transactionDetails}>
          <Text style={styles.customerName} numberOfLines={1}>
            {transaction.customerName || transaction.customerNumber || 'N/A'}
          </Text>
          <Text style={styles.transactionDate}>
            {formatDate(transaction.createdAt)}
          </Text>
        </View>

        {transaction.notes && (
          <Text style={styles.transactionNotes} numberOfLines={2}>
            {transaction.notes}
          </Text>
        )}
      </View>

      <View style={styles.transactionStatus}>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: getStatusColor() },
          ]}
        />
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>
    </TouchableOpacity>
  );
};

export const TransactionList: React.FC<TransactionListProps> = ({
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
      Alert.alert('Offline', 'Cannot sync while offline. Please check your connection.');
      return;
    }

    try {
      Alert.alert('Syncing', 'Synchronizing transactions...');
      const result = await syncEngine.startSync();
      Alert.alert(
        'Sync Complete',
        `Processed ${result.totalProcessed} transactions in ${result.duration}ms`
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

  const renderTransaction = ({ item }: { item: TransactionModel }) => (
    <TransactionItem
      transaction={item}
      onPress={onTransactionPress}
      networkStatus={networkStatus}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No transactions found</Text>
      <Text style={styles.emptySubtext}>
        {networkStatus === 'offline'
          ? 'You are offline. Transactions will sync when online.'
          : 'Create your first transaction to get started.'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Failed to load transactions</Text>
      <Text style={styles.errorSubtext}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadTransactions}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && transactions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with sync status */}
      <View style={styles.header}>
        <View style={styles.networkStatus}>
          <View
            style={[
              styles.networkIndicator,
              {
                backgroundColor:
                  networkStatus === 'online' ? '#4CAF50' :
                  networkStatus === 'offline' ? '#F44336' : '#FF9800'
              },
            ]}
          />
          <Text style={styles.networkText}>
            {networkStatus === 'online' ? 'Online' :
             networkStatus === 'offline' ? 'Offline' : 'Checking...'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.syncButton,
            networkStatus === 'offline' && styles.syncButtonDisabled,
          ]}
          onPress={handleManualSync}
          disabled={networkStatus === 'offline'}
        >
          <Text
            style={[
              styles.syncButtonText,
              networkStatus === 'offline' && styles.syncButtonTextDisabled,
            ]}
          >
            Sync
          </Text>
        </TouchableOpacity>
      </View>

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
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          contentContainerStyle={transactions.length === 0 ? styles.emptyList : undefined}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    color: '#666',
  },
  syncButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  syncButtonDisabled: {
    backgroundColor: '#ccc',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  syncButtonTextDisabled: {
    color: '#999',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  transactionContent: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  transactionStatus: {
    alignItems: 'center',
    marginLeft: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  emptyList: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});