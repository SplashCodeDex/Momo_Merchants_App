import React from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';
import { TransactionFormData, createTransactionSchema, validateTransaction } from '../../types/transactions';
import { transactionService } from '../../services/transactions';
import AnimatedCard from '../ui/AnimatedCard';
import AnimatedButton from '../ui/AnimatedButton';
import AnimatedSpinner from '../ui/AnimatedSpinner';
import { colors, semanticColors } from '../../theme/colors';

interface ModernTransactionFormProps {
  merchantId: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const TRANSACTION_TYPES = [
  { label: 'Deposit', value: 'deposit' as const, icon: '↓', color: semanticColors.deposit },
  { label: 'Withdrawal', value: 'withdrawal' as const, icon: '↑', color: semanticColors.withdrawal },
  { label: 'Bill Payment', value: 'bill_payment' as const, icon: '📄', color: semanticColors.billPayment },
  { label: 'Airtime', value: 'airtime' as const, icon: '📱', color: semanticColors.airtime },
];

export const ModernTransactionForm: React.FC<ModernTransactionFormProps> = ({
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

  const renderTransactionTypeSelector = () => (
    <Animated.View entering={FadeInUp.delay(100)} style={styles.field}>
      <Text style={styles.label}>Transaction Type *</Text>
      <View style={styles.typeSelector}>
        {TRANSACTION_TYPES.map((type, index) => (
          <AnimatedCard
            key={type.value}
            delay={200 + index * 100}
            variant="scale"
            style={[
              styles.typeButton,
              selectedType === type.value && styles.typeButtonSelected,
            ]}
          >
            <TouchableOpacity
              style={styles.typeButtonContent}
              onPress={() => setValue('type', type.value)}
            >
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <Text
                style={[
                  styles.typeButtonText,
                  selectedType === type.value && styles.typeButtonTextSelected,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          </AnimatedCard>
        ))}
      </View>
      {errors.type && <Text style={styles.error}>{errors.type.message}</Text>}
    </Animated.View>
  );

  const renderAmountField = () => (
    <Animated.View entering={FadeInUp.delay(300)} style={styles.field}>
      <Text style={styles.label}>Amount (GHS) *</Text>
      <Controller
        control={control}
        name="amount"
        render={({ field: { onChange, value } }) => (
          <AnimatedCard variant="slideUp" delay={400}>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
              value={value?.toString() || ''}
              onChangeText={(text) => {
                onChange(parseFloat(text) || 0);
                handleAmountChange(text);
              }}
              placeholderTextColor={colors.text.muted}
            />
          </AnimatedCard>
        )}
      />
      {errors.amount && <Text style={styles.error}>{errors.amount.message}</Text>}
    </Animated.View>
  );

  const renderCommissionField = () => (
    <Animated.View entering={FadeInUp.delay(500)} style={styles.field}>
      <Text style={styles.label}>Commission (GHS)</Text>
      <Controller
        control={control}
        name="commission"
        render={({ field: { value } }) => (
          <AnimatedCard variant="slideUp" delay={600} style={styles.disabledCard}>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              placeholder="0.00"
              keyboardType="numeric"
              value={value?.toString() || '0.00'}
              editable={false}
              placeholderTextColor={colors.text.muted}
            />
          </AnimatedCard>
        )}
      />
      <Text style={styles.hint}>Calculated automatically based on transaction type</Text>
    </Animated.View>
  );

  const renderCustomerFields = () => (
    <Animated.View entering={FadeInUp.delay(700)} style={styles.customerFields}>
      <View style={styles.field}>
        <Text style={styles.label}>Customer Phone Number</Text>
        <Controller
          control={control}
          name="customerNumber"
          render={({ field: { onChange, value } }) => (
            <AnimatedCard variant="slideUp" delay={800}>
              <TextInput
                style={styles.input}
                placeholder="+233501234567"
                keyboardType="phone-pad"
                value={value || ''}
                onChangeText={onChange}
                placeholderTextColor={colors.text.muted}
              />
            </AnimatedCard>
          )}
        />
        {errors.customerNumber && <Text style={styles.error}>{errors.customerNumber.message}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Customer Name</Text>
        <Controller
          control={control}
          name="customerName"
          render={({ field: { onChange, value } }) => (
            <AnimatedCard variant="slideUp" delay={900}>
              <TextInput
                style={styles.input}
                placeholder="Enter customer name"
                value={value || ''}
                onChangeText={onChange}
                placeholderTextColor={colors.text.muted}
              />
            </AnimatedCard>
          )}
        />
        {errors.customerName && <Text style={styles.error}>{errors.customerName.message}</Text>}
      </View>
    </Animated.View>
  );

  const renderNotesField = () => (
    <Animated.View entering={FadeInUp.delay(1000)} style={styles.field}>
      <Text style={styles.label}>Notes</Text>
      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, value } }) => (
          <AnimatedCard variant="slideUp" delay={1100}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes..."
              multiline
              numberOfLines={3}
              value={value || ''}
              onChangeText={onChange}
              placeholderTextColor={colors.text.muted}
            />
          </AnimatedCard>
        )}
      />
      {errors.notes && <Text style={styles.error}>{errors.notes.message}</Text>}
    </Animated.View>
  );

  const renderActionButtons = () => (
    <Animated.View entering={FadeInDown.delay(1200)} style={styles.buttonContainer}>
      <AnimatedButton
        title="Cancel"
        onPress={onCancel}
        variant="outline"
        disabled={isSubmitting}
        style={styles.cancelButton}
      />

      <AnimatedButton
        title={isSubmitting ? '' : 'Create Transaction'}
        onPress={handleSubmit(onSubmit)}
        variant="primary"
        disabled={isSubmitting}
        style={styles.submitButton}
        fullWidth
        icon={isSubmitting ? <AnimatedSpinner size="small" color={colors.text.inverse} /> : undefined}
      />
    </Animated.View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInUp} style={styles.header}>
        <Text style={styles.title}>New Transaction</Text>
        <Text style={styles.subtitle}>Create a new transaction with ease</Text>
      </Animated.View>

      {renderTransactionTypeSelector()}
      {renderAmountField()}
      {renderCommissionField()}
      {renderCustomerFields()}
      {renderNotesField()}
      {renderActionButtons()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: colors.background.primary,
    color: colors.text.primary,
    shadowColor: colors.shadow.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledCard: {
    opacity: 0.7,
  },
  disabledInput: {
    backgroundColor: colors.background.tertiary,
    color: colors.text.secondary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.border.light,
  },
  typeButtonSelected: {
    borderColor: semanticColors.primary,
    backgroundColor: colors.primary[50],
  },
  typeButtonContent: {
    padding: 16,
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  typeButtonTextSelected: {
    color: semanticColors.primary,
  },
  customerFields: {
    gap: 16,
  },
  error: {
    color: semanticColors.error,
    fontSize: 14,
    marginTop: 4,
  },
  hint: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});

export default ModernTransactionForm;