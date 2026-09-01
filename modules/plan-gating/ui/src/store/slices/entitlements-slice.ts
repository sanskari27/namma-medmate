import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Entitlements } from '../api/plan-gating-api.ts';

export interface EntitlementsState {
  status: 'idle' | 'ready';
  data?: Entitlements;
}

const initialState: EntitlementsState = { status: 'idle' };

export const entitlementsSlice = createSlice({
  name: 'entitlements',
  initialState,
  reducers: {
    setEntitlements(state, action: PayloadAction<Entitlements>) {
      state.status = 'ready';
      state.data = action.payload;
    },
  },
});

export const { setEntitlements } = entitlementsSlice.actions;
