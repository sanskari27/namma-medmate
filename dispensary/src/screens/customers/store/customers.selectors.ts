import type { RootState } from '@/store';
import {
  rowKey,
  sortedCustomers,
  summaryStats,
  WALK_IN_KEY,
} from '../CustomersScreen.utils';

export const selectCustomers = (state: RootState) => state.customers;

export const selectCustomersStatus = (state: RootState) => state.customers.status;
export const selectCustomersStatusHint = (state: RootState) => state.customers.statusHint;
export const selectCustomersActionStatus = (state: RootState) => state.customers.actionStatus;
export const selectCustomersItems = (state: RootState) => state.customers.items;
export const selectCustomersSort = (state: RootState) => state.customers.sort;
export const selectCustomersQuery = (state: RootState) => state.customers.query;
export const selectCustomersSelectedKey = (state: RootState) => state.customers.selectedKey;
export const selectCreateCustomerOpen = (state: RootState) => state.customers.createOpen;
export const selectSettleOpen = (state: RootState) => state.customers.settleOpen;
export const selectEditCustomerOpen = (state: RootState) => state.customers.editOpen;
export const selectCustomerDetailLoading = (state: RootState) => state.customers.detailLoading;
export const selectCustomerSaveBusy = (state: RootState) => state.customers.saveBusy;
export const selectCustomerEditHint = (state: RootState) => state.customers.editHint;
export const selectCustomerProfile = (state: RootState) => state.customers.profile;
export const selectCustomerCredit = (state: RootState) => state.customers.credit;
export const selectCustomerPurchases = (state: RootState) => state.customers.purchases;

export const selectCustomersSummary = (state: RootState) => summaryStats(state.customers.items);

export const selectSortedCustomers = (state: RootState) =>
  sortedCustomers(state.customers.items, state.customers.sort, state.customers.query);

export const selectSelectedCustomer = (state: RootState) => {
  const key = state.customers.selectedKey;
  if (!key) return null;
  return (
    state.customers.items.find((row) =>
      row.walkInAggregate ? key === WALK_IN_KEY : row.id === key,
    ) ?? null
  );
};

export const selectSelectedCustomerKey = (state: RootState) => {
  const row = selectSelectedCustomer(state);
  return row ? rowKey(row) : null;
};
