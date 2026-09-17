import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Supplier, SupplierDueItem, SupplierLedger } from '@/services/suppliers';
import { DISTRIBUTORS_CONTENT } from '../DistributorsScreen.content';
import {
  emptyDialogForm,
  toDialogForm,
  type DialogFormState,
  type DistributorsPageStatus,
  type DistributorsTab,
} from '../DistributorsScreen.utils';
import {
  deactivateDistributor,
  loadDistributorLedger,
  loadDistributors,
  payDistributor,
  saveDistributor,
} from './distributors.thunks';

export type DistributorsState = {
  status: DistributorsPageStatus;
  statusHint: string | null;
  tab: DistributorsTab;
  items: Supplier[];
  query: string;
  formOpen: boolean;
  formBusy: boolean;
  form: DialogFormState;
  editingId: string | null;
  payOpen: boolean;
  payBusy: boolean;
  payError: string | null;
  ledger: SupplierLedger | null;
  ledgerLoading: boolean;
  dues: SupplierDueItem[];
  duesPlanLimit: boolean;
};

export const initialDistributorsState: DistributorsState = {
  status: 'idle',
  statusHint: null,
  tab: 'distributors',
  items: [],
  query: '',
  formOpen: false,
  formBusy: false,
  form: emptyDialogForm(),
  editingId: null,
  payOpen: false,
  payBusy: false,
  payError: null,
  ledger: null,
  ledgerLoading: false,
  dues: [],
  duesPlanLimit: false,
};

const distributorsSlice = createSlice({
  name: 'distributors',
  initialState: initialDistributorsState,
  reducers: {
    setDistributorsTab(state, action: PayloadAction<DistributorsTab>) {
      state.tab = action.payload;
    },
    setDistributorsQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    openCreateDistributor(state) {
      state.formOpen = true;
      state.editingId = null;
      state.form = emptyDialogForm();
      state.statusHint = null;
      state.ledger = null;
    },
    openEditDistributor(state, action: PayloadAction<Supplier>) {
      state.formOpen = true;
      state.editingId = action.payload.id;
      state.form = toDialogForm(action.payload);
      state.statusHint = null;
    },
    closeDistributorForm(state) {
      state.formOpen = false;
      state.editingId = null;
      state.form = emptyDialogForm();
      state.formBusy = false;
    },
    patchDistributorForm(state, action: PayloadAction<Partial<DialogFormState>>) {
      state.form = { ...state.form, ...action.payload };
    },
    openPayDialog(state) {
      state.payOpen = true;
      state.payError = null;
    },
    closePayDialog(state) {
      state.payOpen = false;
      state.payBusy = false;
      state.payError = null;
    },
    clearDistributorsStatus(state) {
      state.status = state.items.length === 0 ? 'empty' : null;
      state.statusHint = null;
    },
    markDistributorsValidation(state) {
      state.status = 'validation';
      state.statusHint = DISTRIBUTORS_CONTENT.status.validation;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDistributors.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadDistributors.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.dues = action.payload.dues;
        state.duesPlanLimit = action.payload.duesPlanLimit;
        state.status = action.payload.items.length === 0 ? 'empty' : null;
      })
      .addCase(loadDistributors.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? DISTRIBUTORS_CONTENT.loadFailed;
      })
      .addCase(saveDistributor.pending, (state) => {
        state.formBusy = true;
        state.statusHint = null;
      })
      .addCase(saveDistributor.fulfilled, (state, action) => {
        state.formBusy = false;
        state.formOpen = false;
        state.editingId = null;
        state.form = emptyDialogForm();
        const without = state.items.filter((row) => row.id !== action.payload.id);
        state.items = [action.payload, ...without];
        state.status = 'success';
        state.statusHint = DISTRIBUTORS_CONTENT.status.success;
      })
      .addCase(saveDistributor.rejected, (state, action) => {
        state.formBusy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? DISTRIBUTORS_CONTENT.status.failure;
      })
      .addCase(deactivateDistributor.fulfilled, (state, action) => {
        state.items = state.items.map((row) =>
          row.id === action.payload.id ? action.payload : row,
        );
        state.status = 'success';
        state.statusHint = DISTRIBUTORS_CONTENT.status.removed;
      })
      .addCase(deactivateDistributor.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? DISTRIBUTORS_CONTENT.status.failure;
      })
      .addCase(loadDistributorLedger.pending, (state) => {
        state.ledgerLoading = true;
      })
      .addCase(loadDistributorLedger.fulfilled, (state, action) => {
        state.ledgerLoading = false;
        state.ledger = action.payload;
      })
      .addCase(loadDistributorLedger.rejected, (state) => {
        state.ledgerLoading = false;
        state.ledger = null;
      })
      .addCase(payDistributor.pending, (state) => {
        state.payBusy = true;
        state.payError = null;
      })
      .addCase(payDistributor.fulfilled, (state, action) => {
        state.payBusy = false;
        state.payOpen = false;
        state.ledger = action.payload;
        state.items = state.items.map((row) =>
          row.id === action.payload.supplierId
            ? { ...row, outstandingPaise: action.payload.balancePaise }
            : row,
        );
        state.status = 'success';
        state.statusHint = DISTRIBUTORS_CONTENT.status.paid;
      })
      .addCase(payDistributor.rejected, (state, action) => {
        state.payBusy = false;
        state.payError = action.payload?.message ?? DISTRIBUTORS_CONTENT.status.failure;
        state.status = action.payload?.status ?? 'failure';
      });
  },
});

export const {
  setDistributorsTab,
  setDistributorsQuery,
  openCreateDistributor,
  openEditDistributor,
  closeDistributorForm,
  patchDistributorForm,
  openPayDialog,
  closePayDialog,
  clearDistributorsStatus,
  markDistributorsValidation,
} = distributorsSlice.actions;

export const distributorsReducer = distributorsSlice.reducer;
