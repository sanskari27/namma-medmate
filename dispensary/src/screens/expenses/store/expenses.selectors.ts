import type { RootState } from '@/store';
import { periodRange } from '../ExpensesScreen.utils';

export const selectExpensesStatus = (state: RootState) => state.expenses.status;
export const selectExpensesStatusHint = (state: RootState) => state.expenses.statusHint;
export const selectExpensesItems = (state: RootState) => state.expenses.items;
export const selectExpensesCategories = (state: RootState) => state.expenses.categories;
export const selectExpensesTotals = (state: RootState) => state.expenses.totals;
export const selectExpensesPeriod = (state: RootState) => state.expenses.period;
export const selectExpensesFilterCategoryId = (state: RootState) => state.expenses.filterCategoryId;
export const selectExpensesSearch = (state: RootState) => state.expenses.search;
export const selectExpensesScope = (state: RootState) => state.expenses.scope;
export const selectExpensesReportMode = (state: RootState) => state.expenses.reportMode;
export const selectExpensesReportsOpen = (state: RootState) => state.expenses.reportsOpen;
export const selectExpensesFormOpen = (state: RootState) => state.expenses.formOpen;
export const selectExpensesFormBusy = (state: RootState) => state.expenses.formBusy;
export const selectExpensesForm = (state: RootState) => state.expenses.form;
export const selectExpensesEditingId = (state: RootState) => state.expenses.editingId;
export const selectExpensesDeletingId = (state: RootState) => state.expenses.deletingId;

export const selectExpensesPeriodMeta = (state: RootState) => periodRange(state.expenses.period);
