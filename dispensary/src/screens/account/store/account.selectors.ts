import type { RootState } from '@/store';
import {
  canSubmitKyc,
  completenessItems,
  pickOutlet,
  teamByRole,
} from '../AccountScreen.utils';

export const selectAccountStatus = (state: RootState) => state.account.status;
export const selectAccountStatusHint = (state: RootState) => state.account.statusHint;
export const selectAccountPack = (state: RootState) => state.account.pack;
export const selectAccountSubscription = (state: RootState) => state.account.subscription;
export const selectAccountStaff = (state: RootState) => state.account.staff;
export const selectAccountLicenses = (state: RootState) => state.account.licenses;
export const selectAccountBranches = (state: RootState) => state.account.branches;
export const selectAccountBusy = (state: RootState) => state.account.busy;

export const selectAccountOutlet = (state: RootState) => pickOutlet(state.account.branches);

export const selectAccountTeam = (state: RootState) => teamByRole(state.account.staff);

export const selectAccountTodos = (state: RootState) =>
  completenessItems(
    state.account.pack,
    state.account.licenses,
    state.account.branches,
    state.account.staff,
  );

export const selectCanSubmitKyc = (state: RootState) =>
  canSubmitKyc(
    state.auth.user?.role === 'pharmacy_owner',
    state.account.pack,
    state.auth.user?.tenantStatus,
  );
