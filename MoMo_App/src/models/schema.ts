import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'transactions',
      columns: [
        { name: 'type', type: 'string' },
        { name: 'amount', type: 'number' },
        { name: 'description', type: 'string' },
        { name: 'timestamp', type: 'number' },
        { name: 'balance', type: 'number', isOptional: true },
      ],
    }),
  ],
});