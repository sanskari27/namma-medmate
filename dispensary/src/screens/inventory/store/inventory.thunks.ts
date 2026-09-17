import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import {
  getInventoryOverview,
  updateInventoryListingFlags,
  type InventoryOverview,
  type InventoryOverviewRow,
} from '@/services/inventory';
import { listManufacturers, type Manufacturer } from '@/services/manufacturers';
import { listProductCategories, type ProductCategory } from '@/services/productCategories';
import {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
  type Product,
  type ProductInput,
  type ProductUnit,
} from '@/services/products';
import { listProductUnits, replaceProductUnits } from '@/services/productUnits';
import { INVENTORY_CONTENT } from '../InventoryScreen.content';
import type { InventoryPageStatus } from './inventory.slice';
import type { AppDispatch } from '@/store';

type Reject = { status: InventoryPageStatus; message: string };

export const loadInventoryOverview = createAsyncThunk<
  InventoryOverview,
  void,
  { rejectValue: Reject }
>('inventory/loadOverview', async (_, { rejectWithValue }) => {
  try {
    return await getInventoryOverview();
  } catch (error) {
    if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
      return rejectWithValue({ status: 'denied', message: error.message });
    }
    if (isApiError(error) && error.code === 'NO_ACTIVE_BRANCH') {
      return rejectWithValue({ status: 'failure', message: INVENTORY_CONTENT.noBranch });
    }
    return rejectWithValue({
      status: 'failure',
      message: isApiError(error) ? error.message : INVENTORY_CONTENT.loadFailed,
    });
  }
});

export const updateListingFlags = createAsyncThunk<
  InventoryOverviewRow,
  { productId: string; looseSellingEnabled?: boolean; onlineListed?: boolean },
  { rejectValue: string }
>('inventory/updateListingFlags', async (arg, { rejectWithValue }) => {
  try {
    return await updateInventoryListingFlags(arg.productId, {
      looseSellingEnabled: arg.looseSellingEnabled,
      onlineListed: arg.onlineListed,
    });
  } catch (error) {
    return rejectWithValue(
      isApiError(error) ? error.message : INVENTORY_CONTENT.toggleFailed,
    );
  }
});

export const loadCatalogue = createAsyncThunk<
  {
    products: Product[];
    categories: ProductCategory[];
    manufacturers: Manufacturer[];
  },
  string | undefined,
  { rejectValue: Reject }
>('inventory/loadCatalogue', async (query, { rejectWithValue }) => {
  try {
    const [products, categories, manufacturers] = await Promise.all([
      listProducts(query),
      listProductCategories(),
      listManufacturers(),
    ]);
    return { products, categories, manufacturers };
  } catch (error) {
    if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
      return rejectWithValue({ status: 'denied', message: error.message });
    }
    return rejectWithValue({
      status: 'failure',
      message: isApiError(error) ? error.message : INVENTORY_CONTENT.loadFailed,
    });
  }
});

export const loadProductForEditor = createAsyncThunk<
  { product: Product; units: Awaited<ReturnType<typeof listProductUnits>> },
  string,
  { rejectValue: string }
>('inventory/loadProductForEditor', async (productId, { rejectWithValue }) => {
  try {
    const [product, units] = await Promise.all([
      getProduct(productId),
      listProductUnits(productId),
    ]);
    return { product, units };
  } catch (error) {
    return rejectWithValue(isApiError(error) ? error.message : 'Could not load product.');
  }
});

export const saveProductEditor = createAsyncThunk<
  Product,
  {
    mode: 'create' | 'edit';
    productId: string | null;
    input: ProductInput;
    quantityPrecision: number;
    units: { unit: ProductUnit; factorToBase: number }[];
  },
  { rejectValue: string; dispatch: AppDispatch }
>('inventory/saveProductEditor', async (arg, { rejectWithValue, dispatch }) => {
  try {
    const saved =
      arg.mode === 'edit' && arg.productId
        ? await updateProduct(arg.productId, arg.input)
        : await createProduct(arg.input);
    await replaceProductUnits(saved.id, {
      quantityPrecision: arg.quantityPrecision,
      units: arg.units,
    });
    await Promise.all([
      dispatch(loadCatalogue(undefined)),
      dispatch(loadInventoryOverview()),
    ]);
    return saved;
  } catch (error) {
    if (isApiError(error) && (error.code === 'SKU_TAKEN' || error.status === 409)) {
      return rejectWithValue(
        'That SKU is already on this pharmacy catalogue. Pick another code or edit the existing product.',
      );
    }
    if (isApiError(error) && (error.code === 'PRECISION_LOSS' || error.code === 'INVALID_CONVERSION')) {
      return rejectWithValue(
        'Check SKU, pack size, quantity precision (0–4), and conversion factors. Zero, duplicate, or base-unit conversions are rejected.',
      );
    }
    return rejectWithValue(isApiError(error) ? error.message : 'Could not save product.');
  }
});

/** Call after stock-affecting ops so Stock KPIs/table stay live. */
export const refreshInventoryAfterMutation = createAsyncThunk(
  'inventory/refreshAfterMutation',
  async (_, { dispatch }) => {
    await dispatch(loadInventoryOverview());
  },
);
