import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';

export default function SMSParsing() {
  const [smsText, setSmsText] = useState('');
  const [parsedTransaction, setParsedTransaction] = useState<any>(null);

  const parseSMS = () => {
    // Simple regex to parse MoMo transaction SMS
    // Example: "You have received GHS 50.00 from John Doe. Your new balance is GHS 150.00"
    const regex = /received GHS (\d+\.\d+) from (.+)\. Your new balance is GHS (\d+\.\d+)/;
    const match = smsText.match(regex);

    if (match) {
      const amount = parseFloat(match[1]);
      const sender = match[2];
      const balance = parseFloat(match[3]);

      setParsedTransaction({
        type: 'Cash-In',
        amount,
        sender,
        balance,
        timestamp: new Date().toISOString(),
      });
      Alert.alert('Parsed Successfully', `Amount: ${amount}, From: ${sender}`);
    } else {
      Alert.alert('Parsing Failed', 'Could not parse the SMS. Please check the format.');
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black p-4">
      <Text className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        SMS Transaction Parsing
      </Text>
      <TextInput
        className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-black"
        placeholder="Paste MoMo SMS here"
        value={smsText}
        onChangeText={setSmsText}
        multiline
      />
      <TouchableOpacity
        onPress={parseSMS}
        className="px-6 py-3 bg-purple-500 rounded-lg mb-4"
      >
        <Text className="text-white font-semibold">Parse Transaction</Text>
      </TouchableOpacity>
      {parsedTransaction && (
        <View className="w-full p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            Type: {parsedTransaction.type}
          </Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            Amount: GHS {parsedTransaction.amount}
          </Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            From: {parsedTransaction.sender}
          </Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            Balance: GHS {parsedTransaction.balance}
          </Text>
        </View>
      )}
    </View>
  );
}