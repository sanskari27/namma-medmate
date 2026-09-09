import type { RootState } from '@/store';
import { filterCounts, filteredReturns, summaryStats } from '../ReturnsScreen.utils';

export const selectReturns = (state: RootState) => state.returns;

export const selectReturnsStatus = (state: RootState) => state.returns.status;
export const selectReturnsStatusHint = (state: RootState) => state.returns.statusHint;
export const selectReturnsItems = (state: RootState) => state.returns.items;
export const selectReturnsFilter = (state: RootState) => state.returns.filter;
export const selectReturnsQuery = (state: RootState) => state.returns.query;
export const selectReturnsSelectedId = (state: RootState) => state.returns.selectedId;
export const selectCreateOpen = (state: RootState) => state.returns.createOpen;
export const selectCreateStatus = (state: RootState) => state.returns.createStatus;
export const selectCreateHint = (state: RootState) => state.returns.createHint;
export const selectBillQuery = (state: RootState) => state.returns.billQuery;
export const selectReturnInvoice = (state: RootState) => state.returns.invoice;
export const selectQtyByLine = (state: RootState) => state.returns.qtyByLine;
export const selectReturnReason = (state: RootState) => state.returns.reason;
export const selectRefundMode = (state: RootState) => state.returns.refundMode;
export const selectReturnPreview = (state: RootState) => state.returns.preview;

export const selectReturnsFilterCounts = (state: RootState) =>
  filterCounts(state.returns.items);

export const selectFilteredReturns = (state: RootState) =>
  filteredReturns(state.returns.items, state.returns.filter, state.returns.query);

export const selectReturnsSummary = (state: RootState) =>
  summaryStats(filteredReturns(state.returns.items, state.returns.filter, state.returns.query));

export const selectSelectedReturn = (state: RootState) => {
  const id = state.returns.selectedId;
  if (!id) return null;
  return state.returns.items.find((row) => row.id === id) ?? null;
};

export const selectCreateBusy = (state: RootState) => {
  const s = state.returns.createStatus;
  return s === 'finding' || s === 'previewing' || s === 'recording';
};
