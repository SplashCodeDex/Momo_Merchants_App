import { z } from 'zod';

// Base transaction schema
export const transactionSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'bill_payment', 'airtime'], {
    errorMap: () => ({ message: 'Please select a valid transaction type' }),
  }),
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be greater than 0')
    .max(100000, 'Amount cannot exceed GHS 100,000'),
  customerNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\+?[1-9]\d{1,14}$/.test(val),
      'Please enter a valid phone number'
    ),
  customerName: z
    .string()
    .min(1, 'Customer name is required')
    .max(100, 'Customer name cannot exceed 100 characters')
    .optional(),
  commission: z
    .number()
    .min(0, 'Commission cannot be negative')
    .max(10000, 'Commission cannot exceed GHS 10,000')
    .optional(),
  balanceAfter: z
    .number()
    .optional(),
  notes: z
    .string()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional(),
  merchantId: z.string().min(1, 'Merchant is required'),
  userId: z.string().min(1, 'User is required'),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
});

// Schema for creating new transactions
export const createTransactionSchema = transactionSchema.extend({
  customerName: z
    .string()
    .min(1, 'Customer name is required when customer number is provided')
    .max(100, 'Customer name cannot exceed 100 characters')
    .optional(),
}).refine(
  (data) => {
    // If customer number is provided, customer name is required
    if (data.customerNumber && !data.customerName) {
      return false;
    }
    return true;
  },
  {
    message: 'Customer name is required when customer number is provided',
    path: ['customerName'],
  }
);

// Schema for updating transactions
export const updateTransactionSchema = transactionSchema.partial().extend({
  customerNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\+?[1-9]\d{1,14}$/.test(val),
      'Please enter a valid phone number'
    ),
  customerName: z
    .string()
    .max(100, 'Customer name cannot exceed 100 characters')
    .optional(),
});

// Schema for transaction filters
export const transactionFiltersSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'bill_payment', 'airtime']).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  amountMin: z.number().min(0).optional(),
  amountMax: z.number().max(100000).optional(),
  customerNumber: z.string().optional(),
  merchantId: z.string().optional(),
  userId: z.string().optional(),
  syncStatus: z.enum(['pending', 'synced', 'error', 'conflict']).optional(),
});

// Schema for transaction statistics
export const transactionStatsSchema = z.object({
  totalCount: z.number().min(0),
  totalVolume: z.number().min(0),
  totalCommission: z.number().min(0),
  pendingCount: z.number().min(0),
  syncedCount: z.number().min(0),
  errorCount: z.number().min(0),
});

// Schema for sync operations
export const syncOperationSchema = z.object({
  operation: z.enum(['create', 'update', 'delete']),
  tableName: z.string().min(1),
  recordId: z.string().min(1),
  data: z.string(), // JSON string
  priority: z.number().min(0).max(10),
  batchId: z.string().optional(),
});

// Schema for sync response
export const syncResponseSchema = z.object({
  synced: z.array(z.object({
    offlineId: z.string(),
    serverId: z.string(),
    status: z.enum(['created', 'updated', 'conflict']),
  })),
  conflicts: z.array(z.object({
    offlineId: z.string(),
    serverData: z.any(),
    clientData: z.any(),
    conflictReason: z.string(),
  })),
  nextSyncToken: z.string().optional(),
});

// Type exports
export type TransactionFormData = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionData = z.infer<typeof updateTransactionSchema>;
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
export type TransactionStats = z.infer<typeof transactionStatsSchema>;
export type SyncOperation = z.infer<typeof syncOperationSchema>;
export type SyncResponse = z.infer<typeof syncResponseSchema>;

// Validation helper functions
export const validateTransaction = (data: unknown): { success: true; data: TransactionFormData } | { success: false; errors: z.ZodError } => {
  const result = createTransactionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
};

export const validateTransactionUpdate = (data: unknown): { success: true; data: UpdateTransactionData } | { success: false; errors: z.ZodError } => {
  const result = updateTransactionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
};

export const validateTransactionFilters = (data: unknown): { success: true; data: TransactionFilters } | { success: false; errors: z.ZodError } => {
  const result = transactionFiltersSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
};