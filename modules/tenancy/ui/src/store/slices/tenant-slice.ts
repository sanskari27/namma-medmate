import { createSlice } from '@reduxjs/toolkit';
import { tenancyApi } from '../api/tenancy-api.ts';

export type TenantStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface TenantState {
  status: TenantStatus;
  tenantId?: string;
  locationId?: string;
  displayName?: string;
  message?: string;
}

const initialState: TenantState = { status: 'idle' };

export const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    resetTenant: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(tenancyApi.endpoints.getCurrent.matchPending, (state) => {
        state.status = 'loading';
        state.message = undefined;
      })
      .addMatcher(tenancyApi.endpoints.getCurrent.matchFulfilled, (state, action) => {
        state.status = 'ready';
        state.tenantId = action.payload.tenant_id;
        state.locationId = action.payload.location.location_id;
        state.displayName = action.payload.location.display_name;
      })
      .addMatcher(tenancyApi.endpoints.getCurrent.matchRejected, (state) => {
        state.status = 'error';
        state.message = 'tenancy.errors.locationIdRequired';
      })
      .addMatcher(tenancyApi.endpoints.patchCurrent.matchFulfilled, (state, action) => {
        state.status = 'ready';
        state.displayName = action.payload.location.display_name;
        state.locationId = action.payload.location.location_id;
        state.tenantId = action.payload.tenant_id;
      });
  },
});

export const { resetTenant } = tenantSlice.actions;
