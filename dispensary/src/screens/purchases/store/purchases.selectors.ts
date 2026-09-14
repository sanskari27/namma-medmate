import type { RootState } from '@/store';
import { filteredBills, summaryKpis } from '../PurchasesScreen.utils';

export const selectPurchases = (state: RootState) => state.purchases;

export const selectPurchasesStatus = (state: RootState) => state.purchases.status;
export const selectPurchasesStatusHint = (state: RootState) => state.purchases.statusHint;
export const selectPurchasesItems = (state: RootState) => state.purchases.items;
export const selectPurchasesQuery = (state: RootState) => state.purchases.query;
export const selectPurchasesSelectedId = (state: RootState) => state.purchases.selectedId;
export const selectPurchaseDetail = (state: RootState) => state.purchases.detail;
export const selectPurchaseDetailStatus = (state: RootState) => state.purchases.detailStatus;
export const selectPurchasesSuppliers = (state: RootState) => state.purchases.suppliers;
export const selectPurchasesProducts = (state: RootState) => state.purchases.products;
export const selectCreateOpen = (state: RootState) => state.purchases.createOpen;
export const selectCreateStatus = (state: RootState) => state.purchases.createStatus;
export const selectCreateHint = (state: RootState) => state.purchases.createHint;
export const selectPurchaseDraft = (state: RootState) => state.purchases.draft;

export const selectFilteredPurchases = (state: RootState) =>
  filteredBills(state.purchases.items, state.purchases.query);

export const selectPurchasesSummary = (state: RootState) => summaryKpis(state.purchases.items);

export const selectSelectedPurchase = (state: RootState) => {
  const id = state.purchases.selectedId;
  if (!id) return null;
  return state.purchases.items.find((row) => row.id === id) ?? null;
};

export const selectCreateBusy = (state: RootState) => state.purchases.createStatus === 'saving';

export const selectProductsById = (state: RootState) => {
  const map = new Map(state.purchases.products.map((product) => [product.id, product]));
  return map;
};
