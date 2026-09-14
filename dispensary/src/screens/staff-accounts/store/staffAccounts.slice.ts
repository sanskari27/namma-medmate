import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { StaffAccount } from '@/services/staff';
import { loadStaff } from './staffAccounts.thunks';

export type StaffPageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;

export type StaffAccountsState = {
  status: StaffPageStatus;
  banner: string | null;
  items: StaffAccount[];
  search: string;
  addOpen: boolean;
};

export const initialStaffAccountsState: StaffAccountsState = {
  status: 'loading',
  banner: null,
  items: [],
  search: '',
  addOpen: false,
};

const staffAccountsSlice = createSlice({
  name: 'staffAccounts',
  initialState: initialStaffAccountsState,
  reducers: {
    accessDenied(state, action: PayloadAction<string>) {
      state.status = 'denied';
      state.banner = action.payload;
    },
    searchChanged(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    addOpened(state, action: PayloadAction<boolean>) {
      state.addOpen = action.payload;
    },
    bannerSet(state, action: PayloadAction<string | null>) {
      state.banner = action.payload;
      if (action.payload) {
        state.status = 'success';
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadStaff.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadStaff.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = action.payload.some((row) => row.role === 'pharmacy_staff') ? null : 'empty';
      })
      .addCase(loadStaff.rejected, (state) => {
        state.status = 'failure';
      });
  },
});

export const { accessDenied, searchChanged, addOpened, bannerSet } = staffAccountsSlice.actions;
export const staffAccountsReducer = staffAccountsSlice.reducer;
