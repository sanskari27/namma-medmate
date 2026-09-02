import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { LAST_ACTIVITY_KEY } from '@/hooks/useIdleLock';
import type { InboxItem, InboxPage } from '@/services/notifications';

const AUTH_STORAGE_KEY = 'nmm.dispensary.session';

export interface AuthUser {
  userId: string;
  displayName: string;
  role: string;
  tenantId: string | null;
  pinSet: boolean;
}

interface AuthState {
  user: AuthUser | null;
}

export interface NotificationsState {
  items: InboxItem[];
  unreadCount: number;
  page: number;
  size: number;
  totalPages: number;
  totalItems: number;
}

const emptyInbox: NotificationsState = {
  items: [],
  unreadCount: 0,
  page: 0,
  size: 8,
  totalPages: 0,
  totalItems: 0,
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
    logout: (state) => {
      state.user = null;
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    },
  },
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: emptyInbox,
  reducers: {
    inboxReceived: (_state, action: PayloadAction<InboxPage>) => ({
      items: action.payload.items,
      unreadCount: action.payload.unreadCount,
      page: action.payload.page,
      size: action.payload.size,
      totalPages: action.payload.totalPages,
      totalItems: action.payload.totalItems,
    }),
    unreadReceived: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    notificationRead: (state, action: PayloadAction<InboxItem>) => {
      state.items = state.items.map((item) => (item.id === action.payload.id ? action.payload : item));
      state.unreadCount = state.items.filter((item) => !item.read).length;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(authSlice.actions.logout, () => emptyInbox);
  },
});

export const { sessionStarted, pinEnrolled, logout } = authSlice.actions;
export const { inboxReceived, unreadReceived, notificationRead } = notificationsSlice.actions;
export const authReducer = authSlice.reducer;
export const notificationsReducer = notificationsSlice.reducer;

export const store = configureStore({
  reducer: { auth: authSlice.reducer, notifications: notificationsSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
