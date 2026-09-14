import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Branch } from '@/services/branches';
import { loadBranches, saveBranch } from './branches.thunks';

export type OutletsStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'quota'
  | null;

export type OutletForm = {
  name: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  contactPhone: string;
  contactEmail: string;
  drugLicenseNumber: string;
  gstin: string;
  branchType: 'RETAIL' | 'KIOSK';
  defaultBranch: boolean;
  markupBps: string;
  copyFromId: string;
};

export const emptyOutletForm = (): OutletForm => ({
  name: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  contactPhone: '',
  contactEmail: '',
  drugLicenseNumber: '',
  gstin: '',
  branchType: 'RETAIL',
  defaultBranch: false,
  markupBps: '0',
  copyFromId: '',
});

export function branchToForm(branch: Branch): OutletForm {
  const markup = branch.pricingSettings.defaultMarkupBps;
  return {
    name: branch.name,
    addressLine: branch.addressLine,
    city: branch.city,
    state: branch.state,
    pincode: branch.pincode,
    contactPhone: branch.contactPhone,
    contactEmail: branch.contactEmail ?? '',
    drugLicenseNumber: branch.drugLicenseNumber,
    gstin: branch.gstin ?? '',
    branchType: branch.branchType,
    defaultBranch: branch.defaultBranch,
    markupBps: String(typeof markup === 'number' ? markup : 0),
    copyFromId: '',
  };
}

export type BranchesState = {
  status: OutletsStatus;
  items: Branch[];
  selectedId: string | null;
  creating: boolean;
  form: OutletForm;
};

const branchesSlice = createSlice({
  name: 'branches',
  initialState: {
    status: 'loading' as OutletsStatus,
    items: [] as Branch[],
    selectedId: null as string | null,
    creating: false,
    form: emptyOutletForm(),
  },
  reducers: {
    accessDenied(state) {
      state.status = 'denied';
    },
    formPatched(state, action: PayloadAction<Partial<OutletForm>>) {
      state.form = { ...state.form, ...action.payload };
    },
    createOpened(state) {
      state.creating = true;
      state.selectedId = null;
      state.form = { ...emptyOutletForm(), defaultBranch: state.items.length === 0 };
      state.status = null;
    },
    editOpened(state, action: PayloadAction<string>) {
      const row = state.items.find((item) => item.id === action.payload);
      if (!row) {
        return;
      }
      state.creating = false;
      state.selectedId = row.id;
      state.form = branchToForm(row);
      state.status = null;
    },
    editorClosed(state) {
      state.creating = false;
      state.selectedId = null;
      state.form = emptyOutletForm();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadBranches.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadBranches.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = action.payload.length === 0 ? 'empty' : null;
      })
      .addCase(loadBranches.rejected, (state, action) => {
        state.status = action.payload ?? 'failure';
      })
      .addCase(saveBranch.fulfilled, (state, action) => {
        const saved = action.payload;
        state.items = [...state.items.filter((item) => item.id !== saved.id), saved].sort((a, b) =>
          a.branchCode.localeCompare(b.branchCode),
        );
        state.status = 'success';
        state.creating = false;
        state.selectedId = null;
        state.form = emptyOutletForm();
      })
      .addCase(saveBranch.rejected, (state, action) => {
        state.status = action.payload ?? 'failure';
      });
  },
});

export const { accessDenied, formPatched, createOpened, editOpened, editorClosed } = branchesSlice.actions;
export const branchesReducer = branchesSlice.reducer;
