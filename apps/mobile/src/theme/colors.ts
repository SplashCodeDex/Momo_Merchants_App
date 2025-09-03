// MoMo Merchant Companion App - Design System Colors
// Modern, accessible color palette with consistent theming

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Main primary color
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },

  // Secondary Colors (Teal/Accent)
  secondary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6', // Main secondary color
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e',
  },

  // Success States
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main success color
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },

  // Warning States
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Main warning color
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  // Error/Danger States
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main error color
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },

  // Neutral Grays
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280', // Main gray color
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },

  // Background Colors
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
    overlay: 'rgba(0, 0, 0, 0.5)',
    modal: 'rgba(0, 0, 0, 0.6)',
  },

  // Text Colors
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
    muted: '#d1d5db',
  },

  // Border Colors
  border: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
    focus: '#0ea5e9',
  },

  // Shadow Colors
  shadow: {
    sm: 'rgba(0, 0, 0, 0.05)',
    md: 'rgba(0, 0, 0, 0.1)',
    lg: 'rgba(0, 0, 0, 0.15)',
    xl: 'rgba(0, 0, 0, 0.25)',
  },

  // Special Purpose Colors
  special: {
    offline: '#f59e0b',
    online: '#22c55e',
    sync: '#0ea5e9',
    pending: '#f59e0b',
    error: '#ef4444',
    success: '#22c55e',
  },

  // Transaction Type Colors
  transaction: {
    deposit: '#22c55e',
    withdrawal: '#ef4444',
    bill_payment: '#0ea5e9',
    airtime: '#8b5cf6',
  },
} as const;

// Semantic color mappings for easy usage
export const semanticColors = {
  // Status colors
  online: colors.special.online,
  offline: colors.special.offline,
  syncing: colors.special.sync,
  pending: colors.special.pending,
  error: colors.error[500],
  success: colors.success[500],

  // Transaction colors
  deposit: colors.transaction.deposit,
  withdrawal: colors.transaction.withdrawal,
  billPayment: colors.transaction.bill_payment,
  airtime: colors.transaction.airtime,

  // UI colors
  primary: colors.primary[500],
  secondary: colors.secondary[500],
  background: colors.background.primary,
  surface: colors.background.secondary,
  text: colors.text.primary,
  textSecondary: colors.text.secondary,
  border: colors.border.light,
  shadow: colors.shadow.md,
} as const;

// Export types for TypeScript
export type ColorPalette = typeof colors;
export type SemanticColors = typeof semanticColors;
export type PrimaryColors = typeof colors.primary;
export type StatusColors = keyof typeof semanticColors;