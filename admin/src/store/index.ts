import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';

const AUTH_STORAGE_KEY = 'nmm.admin.session';

export interface AuthUser {
  userId: string;
  displayName: string;
  role: string;
  tenantId: string | null;
}

interface AuthState {
  user: AuthUser | null;
}

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

const initialState: AuthState = {
  user: readStoredUser(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionStarted: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.user = null;
      localStorage.removeItem(AUTH_STORAGE_KEY);
    },
  },
});

export const { sessionStarted, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;

export const store = configureStore({
  reducer: { auth: authSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
