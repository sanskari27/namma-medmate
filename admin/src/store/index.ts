import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { LAST_ACTIVITY_KEY } from '@/hooks/useIdleLock';
import type { HqInboxItem, HqInboxPage } from '@/services/inbox';

const AUTH_STORAGE_KEY = 'nmm.admin.session';

export interface AuthUser {
  userId: string;
  displayName: string;
  role: string;
  tenantId: string | null;
  pinSet: boolean;
  mustChangePassword?: boolean;
}

interface AuthState {
  user: AuthUser | null;
}

export interface InboxState {
  rows: HqInboxItem[];
  unread: number;
  page: number;
  pageSize: number;
  pageCount: number;
  rowCount: number;
}

const emptyInbox: InboxState = {
  rows: [],
  unread: 0,
  page: 0,
  pageSize: 6,
  pageCount: 0,
  rowCount: 0,
};

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

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: readStoredUser() } as AuthState,
  reducers: {
    sessionStarted: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(action.payload));
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    },
    pinEnrolled: (state) => {
      if (state.user) {
        state.user.pinSet = true;
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state.user));
      }
    },
    passwordChanged: (state) => {
      if (state.user) {
        state.user.mustChangePassword = false;
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state.user));
      }
    },
    logout: (state) => {
      state.user = null;
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    },
  },
});

const inboxSlice = createSlice({
  name: 'inbox',
  initialState: emptyInbox,
  reducers: {
    inboxPageLoaded: (_state, action: PayloadAction<HqInboxPage>) => ({
      rows: action.payload.items,
      unread: action.payload.unreadCount,
      page: action.payload.page,
      pageSize: action.payload.size,
      pageCount: action.payload.totalPages,
      rowCount: action.payload.totalItems,
    }),
    unreadLoaded: (state, action: PayloadAction<number>) => {
      state.unread = action.payload;
    },
    inboxRowFiled: (state, action: PayloadAction<HqInboxItem>) => {
      state.rows = state.rows.map((row) => (row.id === action.payload.id ? action.payload : row));
      state.unread = state.rows.filter((row) => !row.read).length;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(authSlice.actions.logout, () => emptyInbox);
  },
});

export const { sessionStarted, pinEnrolled, passwordChanged, logout } = authSlice.actions;
export const { inboxPageLoaded, unreadLoaded, inboxRowFiled } = inboxSlice.actions;
export const authReducer = authSlice.reducer;
export const inboxReducer = inboxSlice.reducer;

export const store = configureStore({
  reducer: { auth: authSlice.reducer, inbox: inboxSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
