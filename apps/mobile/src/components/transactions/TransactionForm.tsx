import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TransactionFormData, createTransactionSchema, validateTransaction } from '../../types/transactions';
import { transactionService } from '../../services/transactions';

interface TransactionFormProps {
  merchantId: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TRANSACTION_TYPES = [
  { label: 'Deposit', value: 'deposit' as const },
  { label: 'Withdrawal', value: 'withdrawal' as const },
  { label: 'Bill Payment', value: 'bill_payment' as const },
  { label: 'Airtime', value: 'airtime' as const },
];

export const TransactionForm: React.FC<TransactionFormProps> = ({
  merchantId,
  userId,
  onSuccess,
  onCancel,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: 'deposit',
      merchantId,
      userId,
    },
  });

  const selectedType = watch('type');
  const customerNumber = watch('customerNumber');

  // Auto-fill customer name when customer number changes
  React.useEffect(() => {
    if (customerNumber && !watch('customerName')) {
      // In a real app, you might fetch customer data from a local cache
      // For now, we'll leave it empty
    }
  }, [customerNumber]);

  const onSubmit = async (data: TransactionFormData) => {
    try {
      // Validate data using Zod
      const validation = validateTransaction(data);
      if (!validation.success) {
        Alert.alert('Validation Error', 'Please check your input and try again.');
        return;
      }

      // Create transaction
      await transactionService.createTransaction(validation.data);

      Alert.alert('Success', 'Transaction created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            onSuccess?.();
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert('Error', 'Failed to create transaction. Please try again.');
    }
  };

  const calculateCommission = (amount: number, type: string): number => {
    // Commission calculation logic based on transaction type
    switch (type) {
      case 'deposit':
        return Math.max(amount * 0.005, 1); // 0.5% or minimum GHS 1
      case 'withdrawal':
        return Math.max(amount * 0.01, 2); // 1% or minimum GHS 2
      case 'bill_payment':
        return Math.max(amount * 0.003, 1); // 0.3% or minimum GHS 1
      case 'airtime':
        return Math.max(amount * 0.02, 1); // 2% or minimum GHS 1
      default:
        return 0;
    }
  };

  const handleAmountChange = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    const commission = calculateCommission(numAmount, selectedType);
    setValue('commission', commission);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Transaction</Text>

      {/* Transaction Type */}
      <View style={styles.field}>
        <Text style={styles.label}>Transaction Type *</Text>
        <Controller
          control={control}
          name="type"
          render={({ field: { onChange, value } }) => (
            <View style={styles.typeSelector}>
              {TRANSACTION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeButton,
                    value === type.value && styles.typeButtonSelected,
                  ]}
                  onPress={() => onChange(type.value)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      value === type.value && styles.typeButtonTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.type && <Text style={styles.error}>{errors.type.message}</Text>}
      </View>

      {/* Amount */}
      <View style={styles.field}>
        <Text style={styles.label}>Amount (GHS) *</Text>
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
              value={value?.toString() || ''}
              onChangeText={(text) => {
                onChange(parseFloat(text) || 0);
                handleAmountChange(text);
              }}
            />
          )}
        />
        {errors.amount && <Text style={styles.error}>{errors.amount.message}</Text>}
      </View>

      {/* Commission (Auto-calculated) */}
      <View style={styles.field}>
        <Text style={styles.label}>Commission (GHS)</Text>
        <Controller
          control={control}
          name="commission"
          render={({ field: { value } }) => (
            <TextInput
              style={[styles.input, styles.disabledInput]}
              placeholder="0.00"
              keyboardType="numeric"
              value={value?.toString() || '0.00'}
              editable={false}
            />
          )}
        />
        <Text style={styles.hint}>Calculated automatically based on transaction type</Text>
      </View>

      {/* Customer Number */}
      <View style={styles.field}>
        <Text style={styles.label}>Customer Phone Number</Text>
        <Controller
          control={control}
          name="customerNumber"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="+233501234567"
              keyboardType="phone-pad"
              value={value || ''}
              onChangeText={onChange}
            />
          )}
        />
        {errors.customerNumber && <Text style={styles.error}>{errors.customerNumber.message}</Text>}
      </View>

      {/* Customer Name */}
      <View style={styles.field}>
        <Text style={styles.label}>Customer Name</Text>
        <Controller
          control={control}
          name="customerName"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="Enter customer name"
              value={value || ''}
              onChangeText={onChange}
            />
          )}
        />
        {errors.customerName && <Text style={styles.error}>{errors.customerName.message}</Text>}
      </View>

      {/* Notes */}
      <View style={styles.field}>
        <Text style={styles.label}>Notes</Text>
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes..."
              multiline
              numberOfLines={3}
              value={value || ''}
              onChangeText={onChange}
            />
          )}
        />
        {errors.notes && <Text style={styles.error}>{errors.notes.message}</Text>}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={isSubmitting}
        >
          <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          <Text style={[styles.buttonText, styles.submitButtonText]}>
            {isSubmitting ? 'Creating...' : 'Create Transaction'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#666',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  typeButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  error: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 4,
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#333',
  },
  submitButtonText: {
    color: '#fff',
  },
});