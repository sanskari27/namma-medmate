import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { InboxItem, InboxPage } from '@/services/notifications';
import { logout } from './auth.slice';

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
      state.items = state.items.map((item) =>
        item.id === action.payload.id ? action.payload : item,
      );
      state.unreadCount = state.items.filter((item) => !item.read).length;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => emptyInbox);
  },
});

export const { inboxReceived, unreadReceived, notificationRead } = notificationsSlice.actions;
export const notificationsReducer = notificationsSlice.reducer;
