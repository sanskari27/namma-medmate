import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ExpenseCategory, ExpenseTotals, ShopExpense } from '@/services/expenses';
import {
  emptyForm,
  formFromExpense,
  type FormState,
  type OutletScope,
  type PageStatus,
  type PeriodKey,
  type ReportMode,
} from '../ExpensesScreen.utils';
import { addExpenseCategory, loadExpenses, removeExpense, saveExpense } from './expenses.thunks';

export type ExpensesScreenState = {
  status: PageStatus;
  statusHint: string | null;
  items: ShopExpense[];
  categories: ExpenseCategory[];
  totals: ExpenseTotals | null;
  scope: OutletScope;
  period: PeriodKey;
  filterCategoryId: string;
  search: string;
  reportMode: ReportMode;
  reportsOpen: boolean;
  formOpen: boolean;
  formBusy: boolean;
  form: FormState;
  editingId: string | null;
  deletingId: string | null;
};

export const initialExpensesScreenState: ExpensesScreenState = {
  status: 'loading',
  statusHint: null,
  items: [],
  categories: [],
  totals: null,
  scope: 'session',
  period: '365d',
  filterCategoryId: '',
  search: '',
  reportMode: 'transactions',
  reportsOpen: false,
  formOpen: false,
  formBusy: false,
  form: emptyForm(),
  editingId: null,
  deletingId: null,
};

const expensesSlice = createSlice({
  name: 'expenses',
  initialState: initialExpensesScreenState,
  reducers: {
    accessDenied(state, action: PayloadAction<string>) {
      state.status = 'denied';
      state.statusHint = action.payload;
      state.items = [];
      state.totals = null;
    },
    hydrateOwnerScope(state, action: PayloadAction<{ owner: boolean; hasBranch: boolean }>) {
      if (action.payload.owner && !action.payload.hasBranch) {
        state.scope = 'tenant';
      } else {
        state.scope = 'session';
      }
    },
    periodChanged(state, action: PayloadAction<PeriodKey>) {
      state.period = action.payload;
    },
    categoryFilterChanged(state, action: PayloadAction<string>) {
      state.filterCategoryId = action.payload;
    },
    searchChanged(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    scopeChanged(state, action: PayloadAction<OutletScope>) {
      state.scope = action.payload;
    },
    reportModeChanged(state, action: PayloadAction<ReportMode>) {
      state.reportMode = action.payload;
      state.reportsOpen = false;
    },
    reportsMenuToggled(state, action: PayloadAction<boolean | undefined>) {
      state.reportsOpen = action.payload ?? !state.reportsOpen;
    },
    openCreateExpense(state) {
      state.formOpen = true;
      state.editingId = null;
      state.form = emptyForm();
      if (!state.form.categoryId && state.categories[0]) {
        state.form.categoryId = state.categories[0].id;
      }
      state.statusHint = null;
      if (state.status === 'empty' || state.status === 'success') {
        state.status = null;
      }
    },
    openEditExpense(state, action: PayloadAction<ShopExpense>) {
      state.formOpen = true;
      state.editingId = action.payload.id;
      state.form = formFromExpense(action.payload);
      state.statusHint = null;
    },
    closeExpenseForm(state) {
      state.formOpen = false;
      state.editingId = null;
      state.form = emptyForm();
      state.formBusy = false;
    },
    patchExpenseForm(state, action: PayloadAction<Partial<FormState>>) {
      state.form = { ...state.form, ...action.payload };
    },
    markExpenseValidation(state, action: PayloadAction<string | null | undefined>) {
      state.status = 'validation';
      state.statusHint = action.payload ?? null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadExpenses.pending, (state) => {
        if (state.items.length === 0 && !state.totals) {
          state.status = 'loading';
        }
        state.statusHint = null;
      })
      .addCase(loadExpenses.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.categories = action.payload.categories;
        state.totals = action.payload.totals;
        state.status = action.payload.items.length === 0 ? 'empty' : null;
      })
      .addCase(loadExpenses.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
        state.items = [];
        state.totals = null;
      })
      .addCase(saveExpense.pending, (state) => {
        state.formBusy = true;
      })
      .addCase(saveExpense.fulfilled, (state, action) => {
        state.formBusy = false;
        state.formOpen = false;
        state.editingId = null;
        state.form = emptyForm();
        state.status = 'success';
        state.statusHint = null;
        const saved = action.payload;
        const rest = state.items.filter((row) => row.id !== saved.id);
        state.items = [saved, ...rest].sort((a, b) =>
          b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt),
        );
      })
      .addCase(saveExpense.rejected, (state, action) => {
        state.formBusy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(removeExpense.pending, (state, action) => {
        state.deletingId = action.meta.arg;
      })
      .addCase(removeExpense.fulfilled, (state, action) => {
        state.deletingId = null;
        state.items = state.items.filter((row) => row.id !== action.payload);
        state.status = state.items.length === 0 ? 'empty' : 'success';
        state.statusHint = 'Expense removed.';
      })
      .addCase(removeExpense.rejected, (state, action) => {
        state.deletingId = null;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(addExpenseCategory.fulfilled, (state, action) => {
        state.categories = action.payload.categories;
        state.form.categoryId = action.payload.created.id;
        state.status = 'success';
        state.statusHint = 'Category added.';
      })
      .addCase(addExpenseCategory.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      });
  },
});

export const {
  accessDenied,
  hydrateOwnerScope,
  periodChanged,
  categoryFilterChanged,
  searchChanged,
  scopeChanged,
  reportModeChanged,
  reportsMenuToggled,
  openCreateExpense,
  openEditExpense,
  closeExpenseForm,
  patchExpenseForm,
  markExpenseValidation,
} = expensesSlice.actions;

export const expensesReducer = expensesSlice.reducer;
