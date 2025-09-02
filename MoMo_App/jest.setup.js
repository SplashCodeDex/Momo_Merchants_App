// Mock React Native modules that might cause issues
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
}));

// Mock Expo modules
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

// Mock WatermelonDB
jest.mock('@nozbe/watermelondb', () => ({
  Database: jest.fn(),
}));

jest.mock('@nozbe/watermelondb/adapters/sqlite', () => ({
  SQLiteAdapter: jest.fn(),
}));

// Mock Redux
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
  Provider: ({ children }) => children,
}));

// Global test setup
global.fetch = jest.fn();