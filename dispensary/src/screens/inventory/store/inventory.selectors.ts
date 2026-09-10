import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import {
  matchesInventoryFilter,
  matchesInventoryQuery,
} from '../InventoryScreen.format';

export const selectInventoryState = (state: RootState) => state.inventory;

export const selectInventoryView = (state: RootState) => state.inventory.view;
export const selectInventorySummary = (state: RootState) => state.inventory.summary;
export const selectInventoryFilter = (state: RootState) => state.inventory.filter;
export const selectInventoryQuery = (state: RootState) => state.inventory.query;
export const selectInventoryStatus = (state: RootState) => state.inventory.status;
export const selectInventoryStatusHint = (state: RootState) => state.inventory.statusHint;
export const selectInventoryFlagBusyId = (state: RootState) => state.inventory.flagBusyId;
export const selectInventorySyncEpoch = (state: RootState) => state.inventory.syncEpoch;
export const selectProductEditor = (state: RootState) => state.inventory.productEditor;
export const selectTransferOpen = (state: RootState) => state.inventory.transferOpen;
export const selectAdjustOpen = (state: RootState) => state.inventory.adjustOpen;
export const selectStockTakeOpen = (state: RootState) => state.inventory.stockTakeOpen;
export const selectReturnOpen = (state: RootState) => state.inventory.returnOpen;
export const selectTransferPrefillProductId = (state: RootState) =>
  state.inventory.transferPrefillProductId;
export const selectCatalogue = (state: RootState) => state.inventory.catalogue;

export const selectFilteredInventoryRows = createSelector(
  [
    (state: RootState) => state.inventory.items,
    selectInventoryFilter,
    selectInventoryQuery,
  ],
  (items, filter, query) =>
    items.filter(
      (row) => matchesInventoryFilter(row, filter) && matchesInventoryQuery(row, query),
    ),
);

export const selectFilteredCatalogueProducts = createSelector(
  [selectCatalogue],
  (catalogue) => {
    const q = catalogue.query.trim().toLowerCase();
    if (!q) return catalogue.products;
    return catalogue.products.filter((product) =>
      [product.name, product.sku, product.barcode, product.genericName, product.brandName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q)),
    );
  },
);
