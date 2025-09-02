import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, Modal, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { mySchema } from '../models/schema';
import Transaction from '../models/Transaction';
import { RootState } from '../store';
import {
  setTransactions,
  addTransaction as addTransactionAction,
  updateTransaction as updateTransactionAction,
  deleteTransaction as deleteTransactionAction,
  setFilterType,
  setFilterDateRange,
  setFilterAmountRange,
  clearFilters,
  Transaction as TransactionType
} from '../store/slices/transactionSlice';

const adapter = new SQLiteAdapter({
  schema: mySchema,
});

const database = new Database({
  adapter,
  modelClasses: [Transaction],
});

export default function DigitalLedger() {
  const dispatch = useDispatch();
  const {
    transactions,
    filteredTransactions,
    filterType,
    filterDateFrom,
    filterDateTo,
    filterAmountMin,
    filterAmountMax,
    isLoading,
    error
  } = useSelector((state: RootState) => state.transactions);

  const [type, setType] = useState<'Cash-In' | 'Cash-Out' | 'Bill Pay' | 'Transfer'>('Cash-In');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<TransactionType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilterType, setTempFilterType] = useState('All');
  const [tempDateFrom, setTempDateFrom] = useState('');
  const [tempDateTo, setTempDateTo] = useState('');
  const [tempAmountMin, setTempAmountMin] = useState('');
  const [tempAmountMax, setTempAmountMax] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const allTransactions = await database.get('transactions').query().fetch();
      const formattedTransactions = allTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        timestamp: t.timestamp.getTime(),
        balance: t.balance,
      }));
      dispatch(setTransactions(formattedTransactions));
    } catch (err) {
      console.error('Error loading transactions:', err);
      Alert.alert('Error', 'Failed to load transactions');
    }
  };

  const validateTransaction = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Invalid Description', 'Please enter a description');
      return false;
    }
    return true;
  };

  const addTransaction = async () => {
    if (!validateTransaction()) return;

    try {
      await database.write(async () => {
        const newTransaction = await database.get('transactions').create((transaction: any) => {
          transaction.type = type;
          transaction.amount = parseFloat(amount);
          transaction.description = description.trim();
          transaction.timestamp = new Date();
        });

        const formattedTransaction: TransactionType = {
          id: newTransaction.id,
          type,
          amount: parseFloat(amount),
          description: description.trim(),
          timestamp: Date.now(),
        };

        dispatch(addTransactionAction(formattedTransaction));
      });

      setAmount('');
      setDescription('');
      Alert.alert('Success', 'Transaction added successfully');
    } catch (err) {
      console.error('Error adding transaction:', err);
      Alert.alert('Error', 'Failed to add transaction');
    }
  };

  const updateTransaction = async () => {
    if (!editingTransaction || !validateTransaction()) return;

    try {
      await database.write(async () => {
        const transaction = await database.get('transactions').find(editingTransaction.id);
        await transaction.update((t: any) => {
          t.type = type;
          t.amount = parseFloat(amount);
          t.description = description.trim();
        });
      });

      const updatedTransaction: TransactionType = {
        ...editingTransaction,
        type,
        amount: parseFloat(amount),
        description: description.trim(),
      };

      dispatch(updateTransactionAction(updatedTransaction));
      setEditingTransaction(null);
      setModalVisible(false);
      setAmount('');
      setDescription('');
      Alert.alert('Success', 'Transaction updated successfully');
    } catch (err) {
      console.error('Error updating transaction:', err);
      Alert.alert('Error', 'Failed to update transaction');
    }
  };

  const deleteTransaction = async (id: string) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.write(async () => {
                const transaction = await database.get('transactions').find(id);
                await transaction.destroyPermanently();
              });
              dispatch(deleteTransactionAction(id));
              Alert.alert('Success', 'Transaction deleted successfully');
            } catch (err) {
              console.error('Error deleting transaction:', err);
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (transaction: TransactionType) => {
    setEditingTransaction(transaction);
    setType(transaction.type);
    setAmount(transaction.amount.toString());
    setDescription(transaction.description);
    setModalVisible(true);
  };

  const applyFilters = () => {
    dispatch(setFilterType(tempFilterType));

    const dateFrom = tempDateFrom ? new Date(tempDateFrom).getTime() : null;
    const dateTo = tempDateTo ? new Date(tempDateTo).getTime() : null;
    dispatch(setFilterDateRange({ from: dateFrom, to: dateTo }));

    const amountMin = tempAmountMin ? parseFloat(tempAmountMin) : null;
    const amountMax = tempAmountMax ? parseFloat(tempAmountMax) : null;
    dispatch(setFilterAmountRange({ min: amountMin, max: amountMax }));

    setShowFilters(false);
  };

  const clearAllFilters = () => {
    dispatch(clearFilters());
    setTempFilterType('All');
    setTempDateFrom('');
    setTempDateTo('');
    setTempAmountMin('');
    setTempAmountMax('');
    setShowFilters(false);
  };

  const getTotalAmount = () => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  };

  const getTransactionCount = () => {
    return filteredTransactions.length;
  };

  const getTypeBreakdown = () => {
    const breakdown: { [key: string]: number } = {};
    filteredTransactions.forEach(t => {
      breakdown[t.type] = (breakdown[t.type] || 0) + 1;
    });
    return breakdown;
  };

  const renderTransaction = ({ item }: { item: TransactionType }) => (
    <View className="p-3 border-b border-gray-200 bg-white dark:bg-gray-800 rounded-lg mb-2">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="font-semibold text-lg text-gray-800 dark:text-gray-200">
            {item.type}: GHS {item.amount.toFixed(2)}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {item.description}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
        <View className="flex-row ml-2">
          <TouchableOpacity
            onPress={() => openEditModal(item)}
            className="px-3 py-1 bg-blue-500 rounded mr-2"
          >
            <Text className="text-white text-sm">Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => deleteTransaction(item.id)}
            className="px-3 py-1 bg-red-500 rounded"
          >
            <Text className="text-white text-sm">Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="text-lg">Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-black p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-bold text-gray-800 dark:text-gray-200">
          Digital Ledger
        </Text>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          className="px-3 py-1 bg-gray-500 rounded"
        >
          <Text className="text-white text-sm">
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <Text className="text-red-500 mb-4 p-2 bg-red-100 rounded">
          Error: {error}
        </Text>
      )}

      {/* Analytics Section */}
      <View className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-4">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Analytics Summary
        </Text>
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Total: GHS {getTotalAmount().toFixed(2)}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Count: {getTransactionCount()}
          </Text>
        </View>
        <View className="mt-1">
          <Text className="text-xs text-gray-500 dark:text-gray-500">
            Breakdown: {Object.entries(getTypeBreakdown()).map(([type, count]) =>
              `${type}: ${count}`
            ).join(', ')}
          </Text>
        </View>
      </View>

      {/* Filters Section */}
      {showFilters && (
        <View className="bg-blue-50 dark:bg-gray-700 p-3 rounded-lg mb-4">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Filters
          </Text>

          <View className="mb-2">
            <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">Type</Text>
            <View className="flex-row flex-wrap">
              {['All', 'Cash-In', 'Cash-Out', 'Bill Pay', 'Transfer'].map((filterType) => (
                <TouchableOpacity
                  key={filterType}
                  onPress={() => setTempFilterType(filterType)}
                  className={`px-2 py-1 rounded mr-2 mb-1 ${
                    tempFilterType === filterType
                      ? 'bg-blue-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <Text className={`text-xs ${
                    tempFilterType === filterType
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {filterType}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="flex-row justify-between mb-2">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">Date From</Text>
              <TextInput
                className="p-1 border border-gray-300 rounded text-xs text-black dark:text-white dark:bg-gray-600"
                placeholder="YYYY-MM-DD"
                value={tempDateFrom}
                onChangeText={setTempDateFrom}
                placeholderTextColor="#666"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">Date To</Text>
              <TextInput
                className="p-1 border border-gray-300 rounded text-xs text-black dark:text-white dark:bg-gray-600"
                placeholder="YYYY-MM-DD"
                value={tempDateTo}
                onChangeText={setTempDateTo}
                placeholderTextColor="#666"
              />
            </View>
          </View>

          <View className="flex-row justify-between mb-3">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">Min Amount</Text>
              <TextInput
                className="p-1 border border-gray-300 rounded text-xs text-black dark:text-white dark:bg-gray-600"
                placeholder="0.00"
                value={tempAmountMin}
                onChangeText={setTempAmountMin}
                keyboardType="numeric"
                placeholderTextColor="#666"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">Max Amount</Text>
              <TextInput
                className="p-1 border border-gray-300 rounded text-xs text-black dark:text-white dark:bg-gray-600"
                placeholder="1000.00"
                value={tempAmountMax}
                onChangeText={setTempAmountMax}
                keyboardType="numeric"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          <View className="flex-row justify-end">
            <TouchableOpacity
              onPress={clearAllFilters}
              className="px-3 py-1 bg-gray-500 rounded mr-2"
            >
              <Text className="text-white text-xs">Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={applyFilters}
              className="px-3 py-1 bg-blue-500 rounded"
            >
              <Text className="text-white text-xs">Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View className="mb-4">
        <TextInput
          className="p-2 border border-gray-300 rounded mb-2 text-black dark:text-white dark:bg-gray-700"
          placeholder="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholderTextColor="#666"
        />
        <TextInput
          className="p-2 border border-gray-300 rounded mb-2 text-black dark:text-white dark:bg-gray-700"
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          placeholderTextColor="#666"
        />
        <TouchableOpacity
          onPress={editingTransaction ? updateTransaction : addTransaction}
          className="p-3 bg-blue-500 rounded-lg"
        >
          <Text className="text-white font-semibold text-center">
            {editingTransaction ? 'Update Transaction' : 'Add Transaction'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        className="flex-1"
        showsVerticalScrollIndicator={false}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white dark:bg-gray-800 p-6 rounded-lg w-4/5">
            <Text className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">
              Edit Transaction
            </Text>
            <TextInput
              className="p-2 border border-gray-300 rounded mb-2 text-black dark:text-white dark:bg-gray-700"
              placeholder="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholderTextColor="#666"
            />
            <TextInput
              className="p-2 border border-gray-300 rounded mb-4 text-black dark:text-white dark:bg-gray-700"
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#666"
            />
            <View className="flex-row justify-end">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="px-4 py-2 bg-gray-500 rounded mr-2"
              >
                <Text className="text-white">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={updateTransaction}
                className="px-4 py-2 bg-blue-500 rounded"
              >
                <Text className="text-white">Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}