import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { HqInboxItem, HqInboxPage } from '@/services/inbox';
import { logout } from './auth.slice';

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
    builder.addCase(logout, () => emptyInbox);
  },
});

export const { inboxPageLoaded, unreadLoaded, inboxRowFiled } = inboxSlice.actions;
export const inboxReducer = inboxSlice.reducer;
