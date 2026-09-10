import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type StockBalance = {
  balanceId: string;
  productId: string;
  productSku: string;
  productName: string;
  batchId: string | null;
  batchNumber: string | null;
  manufacturedOn: string | null;
  expiresOn: string | null;
  purchasePricePaise: number | null;
  quantity: number;
  version: number;
  nearExpiry?: boolean;
};

export type StockBatchDetail = {
  batchId: string | null;
  productId: string;
  batchNumber: string | null;
  manufacturedOn: string | null;
  expiresOn: string | null;
  purchasePricePaise: number;
  quantity: number;
  version: number;
  balanceId: string;
  suggestedFefo?: boolean;
  nearExpiry?: boolean;
  expired?: boolean;
};

export type StockMovement = {
  id: string;
  productId: string;
  batchId: string | null;
  type: 'STOCK_IN' | 'STOCK_OUT';
  quantity: number;
  balanceAfter: number;
  purchasePricePaise: number | null;
  occurredAt: string;
};

export type StockReceiptInput = {
  productId: string;
  batchNumber?: string | null;
  manufacturedOn?: string | null;
  expiresOn?: string | null;
  purchasePricePaise?: number | null;
  quantity: number;
  idempotencyKey: string;
  expectedVersion?: number | null;
};

export type InventorySettings = {
  expiryWarnDays: number;
};

export type BranchStockLevels = {
  reorderLevel: number | null;
  reorderQuantity: number | null;
  minimumStock: number | null;
};

export type OtherBranchStock = {
  branchId: string;
  branchName: string;
  quantity: number;
};

export type LowStockAlert = {
  productId: string;
  productSku: string;
  productName: string;
  onHand: number;
  reorderLevel: number | null;
  minimumStock: number | null;
  otherBranches: OtherBranchStock[];
};

export type NearExpiryAlert = {
  productId: string;
  productSku: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  expiresOn: string;
  quantity: number;
};

export type InventoryAlerts = {
  lowStock: LowStockAlert[];
  nearExpiry: NearExpiryAlert[];
};

export type StockValuation = {
  totalPurchaseValuePaise: number;
};

export type InventoryOverviewSummary = {
  totalSkus: number;
  totalUnits: number;
  stockValueCostPaise: number;
  retailValueMrpPaise: number;
  marginPercent: number | null;
  lowStockCount: number;
  outOfStockCount: number;
  expiringCount: number;
  expiringValuePaise: number;
  deadStockCount: number;
  deadStockValuePaise: number;
  alertCount: number;
};

export type InventoryOverviewRow = {
  productId: string;
  sku: string;
  name: string;
  genericName: string | null;
  brandName: string | null;
  manufacturerName: string | null;
  categoryId: string;
  categoryName: string | null;
  categoryIcon: string | null;
  scheduleClassification: string | null;
  prescriptionRequired: boolean;
  rackLocation: string | null;
  baseUnit: string;
  packUnit: string;
  packSize: number;
  batchCount: number;
  earliestExpiry: string | null;
  expired: boolean;
  nearExpiry: boolean;
  onHandQuantity: number;
  lowStock: boolean;
  outOfStock: boolean;
  mrpPaise: number | null;
  costValuePaise: number;
  retailValuePaise: number;
  looseUnitPaise: number | null;
  looseSellingEnabled: boolean;
  onlineListed: boolean;
  unallocated: boolean;
  deadStock: boolean;
};

export type InventoryOverview = {
  summary: InventoryOverviewSummary;
  items: InventoryOverviewRow[];
};

export async function listStockBalances(query?: string): Promise<StockBalance[]> {
  const { data } = await apiClient.get<{ items: StockBalance[] }>(API.INVENTORY_BALANCES, {
    params: query?.trim() ? { q: query.trim() } : undefined,
  });
  return data.items;
}

export async function getInventoryOverview(): Promise<InventoryOverview> {
  const { data } = await apiClient.get<InventoryOverview>(API.INVENTORY_OVERVIEW);
  return data;
}

export async function updateInventoryListingFlags(
  productId: string,
  flags: { looseSellingEnabled?: boolean; onlineListed?: boolean },
): Promise<InventoryOverviewRow> {
  const { data } = await apiClient.patch<InventoryOverviewRow>(
    API.inventoryProductListingFlags(productId),
    flags,
  );
  return data;
}

export async function listStockBatches(productId: string): Promise<StockBatchDetail[]> {
  const { data } = await apiClient.get<{ items: StockBatchDetail[] }>(
    API.inventoryProductBatches(productId),
  );
  return data.items;
}

export async function listStockMovements(params?: {
  productId?: string;
  batchId?: string;
}): Promise<StockMovement[]> {
  const { data } = await apiClient.get<{ items: StockMovement[] }>(API.INVENTORY_MOVEMENTS, {
    params,
  });
  return data.items;
}

export async function receiveStock(input: StockReceiptInput): Promise<StockBalance> {
  const { data } = await apiClient.post<StockBalance>(API.INVENTORY_RECEIPTS, input);
  return data;
}

export async function getInventorySettings(): Promise<InventorySettings> {
  const { data } = await apiClient.get<InventorySettings>(API.INVENTORY_SETTINGS);
  return data;
}

export async function updateInventorySettings(expiryWarnDays: number): Promise<InventorySettings> {
  const { data } = await apiClient.put<InventorySettings>(API.INVENTORY_SETTINGS, {
    expiryWarnDays,
  });
  return data;
}

export async function getProductStockLevels(productId: string): Promise<BranchStockLevels> {
  const { data } = await apiClient.get<BranchStockLevels>(
    API.inventoryProductStockLevels(productId),
  );
  return data;
}

export async function updateProductStockLevels(
  productId: string,
  levels: BranchStockLevels,
): Promise<BranchStockLevels> {
  const { data } = await apiClient.put<BranchStockLevels>(
    API.inventoryProductStockLevels(productId),
    levels,
  );
  return data;
}

export async function getInventoryAlerts(): Promise<InventoryAlerts> {
  const { data } = await apiClient.get<InventoryAlerts>(API.INVENTORY_ALERTS);
  return data;
}

export async function getInventoryValuation(): Promise<StockValuation> {
  const { data } = await apiClient.get<StockValuation>(API.INVENTORY_VALUATION);
  return data;
}

export async function downloadReorderReport(): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(API.INVENTORY_REORDER_REPORT, {
    responseType: 'blob',
  });
  return data;
}
