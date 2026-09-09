import type { RootState } from '@/store';
import { filterCounts, filteredOrders } from '../OrdersScreen.utils';

export const selectOrders = (state: RootState) => state.orders;

export const selectOrdersStatus = (state: RootState) => state.orders.status;
export const selectOrdersStatusHint = (state: RootState) => state.orders.statusHint;
export const selectOrdersItems = (state: RootState) => state.orders.items;
export const selectOrdersFilter = (state: RootState) => state.orders.filter;
export const selectOrdersQuery = (state: RootState) => state.orders.query;
export const selectOrdersSelectedId = (state: RootState) => state.orders.selectedId;
export const selectOrdersDetailTab = (state: RootState) => state.orders.detailTab;
export const selectOrdersActionBusyId = (state: RootState) => state.orders.actionBusyId;
export const selectOrdersActionHint = (state: RootState) => state.orders.actionHint;

export const selectOrdersFilterCounts = (state: RootState) => filterCounts(state.orders.items);

export const selectFilteredOrders = (state: RootState) =>
  filteredOrders(state.orders.items, state.orders.filter, state.orders.query);

export const selectSelectedOrder = (state: RootState) => {
  const id = state.orders.selectedId;
  if (!id) return null;
  return state.orders.items.find((row) => row.id === id) ?? null;
};
