import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Manufacturer } from '@/services/manufacturers';
import type { ProductCategory } from '@/services/productCategories';
import type { Product } from '@/services/products';
import type { InventoryOverviewRow, InventoryOverviewSummary } from '@/services/inventory';
import type { InventoryFilter } from '../InventoryScreen.content';
import type { InventoryViewMode } from '../components/inventory-header/InventoryHeader';
import {
  loadCatalogue,
  loadInventoryOverview,
  saveProductEditor,
  updateListingFlags,
} from './inventory.thunks';

export type InventoryPageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;

export type ProductEditorMode = 'create' | 'edit';

export type InventoryState = {
  view: InventoryViewMode;
  status: InventoryPageStatus;
  statusHint: string | null;
  summary: InventoryOverviewSummary | null;
  items: InventoryOverviewRow[];
  filter: InventoryFilter;
  query: string;
  flagBusyId: string | null;
  /** Bumps when stock-affecting ops complete so workspaces can refresh. */
  syncEpoch: number;
  productEditor: {
    open: boolean;
    mode: ProductEditorMode;
    productId: string | null;
  };
  transferOpen: boolean;
  adjustOpen: boolean;
  stockTakeOpen: boolean;
  returnOpen: boolean;
  transferPrefillProductId: string | null;
  catalogue: {
    status: InventoryPageStatus;
    products: Product[];
    categories: ProductCategory[];
    manufacturers: Manufacturer[];
    query: string;
  };
};

export const initialInventoryState: InventoryState = {
  view: 'floor',
  status: null,
  statusHint: null,
  summary: null,
  items: [],
  filter: 'all',
  query: '',
  flagBusyId: null,
  syncEpoch: 0,
  productEditor: {
    open: false,
    mode: 'create',
    productId: null,
  },
  transferOpen: false,
  adjustOpen: false,
  stockTakeOpen: false,
  returnOpen: false,
  transferPrefillProductId: null,
  catalogue: {
    status: null,
    products: [],
    categories: [],
    manufacturers: [],
    query: '',
  },
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState: initialInventoryState,
  reducers: {
    setInventoryView(state, action: PayloadAction<InventoryViewMode>) {
      state.view = action.payload;
      state.transferOpen = false;
      state.adjustOpen = false;
      state.stockTakeOpen = false;
      state.returnOpen = false;
      state.transferPrefillProductId = null;
      state.status = null;
      state.statusHint = null;
    },
    setInventoryFilter(state, action: PayloadAction<InventoryFilter>) {
      state.filter = action.payload;
    },
    setInventoryQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    setWorkspaceStatus(
      state,
      action: PayloadAction<{ status: InventoryPageStatus; hint?: string | null }>,
    ) {
      state.status = action.payload.status;
      state.statusHint = action.payload.hint ?? null;
    },
    openProductEditor(
      state,
      action: PayloadAction<{ mode: ProductEditorMode; productId?: string | null }>,
    ) {
      state.productEditor = {
        open: true,
        mode: action.payload.mode,
        productId: action.payload.productId ?? null,
      };
    },
    closeProductEditor(state) {
      state.productEditor.open = false;
      state.productEditor.productId = null;
    },
    setTransferOpen(state, action: PayloadAction<boolean>) {
      state.transferOpen = action.payload;
      if (!action.payload) {
        state.transferPrefillProductId = null;
      }
    },
    openTransfer(state, action: PayloadAction<{ productId?: string | null } | undefined>) {
      state.transferPrefillProductId = action.payload?.productId ?? null;
      state.transferOpen = true;
      state.view = 'transfers';
    },
    setAdjustOpen(state, action: PayloadAction<boolean>) {
      state.adjustOpen = action.payload;
    },
    setStockTakeOpen(state, action: PayloadAction<boolean>) {
      state.stockTakeOpen = action.payload;
    },
    setReturnOpen(state, action: PayloadAction<boolean>) {
      state.returnOpen = action.payload;
    },
    setCatalogueQuery(state, action: PayloadAction<string>) {
      state.catalogue.query = action.payload;
    },
    bumpInventorySync(state) {
      state.syncEpoch += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadInventoryOverview.pending, (state) => {
        if (state.view === 'floor') {
          state.status = 'loading';
          state.statusHint = null;
        }
      })
      .addCase(loadInventoryOverview.fulfilled, (state, action) => {
        state.summary = action.payload.summary;
        state.items = action.payload.items;
        if (state.view === 'floor') {
          state.status = action.payload.items.length === 0 ? 'empty' : null;
          state.statusHint = null;
        }
      })
      .addCase(loadInventoryOverview.rejected, (state, action) => {
        if (state.view === 'floor') {
          state.status = action.payload?.status ?? 'failure';
          state.statusHint = action.payload?.message ?? null;
        }
      })
      .addCase(updateListingFlags.pending, (state, action) => {
        state.flagBusyId = action.meta.arg.productId;
      })
      .addCase(updateListingFlags.fulfilled, (state, action) => {
        state.flagBusyId = null;
        const idx = state.items.findIndex((row) => row.productId === action.payload.productId);
        if (idx >= 0) {
          state.items[idx] = action.payload;
        }
      })
      .addCase(updateListingFlags.rejected, (state) => {
        state.flagBusyId = null;
      })
      .addCase(loadCatalogue.pending, (state) => {
        state.catalogue.status = 'loading';
      })
      .addCase(loadCatalogue.fulfilled, (state, action) => {
        state.catalogue.products = action.payload.products;
        state.catalogue.categories = action.payload.categories;
        state.catalogue.manufacturers = action.payload.manufacturers;
        state.catalogue.status =
          action.payload.products.length === 0 ? 'empty' : null;
        if (state.view === 'catalogue') {
          state.status = state.catalogue.status;
        }
      })
      .addCase(loadCatalogue.rejected, (state, action) => {
        state.catalogue.status = action.payload?.status ?? 'failure';
        if (state.view === 'catalogue') {
          state.status = state.catalogue.status;
          state.statusHint = action.payload?.message ?? null;
        }
      })
      .addCase(saveProductEditor.fulfilled, (state) => {
        state.productEditor.open = false;
        state.productEditor.productId = null;
        state.syncEpoch += 1;
        state.status = 'success';
      });
  },
});

export const {
  setInventoryView,
  setInventoryFilter,
  setInventoryQuery,
  setWorkspaceStatus,
  openProductEditor,
  closeProductEditor,
  setTransferOpen,
  openTransfer,
  setAdjustOpen,
  setStockTakeOpen,
  setReturnOpen,
  setCatalogueQuery,
  bumpInventorySync,
} = inventorySlice.actions;
export const inventoryReducer = inventorySlice.reducer;
