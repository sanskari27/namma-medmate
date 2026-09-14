import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ControlledSaleLine } from '@/services/controlledRegister';
import { emptyFilters, type FilterState, type PageStatus } from '../ControlledRegisterScreen.utils';
import { exportControlledRegister, loadControlledRegister } from './controlledRegister.thunks';

export type ControlledRegisterState = {
  status: PageStatus;
  statusHint: string | null;
  items: ControlledSaleLine[];
  filters: FilterState;
  busy: boolean;
};

const controlledRegisterSlice = createSlice({
  name: 'controlledRegister',
  initialState: {
    status: 'loading' as PageStatus,
    statusHint: null as string | null,
    items: [] as ControlledSaleLine[],
    filters: emptyFilters(),
    busy: false,
  },
  reducers: {
    accessDenied(state) {
      state.status = 'denied';
    },
    filtersChanged(state, action: PayloadAction<FilterState>) {
      state.filters = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadControlledRegister.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadControlledRegister.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = action.payload.length === 0 ? 'empty' : null;
      })
      .addCase(loadControlledRegister.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(exportControlledRegister.pending, (state) => {
        state.busy = true;
      })
      .addCase(exportControlledRegister.fulfilled, (state, action) => {
        state.busy = false;
        state.status = 'success';
        state.statusHint = action.payload;
      })
      .addCase(exportControlledRegister.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      });
  },
});

export const { accessDenied, filtersChanged } = controlledRegisterSlice.actions;
export const controlledRegisterReducer = controlledRegisterSlice.reducer;
