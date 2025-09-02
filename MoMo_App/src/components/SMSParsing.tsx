import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, FlatList, ScrollView } from 'react-native';
import { useDispatch } from 'react-redux';
import { addTransaction } from '../store/slices/transactionSlice';

interface ParsedTransaction {
  type: 'Cash-In' | 'Cash-Out' | 'Bill Pay' | 'Transfer';
  amount: number;
  description: string;
  sender?: string;
  recipient?: string;
  balance?: number;
  timestamp: string;
  reference?: string;
}

export default function SMSParsing() {
  const dispatch = useDispatch();
  const [smsText, setSmsText] = useState('');
  const [parsedTransaction, setParsedTransaction] = useState<ParsedTransaction | null>(null);
  const [parsingHistory, setParsingHistory] = useState<ParsedTransaction[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // Expanded regex patterns for different MoMo SMS formats
  const smsPatterns = {
    // Cash In patterns
    cashIn: [
      /You have received GHS (\d+(?:\.\d{2})?) from ([^.\n]+)\.?(?: Your new balance is GHS (\d+(?:\.\d{2})?))?/i,
      /Payment received: GHS (\d+(?:\.\d{2})?) from ([^.\n]+)\.?(?: Balance: GHS (\d+(?:\.\d{2})?))?/i,
      /Credit: GHS (\d+(?:\.\d{2})?) \| From: ([^.\n]+)\.?(?: Balance: GHS (\d+(?:\.\d{2})?))?/i,
    ],
    // Cash Out patterns
    cashOut: [
      /You have sent GHS (\d+(?:\.\d{2})?) to ([^.\n]+)\.?(?: Your new balance is GHS (\d+(?:\.\d{2})?))?/i,
      /Payment sent: GHS (\d+(?:\.\d{2})?) to ([^.\n]+)\.?(?: Balance: GHS (\d+(?:\.\d{2})?))?/i,
      /Debit: GHS (\d+(?:\.\d{2})?) \| To: ([^.\n]+)\.?(?: Balance: GHS (\d+(?:\.\d{2})?))?/i,
    ],
    // Bill Pay patterns
    billPay: [
      /Bill payment: GHS (\d+(?:\.\d{2})?) to ([^.\n]+)\.?(?: Reference: ([^.\n]+))?\.?(?: Balance: GHS (\d+(?:\.\d{2})?))?/i,
      /Payment to ([^.\n]+): GHS (\d+(?:\.\d{2})?)\.?(?: Ref: ([^.\n]+))?\.?(?: Balance: GHS (\d+(?:\.\d{2})?))?/i,
    ],
    // Transfer patterns
    transfer: [
      /Transfer: GHS (\d+(?:\.\d{2})?) to ([^.\n]+)\.?(?: Reference: ([^.\n]+))?\.?(?: Balance: GHS (\d+(?:\.\d{2})?))?/i,
      /Money transfer to ([^.\n]+): GHS (\d+(?:\.\d{2})?)\.?(?: Ref: ([^.\n]+))?\.?(?: Balance: GHS (\d+(?:\.\d{2})?))?/i,
    ],
  };

  const parseSMS = () => {
    if (!smsText.trim()) {
      Alert.alert('Error', 'Please enter SMS text to parse');
      return;
    }

    setIsParsing(true);
    console.log('Parsing SMS:', smsText);

    try {
      let parsed: ParsedTransaction | null = null;

      // Try Cash In patterns
      for (const pattern of smsPatterns.cashIn) {
        const match = smsText.match(pattern);
        if (match) {
          parsed = {
            type: 'Cash-In',
            amount: parseFloat(match[1]),
            description: `Received from ${match[2]}`,
            sender: match[2],
            balance: match[3] ? parseFloat(match[3]) : undefined,
            timestamp: new Date().toISOString(),
          };
          break;
        }
      }

      // Try Cash Out patterns
      if (!parsed) {
        for (const pattern of smsPatterns.cashOut) {
          const match = smsText.match(pattern);
          if (match) {
            parsed = {
              type: 'Cash-Out',
              amount: parseFloat(match[1]),
              description: `Sent to ${match[2]}`,
              recipient: match[2],
              balance: match[3] ? parseFloat(match[3]) : undefined,
              timestamp: new Date().toISOString(),
            };
            break;
          }
        }
      }

      // Try Bill Pay patterns
      if (!parsed) {
        for (const pattern of smsPatterns.billPay) {
          const match = smsText.match(pattern);
          if (match) {
            parsed = {
              type: 'Bill Pay',
              amount: parseFloat(match[1]),
              description: `Bill payment to ${match[2]}`,
              recipient: match[2],
              reference: match[3] || undefined,
              balance: match[4] ? parseFloat(match[4]) : undefined,
              timestamp: new Date().toISOString(),
            };
            break;
          }
        }
      }

      // Try Transfer patterns
      if (!parsed) {
        for (const pattern of smsPatterns.transfer) {
          const match = smsText.match(pattern);
          if (match) {
            parsed = {
              type: 'Transfer',
              amount: parseFloat(match[1]),
              description: `Transfer to ${match[2]}`,
              recipient: match[2],
              reference: match[3] || undefined,
              balance: match[4] ? parseFloat(match[4]) : undefined,
              timestamp: new Date().toISOString(),
            };
            break;
          }
        }
      }

      if (parsed) {
        setParsedTransaction(parsed);
        setParsingHistory(prev => [parsed!, ...prev.slice(0, 9)]); // Keep last 10
        console.log('Successfully parsed transaction:', parsed);
        Alert.alert('Parsed Successfully', `Type: ${parsed.type}\nAmount: GHS ${parsed.amount}`);
      } else {
        console.log('Failed to parse SMS - no matching pattern found');
        Alert.alert('Parsing Failed', 'Could not parse the SMS. Please check the format or try a different message.');
      }
    } catch (error) {
      console.error('Error parsing SMS:', error);
      Alert.alert('Error', 'An error occurred while parsing the SMS');
    } finally {
      setIsParsing(false);
    }
  };

  const addToLedger = () => {
    if (!parsedTransaction) {
      Alert.alert('Error', 'No parsed transaction to add');
      return;
    }

    try {
      const transactionToAdd = {
        id: `sms_${Date.now()}`,
        type: parsedTransaction.type,
        amount: parsedTransaction.amount,
        description: parsedTransaction.description,
        timestamp: Date.now(),
        balance: parsedTransaction.balance,
      };

      dispatch(addTransaction(transactionToAdd));
      Alert.alert('Success', 'Transaction added to digital ledger');
      setParsedTransaction(null);
      setSmsText('');
    } catch (error) {
      console.error('Error adding to ledger:', error);
      Alert.alert('Error', 'Failed to add transaction to ledger');
    }
  };

  const clearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear the parsing history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', onPress: () => setParsingHistory([]) },
      ]
    );
  };

  const renderHistoryItem = ({ item }: { item: ParsedTransaction }) => (
    <View className="p-2 border-b border-gray-200 bg-gray-50 dark:bg-gray-800 rounded mb-1">
      <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">
        {item.type}: GHS {item.amount.toFixed(2)}
      </Text>
      <Text className="text-xs text-gray-600 dark:text-gray-400">
        {item.description}
      </Text>
      <Text className="text-xs text-gray-500 dark:text-gray-500">
        {new Date(item.timestamp).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black p-4">
      <Text className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        SMS Transaction Parsing
      </Text>

      <TextInput
        className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-black dark:text-white dark:bg-gray-700"
        placeholder="Paste MoMo SMS here (supports Cash-In, Cash-Out, Bill Pay, Transfer)"
        value={smsText}
        onChangeText={setSmsText}
        multiline
        numberOfLines={4}
        placeholderTextColor="#666"
      />

      <TouchableOpacity
        onPress={parseSMS}
        disabled={isParsing}
        className={`px-6 py-3 rounded-lg mb-4 ${isParsing ? 'bg-gray-400' : 'bg-purple-500'}`}
      >
        <Text className="text-white font-semibold text-center">
          {isParsing ? 'Parsing...' : 'Parse Transaction'}
        </Text>
      </TouchableOpacity>

      {parsedTransaction && (
        <View className="w-full p-4 bg-green-50 dark:bg-gray-800 rounded-lg mb-4 border border-green-200">
          <Text className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            ✓ Parsed Transaction
          </Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            Type: {parsedTransaction.type}
          </Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            Amount: GHS {parsedTransaction.amount.toFixed(2)}
          </Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            Description: {parsedTransaction.description}
          </Text>
          {parsedTransaction.sender && (
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              From: {parsedTransaction.sender}
            </Text>
          )}
          {parsedTransaction.recipient && (
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              To: {parsedTransaction.recipient}
            </Text>
          )}
          {parsedTransaction.balance && (
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              Balance: GHS {parsedTransaction.balance.toFixed(2)}
            </Text>
          )}
          {parsedTransaction.reference && (
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              Reference: {parsedTransaction.reference}
            </Text>
          )}

          <TouchableOpacity
            onPress={addToLedger}
            className="mt-3 px-4 py-2 bg-blue-500 rounded"
          >
            <Text className="text-white font-semibold text-center">Add to Digital Ledger</Text>
          </TouchableOpacity>
        </View>
      )}

      {parsingHistory.length > 0 && (
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Recent Parsing History
            </Text>
            <TouchableOpacity
              onPress={clearHistory}
              className="px-3 py-1 bg-red-500 rounded"
            >
              <Text className="text-white text-sm">Clear</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={parsingHistory}
            keyExtractor={(item, index) => `${item.timestamp}_${index}`}
            renderItem={renderHistoryItem}
            className="max-h-40"
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      <View className="mt-4 p-3 bg-blue-50 dark:bg-gray-800 rounded-lg">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Supported SMS Formats:
        </Text>
        <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          • "You have received GHS 50.00 from John Doe"
        </Text>
        <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          • "Payment sent: GHS 25.00 to Jane Smith"
        </Text>
        <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">
          • "Bill payment: GHS 100.00 to ECG"
        </Text>
        <Text className="text-xs text-gray-600 dark:text-gray-400">
          • "Transfer: GHS 75.00 to Account 12345"
        </Text>
      </View>
    </ScrollView>
  );
}