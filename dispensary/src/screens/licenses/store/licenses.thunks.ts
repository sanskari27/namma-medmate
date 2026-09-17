import { createAsyncThunk } from '@reduxjs/toolkit';
import { listBranches, type Branch } from '@/services/branches';
import { isApiError } from '@/services/axios';
import {
  createLicense,
  listLicenses,
  renewLicense,
  type ComplianceLicense,
} from '@/services/licenses';
import { listStaff, type StaffAccount } from '@/services/staff';
import type { RootState } from '@/store';
import { apiStatusHint, formValid, mapApiStatus, type PageStatus } from '../LicensesScreen.utils';

export type LicensesReject = { status: PageStatus; hint: string | null };

export const loadLicenses = createAsyncThunk<
  { items: ComplianceLicense[]; branches: Branch[]; staff: StaffAccount[]; emptyHint: string | null },
  void,
  { rejectValue: LicensesReject; state: RootState }
>('licenses/load', async (_, { rejectWithValue, getState }) => {
  try {
    const [licenses, branches, staff] = await Promise.all([
      listLicenses(),
      listBranches().catch(() => [] as Branch[]),
      listStaff().catch(() => [] as StaffAccount[]),
    ]);
    const owner = getState().auth.user?.role === 'pharmacy_owner';
    return {
      items: licenses.items,
      branches,
      staff,
      emptyHint:
        !owner && licenses.items.length === 0
          ? 'Your staff licence is on file with the owner.'
          : null,
    };
  } catch (error) {
    if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
      return rejectWithValue({
        status: 'denied',
        hint: 'Your staff licence is on file with the owner.',
      });
    }
    if (isApiError(error)) {
      return rejectWithValue({ status: mapApiStatus(error), hint: null });
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});

export const saveLicense = createAsyncThunk<
  { hint: string },
  void,
  { state: RootState; rejectValue: LicensesReject }
>('licenses/save', async (_, { getState, dispatch, rejectWithValue }) => {
  const screen = getState().licenses;
  const creating = screen.creating || !screen.selectedId;
  if (!formValid(screen.form, creating) || !screen.form.evidence) {
    return rejectWithValue({ status: 'validation', hint: null });
  }
  try {
    if (creating) {
      await createLicense({
        docType: screen.form.docType,
        scope: screen.form.scope,
        branchId: screen.form.scope === 'BRANCH' ? screen.form.branchId : undefined,
        staffUserId: screen.form.scope === 'STAFF' ? screen.form.staffUserId : undefined,
        licenseNumber: screen.form.licenseNumber.trim(),
        issuedOn: screen.form.issuedOn,
        expiresOn: screen.form.expiresOn,
        evidence: screen.form.evidence,
      });
      await dispatch(loadLicenses());
      return { hint: 'Licence filed.' };
    }
    const selected = screen.items.find((row) => row.id === screen.selectedId);
    if (!selected) {
      return rejectWithValue({ status: 'validation', hint: null });
    }
    await renewLicense(selected.id, {
      licenseNumber: screen.form.licenseNumber.trim(),
      issuedOn: screen.form.issuedOn,
      expiresOn: screen.form.expiresOn,
      evidence: screen.form.evidence,
      expectedVersion: selected.version,
    });
    await dispatch(loadLicenses());
    return { hint: 'Renewal filed. Prior papers stay on this record.' };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({ status: mapApiStatus(error), hint: apiStatusHint(error.code) });
    }
    return rejectWithValue({
      status: 'failure',
      hint: 'Could not file this licence. Check the connection and try again.',
    });
  }
});
