import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { mySchema } from '../models/schema';
import Transaction from '../models/Transaction';

const adapter = new SQLiteAdapter({
  schema: mySchema,
});

const database = new Database({
  adapter,
  modelClasses: [Transaction],
});

export default function DigitalLedger() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [type, setType] = useState('Cash-In');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const allTransactions = await database.get('transactions').query().fetch();
    setTransactions(allTransactions);
  };

  const addTransaction = async () => {
    if (!amount) return;

    await database.write(async () => {
      await database.get('transactions').create((transaction: any) => {
        transaction.type = type;
        transaction.amount = parseFloat(amount);
        transaction.description = description;
        transaction.timestamp = new Date();
      });
    });

    setAmount('');
    setDescription('');
    loadTransactions();
  };

  const renderTransaction = ({ item }: any) => (
    <View className="p-3 border-b border-gray-200">
      <Text className="font-semibold">{item.type}: GHS {item.amount}</Text>
      <Text className="text-sm text-gray-600">{item.description}</Text>
      <Text className="text-xs text-gray-500">{item.timestamp.toISOString()}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-white dark:bg-black p-4">
      <Text className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        Digital Ledger
      </Text>

      <View className="mb-4">
        <TextInput
          className="p-2 border border-gray-300 rounded mb-2 text-black"
          placeholder="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
        <TextInput
          className="p-2 border border-gray-300 rounded mb-2 text-black"
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
        />
        <TouchableOpacity
          onPress={addTransaction}
          className="p-3 bg-blue-500 rounded-lg"
        >
          <Text className="text-white font-semibold text-center">Add Transaction</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        className="flex-1"
      />
    </View>
  );
}