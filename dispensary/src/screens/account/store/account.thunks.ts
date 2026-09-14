import { createAsyncThunk } from '@reduxjs/toolkit';
import { listBranches, type Branch } from '@/services/branches';
import { isApiError } from '@/services/axios';
import { listLicenses, type ComplianceLicense } from '@/services/licenses';
import { listStaff, type StaffAccount } from '@/services/staff';
import { getCurrentSubscription, type CurrentSubscription } from '@/services/subscriptions';
import {
  getKycStatus,
  submitKyc,
  type KycStatus,
  type KycSubmitInput,
} from '@/services/tenant';
import type { RootState } from '@/store';
import { mapApiStatus, type PageStatus } from '../AccountScreen.utils';

export type AccountReject = { status: PageStatus; hint: string | null };

export type AccountSnapshot = {
  pack: KycStatus;
  subscription: CurrentSubscription | null;
  staff: StaffAccount[];
  licenses: ComplianceLicense[];
  branches: Branch[];
};

export const loadAccount = createAsyncThunk<
  AccountSnapshot,
  void,
  { state: RootState; rejectValue: AccountReject }
>('account/load', async (_, { getState, rejectWithValue }) => {
  const tenantId = getState().auth.user?.tenantId;
  if (!tenantId) {
    return rejectWithValue({ status: 'denied', hint: null });
  }
  try {
    const [pack, subscription, staff, licenses, branches] = await Promise.all([
      getKycStatus(tenantId),
      getCurrentSubscription().catch(() => null),
      listStaff().catch(() => [] as StaffAccount[]),
      listLicenses()
        .then((page) => page.items)
        .catch(() => [] as ComplianceLicense[]),
      listBranches().catch(() => [] as Branch[]),
    ]);
    return { pack, subscription, staff, licenses, branches };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({ status: mapApiStatus(error), hint: null });
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});

export const submitKycPack = createAsyncThunk<
  KycStatus,
  KycSubmitInput,
  { state: RootState; rejectValue: AccountReject }
>('account/submitKyc', async (input, { getState, rejectWithValue }) => {
  const tenantId = getState().auth.user?.tenantId;
  if (!tenantId) {
    return rejectWithValue({ status: 'denied', hint: null });
  }
  try {
    return await submitKyc(tenantId, input);
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({ status: mapApiStatus(error), hint: null });
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});
