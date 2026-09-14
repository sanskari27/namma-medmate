import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AccessRole, ModuleCatalogItem } from '@/services/roles';
import { loadRoles } from './counterRoles.thunks';

export type RolesStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;

export type CounterRolesState = {
  status: RolesStatus;
  banner: string | null;
  roles: AccessRole[];
  catalog: ModuleCatalogItem[];
  addOpen: boolean;
};

export const initialCounterRolesState: CounterRolesState = {
  status: 'loading',
  banner: null,
  roles: [],
  catalog: [],
  addOpen: false,
};

const counterRolesSlice = createSlice({
  name: 'counterRoles',
  initialState: initialCounterRolesState,
  reducers: {
    accessDenied(state, action: PayloadAction<string>) {
      state.status = 'denied';
      state.banner = action.payload;
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
      .addCase(loadRoles.fulfilled, (state, action) => {
        state.roles = action.payload.roles;
        state.catalog = action.payload.catalog;
        state.status = action.payload.roles.some((row) => row.kind === 'CUSTOM') ? null : 'empty';
      })
      .addCase(loadRoles.rejected, (state) => {
        state.status = 'failure';
      });
  },
});

export const { accessDenied, addOpened, bannerSet } = counterRolesSlice.actions;
export const counterRolesReducer = counterRolesSlice.reducer;
