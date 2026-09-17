import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Branch } from '@/services/branches';
import type { ComplianceLicense } from '@/services/licenses';
import type { StaffAccount } from '@/services/staff';
import { emptyForm, type FormState, type PageStatus } from '../LicensesScreen.utils';
import { loadLicenses, saveLicense } from './licenses.thunks';

export type LicensesScreenState = {
  status: PageStatus;
  statusHint: string | null;
  items: ComplianceLicense[];
  branches: Branch[];
  staff: StaffAccount[];
  selectedId: string | null;
  creating: boolean;
  form: FormState;
  busy: boolean;
};

export const initialLicensesScreenState: LicensesScreenState = {
  status: 'loading',
  statusHint: null,
  items: [],
  branches: [],
  staff: [],
  selectedId: null,
  creating: false,
  form: emptyForm(),
  busy: false,
};

const licensesSlice = createSlice({
  name: 'licenses',
  initialState: initialLicensesScreenState,
  reducers: {
    accessDenied(state, action: PayloadAction<string>) {
      state.status = 'denied';
      state.statusHint = action.payload;
    },
    formPatched(state, action: PayloadAction<Partial<FormState>>) {
      const next = { ...state.form, ...action.payload };
      if (action.payload.docType === 'PHARMACIST_REGISTRATION') {
        next.scope = 'STAFF';
        next.branchId = '';
      } else if (action.payload.docType && state.form.docType === 'PHARMACIST_REGISTRATION') {
        next.scope = 'TENANT';
        next.staffUserId = '';
      }
      if (action.payload.scope === 'TENANT') {
        next.branchId = '';
        next.staffUserId = '';
      }
      if (action.payload.scope === 'BRANCH') {
        next.staffUserId = '';
      }
      state.form = next;
    },
    startCreate(state) {
      state.creating = true;
      state.selectedId = null;
      state.form = emptyForm();
      state.status = null;
      state.statusHint = null;
    },
    licenseSelected(state, action: PayloadAction<string>) {
      const row = state.items.find((item) => item.id === action.payload);
      if (!row) {
        return;
      }
      state.creating = false;
      state.selectedId = row.id;
      state.form = {
        docType: row.docType,
        scope: row.scope,
        branchId: row.branchId ?? '',
        staffUserId: row.staffUserId ?? '',
        licenseNumber: row.licenseNumber,
        issuedOn: row.issuedOn,
        expiresOn: row.expiresOn,
        evidence: null,
      };
      state.status = null;
      state.statusHint = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadLicenses.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadLicenses.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.branches = action.payload.branches;
        state.staff = action.payload.staff;
        state.status = action.payload.items.length === 0 ? 'empty' : null;
        state.statusHint = action.payload.emptyHint;
      })
      .addCase(loadLicenses.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(saveLicense.pending, (state) => {
        state.busy = true;
      })
      .addCase(saveLicense.fulfilled, (state, action) => {
        state.busy = false;
        state.creating = false;
        state.status = 'success';
        state.statusHint = action.payload.hint;
      })
      .addCase(saveLicense.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      });
  },
});

export const { accessDenied, formPatched, startCreate, licenseSelected } = licensesSlice.actions;
export const licensesReducer = licensesSlice.reducer;
