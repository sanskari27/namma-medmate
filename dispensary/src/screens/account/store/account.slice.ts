import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Branch } from '@/services/branches';
import type { ComplianceLicense } from '@/services/licenses';
import type { StaffAccount } from '@/services/staff';
import type { CurrentSubscription } from '@/services/subscriptions';
import type { KycStatus } from '@/services/tenant';
import type { PageStatus } from '../AccountScreen.utils';
import { loadAccount, submitKycPack } from './account.thunks';

export type AccountScreenState = {
  status: PageStatus;
  statusHint: string | null;
  pack: KycStatus | null;
  subscription: CurrentSubscription | null;
  staff: StaffAccount[];
  licenses: ComplianceLicense[];
  branches: Branch[];
  busy: boolean;
};

export const initialAccountScreenState: AccountScreenState = {
  status: 'loading',
  statusHint: null,
  pack: null,
  subscription: null,
  staff: [],
  licenses: [],
  branches: [],
  busy: false,
};

function statusFromPack(pack: KycStatus): PageStatus {
  if (pack.status === 'SUBMITTED') {
    return 'submitted';
  }
  if (pack.status === 'REJECTED') {
    return 'rejected';
  }
  if (pack.status === 'APPROVED' || pack.tenantStatus === 'ACTIVE') {
    return 'approved';
  }
  return 'empty';
}

const accountSlice = createSlice({
  name: 'account',
  initialState: initialAccountScreenState,
  reducers: {
    accessDenied(state, action: PayloadAction<string>) {
      state.status = 'denied';
      state.statusHint = action.payload;
    },
    statusSet(state, action: PayloadAction<{ status: PageStatus; hint?: string | null }>) {
      state.status = action.payload.status;
      state.statusHint = action.payload.hint ?? null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAccount.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadAccount.fulfilled, (state, action) => {
        state.pack = action.payload.pack;
        state.subscription = action.payload.subscription;
        state.staff = action.payload.staff;
        state.licenses = action.payload.licenses;
        state.branches = action.payload.branches;
        state.status = statusFromPack(action.payload.pack);
        if (action.payload.pack.status === 'REJECTED' && action.payload.pack.rejectionReason) {
          state.statusHint = action.payload.pack.rejectionReason;
        }
      })
      .addCase(loadAccount.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(submitKycPack.pending, (state) => {
        state.busy = true;
        state.status = 'loading';
      })
      .addCase(submitKycPack.fulfilled, (state, action) => {
        state.busy = false;
        state.pack = action.payload;
        state.status = 'success';
      })
      .addCase(submitKycPack.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      });
  },
});

export const { accessDenied, statusSet } = accountSlice.actions;
export const accountReducer = accountSlice.reducer;
