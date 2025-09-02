import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
  isBiometricAvailable: boolean;
  isBiometricEnrolled: boolean;
  failedAttempts: number;
  isLocked: boolean;
  lockoutUntil: number | null;
  lastAuthTime: number | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isBiometricAvailable: false,
  isBiometricEnrolled: false,
  failedAttempts: 0,
  isLocked: false,
  lockoutUntil: null,
  lastAuthTime: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setBiometricStatus: (state, action: PayloadAction<{ available: boolean; enrolled: boolean }>) => {
      state.isBiometricAvailable = action.payload.available;
      state.isBiometricEnrolled = action.payload.enrolled;
    },
    authenticate: (state) => {
      state.isAuthenticated = true;
      state.failedAttempts = 0;
      state.isLocked = false;
      state.lockoutUntil = null;
      state.lastAuthTime = Date.now();
    },
    failAuthentication: (state) => {
      state.isAuthenticated = false;
      state.failedAttempts += 1;
      if (state.failedAttempts >= 5) {
        state.isLocked = true;
        state.lockoutUntil = Date.now() + 5 * 60 * 1000; // 5 minutes lockout
      }
    },
    resetFailedAttempts: (state) => {
      state.failedAttempts = 0;
      state.isLocked = false;
      state.lockoutUntil = null;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.lastAuthTime = null;
    },
    checkLockout: (state) => {
      if (state.isLocked && state.lockoutUntil && Date.now() > state.lockoutUntil) {
        state.isLocked = false;
        state.lockoutUntil = null;
        state.failedAttempts = 0;
      }
    },
  },
});

export const {
  setBiometricStatus,
  authenticate,
  failAuthentication,
  resetFailedAttempts,
  logout,
  checkLockout,
} = authSlice.actions;

export default authSlice.reducer;