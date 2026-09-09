import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import { filterOutstanding } from '../CreditScreen.utils';

export const selectCreditState = (state: RootState) => state.credit;

export const selectCreditStatus = (state: RootState) => state.credit.status;
export const selectCreditSummary = (state: RootState) => state.credit.summary;
export const selectCreditAging = (state: RootState) => state.credit.aging;
export const selectCreditItems = (state: RootState) => state.credit.items;
export const selectCreditPayments = (state: RootState) => state.credit.payments;
export const selectCreditTab = (state: RootState) => state.credit.tab;
export const selectCreditQuery = (state: RootState) => state.credit.query;
export const selectCreditSort = (state: RootState) => state.credit.sort;
export const selectCreditOverdueOnly = (state: RootState) => state.credit.overdueOnly;
export const selectCreditAgingFilter = (state: RootState) => state.credit.agingFilter;
export const selectCreditSelectedId = (state: RootState) => state.credit.selectedId;
export const selectCreditSettleOpen = (state: RootState) => state.credit.settleOpen;

export const selectFilteredOutstanding = createSelector(
  [
    selectCreditItems,
    selectCreditQuery,
    selectCreditOverdueOnly,
    selectCreditAgingFilter,
    selectCreditSort,
  ],
  (items, query, overdueOnly, agingFilter, sort) =>
    filterOutstanding(items, query, overdueOnly, agingFilter, sort),
);

export const selectSelectedCreditAccount = createSelector(
  [selectCreditItems, selectCreditSelectedId],
  (items, selectedId) => items.find((row) => row.customerId === selectedId) ?? null,
);

export const selectPaymentsTotalPaise = createSelector([selectCreditPayments], (payments) =>
  payments.reduce((sum, row) => sum + row.amountPaise, 0),
);
