import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import {
  cartHasRx,
  cartTotalPaise,
  categoryNames,
  enabledPayments,
  matchesQuery,
} from '../KioskScreen.utils';

export const selectKioskSlice = (state: RootState) => state.kiosk;

export const selectKioskStatus = (state: RootState) => state.kiosk.status;
export const selectKioskStatusHint = (state: RootState) => state.kiosk.statusHint;
export const selectKioskBusy = (state: RootState) => state.kiosk.busy;
export const selectKioskConfigBusy = (state: RootState) => state.kiosk.configBusy;
export const selectKioskState = (state: RootState) => state.kiosk.kiosk;
export const selectKioskConfigDraft = (state: RootState) => state.kiosk.configDraft;
export const selectKioskCustomerMode = (state: RootState) => state.kiosk.customerMode;
export const selectKioskCatalogue = (state: RootState) => state.kiosk.catalogue;
export const selectKioskSearchQuery = (state: RootState) => state.kiosk.searchQuery;
export const selectKioskCategory = (state: RootState) => state.kiosk.category;
export const selectKioskCart = (state: RootState) => state.kiosk.cart;
export const selectKioskPaymentMethod = (state: RootState) => state.kiosk.paymentMethod;
export const selectKioskLastToken = (state: RootState) => state.kiosk.lastToken;
export const selectKioskOrderSuccess = (state: RootState) => state.kiosk.orderSuccess;
export const selectKioskRxFileName = (state: RootState) => state.kiosk.rxFileName;
export const selectKioskPinPromptOpen = (state: RootState) => state.kiosk.pinPromptOpen;
export const selectKioskPinInput = (state: RootState) => state.kiosk.pinInput;

export const selectKioskOpen = (state: RootState) =>
  state.kiosk.kiosk?.session?.status === 'OPEN';

export const selectKioskWaiting = (state: RootState) =>
  state.kiosk.kiosk?.waitingTickets ?? [];

export const selectKioskCartTotal = createSelector(selectKioskCart, cartTotalPaise);
export const selectKioskCartHasRx = createSelector(selectKioskCart, cartHasRx);
export const selectKioskEnabledPayments = createSelector(
  selectKioskConfigDraft,
  enabledPayments,
);

export const selectKioskCategories = createSelector(selectKioskCatalogue, (rows) => [
  'All',
  ...categoryNames(rows),
]);

export const selectKioskVisibleCatalogue = createSelector(
  [selectKioskCatalogue, selectKioskSearchQuery, selectKioskCategory],
  (rows, query, category) =>
    rows.filter((row) => {
      if (!matchesQuery(row, query)) return false;
      if (category !== 'All' && (row.categoryName ?? 'Other') !== category) return false;
      return true;
    }),
);

export const selectCartQtyByProduct = createSelector(selectKioskCart, (cart) => {
  const map: Record<string, number> = {};
  for (const line of cart) {
    const key = `${line.productId}:${line.loose ? 'loose' : 'pack'}`;
    map[key] = (map[key] ?? 0) + line.quantity;
  }
  return map;
});
