import { createSlice } from '@reduxjs/toolkit';
import type { DpdpCategory, DpdpRequest } from '@/services/dpdp';
import type { PrivacyStatus } from '../PrivacyDeskScreen.utils';
import { acceptRequest, closeRequest, loadPrivacyDesk, logRequest } from './privacyDesk.thunks';

const privacyDeskSlice = createSlice({
  name: 'privacyDesk',
  initialState: {
    status: 'loading' as PrivacyStatus,
    items: [] as DpdpRequest[],
    matrix: [] as DpdpCategory[],
    selectedId: null as string | null,
  },
  reducers: {
    accessDenied(state) {
      state.status = 'denied';
    },
    selectRequest(state, action: { payload: string }) {
      state.selectedId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPrivacyDesk.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.matrix = action.payload.matrix;
        state.status = action.payload.items.length === 0 ? 'empty' : null;
      })
      .addCase(loadPrivacyDesk.rejected, (state, action) => {
        state.status = action.payload ?? 'failure';
      })
      .addCase(logRequest.fulfilled, (state, action) => {
        state.items = [action.payload, ...state.items.filter((row) => row.id !== action.payload.id)];
        state.selectedId = action.payload.id;
        state.status = 'success';
      })
      .addCase(logRequest.rejected, (state, action) => {
        state.status = action.payload ?? 'failure';
      })
      .addCase(acceptRequest.fulfilled, (state, action) => {
        state.items = state.items.map((row) => (row.id === action.payload.id ? action.payload : row));
        state.status = 'success';
      })
      .addCase(acceptRequest.rejected, (state, action) => {
        state.status = action.payload ?? 'failure';
      })
      .addCase(closeRequest.fulfilled, (state, action) => {
        state.items = state.items.map((row) => (row.id === action.payload.id ? action.payload : row));
        state.status = 'success';
      })
      .addCase(closeRequest.rejected, (state, action) => {
        state.status = action.payload ?? 'failure';
      });
  },
});

export const { accessDenied, selectRequest } = privacyDeskSlice.actions;
export const privacyDeskReducer = privacyDeskSlice.reducer;
