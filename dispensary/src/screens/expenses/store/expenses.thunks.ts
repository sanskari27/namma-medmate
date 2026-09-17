import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createExpense,
  createExpenseCategory,
  deleteExpense,
  isApiError,
  listExpenseCategories,
  listExpenseTotals,
  listExpenses,
  updateExpense,
  attachExpenseEvidence,
  type ExpenseCategory,
  type ExpenseTotals,
  type ShopExpense,
} from '@/services/expenses';
import type { RootState } from '@/store';
import { EXPENSES_CONTENT } from '../ExpensesScreen.content';
import {
  apiStatusHint,
  formValid,
  mapApiStatus,
  periodRange,
  rupeesToPaise,
  type PageStatus,
} from '../ExpensesScreen.utils';

export type ExpensesReject = {
  status: PageStatus;
  hint: string | null;
};

export type ExpensesLoadResult = {
  items: ShopExpense[];
  categories: ExpenseCategory[];
  totals: ExpenseTotals;
};

function listQuery(state: RootState) {
  const screen = state.expenses;
  const owner = state.auth.user?.role === 'pharmacy_owner';
  const range = periodRange(screen.period);
  return {
    scope: owner && screen.scope === 'tenant' ? ('tenant' as const) : undefined,
    categoryId: screen.filterCategoryId || undefined,
    from: range.from,
    to: range.to,
    q: screen.search.trim() || undefined,
    status: 'POSTED' as const,
  };
}

export const loadExpenses = createAsyncThunk<
  ExpensesLoadResult,
  void,
  { state: RootState; rejectValue: ExpensesReject }
>('expenses/load', async (_, { getState, rejectWithValue }) => {
  try {
    const query = listQuery(getState());
    const [items, categories, totals] = await Promise.all([
      listExpenses(query),
      listExpenseCategories(),
      listExpenseTotals(query),
    ]);
    return { items, categories, totals };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapApiStatus(error),
        hint: apiStatusHint(error.code),
      });
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});

export const saveExpense = createAsyncThunk<
  ShopExpense,
  File | undefined,
  { state: RootState; rejectValue: ExpensesReject }
>('expenses/save', async (evidence, { getState, dispatch, rejectWithValue }) => {
  const { form, editingId, items, scope } = getState().expenses;
  if (!formValid(form)) {
    return rejectWithValue({
      status: 'validation',
      hint: 'Category, amount, and date are required before saving.',
    });
  }
  const amountPaise = rupeesToPaise(form.amountRupees);
  if (amountPaise == null) {
    return rejectWithValue({ status: 'validation', hint: 'Enter a valid amount.' });
  }
  const selected = items.find((row) => row.id === editingId) ?? null;
  const user = getState().auth.user;
  const allOutlets = scope === 'tenant' || !user?.activeBranchId;
  const branchId = allOutlets ? form.branchId || undefined : (user?.activeBranchId ?? undefined);
  if (!branchId) {
    return rejectWithValue({
      status: 'validation',
      hint: EXPENSES_CONTENT.outletRequired,
    });
  }
  const payload = {
    categoryId: form.categoryId,
    amountPaise,
    occurredOn: form.occurredOn,
    notes: form.notes.trim() || undefined,
    partyName: form.partyName.trim() || undefined,
    paymentMode: form.paymentMode,
    gstPercent: form.gstPercent,
    branchId,
    idempotencyKey: editingId ? undefined : crypto.randomUUID(),
    expectedVersion: editingId ? (selected?.version ?? 1) : undefined,
  };
  try {
    const saved = editingId
      ? await updateExpense(editingId, payload)
      : await createExpense(payload);
    const withEvidence = evidence ? await attachExpenseEvidence(saved.id, evidence) : saved;
    void dispatch(loadExpenses());
    return withEvidence;
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapApiStatus(error),
        hint: apiStatusHint(error.code) ?? error.message,
      });
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});

export const removeExpense = createAsyncThunk<
  string,
  string,
  { state: RootState; rejectValue: ExpensesReject }
>('expenses/remove', async (id, { dispatch, rejectWithValue }) => {
  try {
    await deleteExpense(id);
    void dispatch(loadExpenses());
    return id;
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapApiStatus(error),
        hint: apiStatusHint(error.code) ?? error.message,
      });
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});

export const addExpenseCategory = createAsyncThunk<
  { created: ExpenseCategory; categories: ExpenseCategory[] },
  { code: string; label: string },
  { state: RootState; rejectValue: ExpensesReject }
>('expenses/addCategory', async (input, { rejectWithValue }) => {
  if (!input.code.trim() || !input.label.trim()) {
    return rejectWithValue({
      status: 'validation',
      hint: 'Code and name are needed to add a category.',
    });
  }
  try {
    const created = await createExpenseCategory(input);
    const categories = await listExpenseCategories();
    return { created, categories };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapApiStatus(error),
        hint: apiStatusHint(error.code) ?? error.message,
      });
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});
