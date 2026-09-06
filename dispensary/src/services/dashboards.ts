import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type DashboardRole = 'cashier' | 'inventory' | 'accountant' | 'owner';

export type DashboardScope = 'branch' | 'tenant';

export interface HoldItem {
  id: string;
  invoiceNumber: string;
  totalPaise: number;
  heldAt: string;
}

export interface LowStockItem {
  productId: string;
  sku: string;
  productName: string;
  onHand: number | string;
  reorderLevel: number | null;
  branchId?: string | null;
  branchName?: string | null;
}

export type WidgetStatus = 'OK' | 'FAILED';

export interface DashboardWidget<T> {
  key: string;
  status: WidgetStatus | string;
  asOf: string;
  href: string;
  error?: string | null;
  data?: T | null;
}

export interface SalesPayload {
  todaySalesPaise: number;
  todayBillCount: number;
  branches: BranchSales[];
}

export interface CountItemsPayload<T> {
  count: number;
  items: T[];
}

export interface ExpiryItem {
  productId: string;
  sku: string;
  productName: string;
  batchNumber: string;
  expiresOn: string;
  quantity: number | string;
  branchId?: string | null;
  branchName?: string | null;
}

export interface WorkItem {
  id: string;
  label: string;
  status: string;
  href: string;
}

export interface AgingPayload {
  totalPaise: number;
  buckets: BucketItem[];
}

export interface TopProductItem {
  productId: string;
  sku: string;
  productName: string;
  quantity: number | string;
  salesPaise: number;
}

export interface LicenseDueItem {
  id: string;
  docType: string;
  expiresOn: string;
  branchId?: string | null;
  href: string;
}

export interface CompliancePayload {
  tenantStatus: string;
  kycStatus: string;
  licenseDueCount: number;
  licenses: LicenseDueItem[];
}

export interface TransferItem {
  id: string;
  status: string;
  direction: string;
  href: string;
}

export interface GrnItem {
  id: string;
  receiptNumber: string;
  status: string;
  href: string;
}

export interface BucketItem {
  key: string;
  label: string;
  totalPaise: number;
}

export interface BranchSales {
  id: string;
  name: string;
  todaySalesPaise: number;
}

export interface CashierDesk {
  todaySalesPaise: number;
  todayBillCount: number;
  holds: HoldItem[];
  sources: { sales: string; holds: string };
}

export interface InventoryDesk {
  lowStock: LowStockItem[];
  pendingTransfers: TransferItem[];
  pendingGrn: GrnItem[];
  sources: { stock: string; transfers: string; grn: string };
}

export interface AccountantDesk {
  receivablesTotalPaise?: number | null;
  payablesTotalPaise?: number | null;
  expenseTotalPaise: number;
  receivableBuckets?: BucketItem[] | null;
  sources: { aging: string; expenses: string };
  agingHint?: string | null;
}

export interface OwnerDesk {
  asOf?: string;
  todaySalesPaise: number;
  todayBillCount: number;
  branches: BranchSales[];
  receivablesTotalPaise?: number | null;
  payablesTotalPaise?: number | null;
  expenseTotalPaise: number;
  lowStockCount: number;
  sources: { sales: string; stock: string; aging: string; expenses: string };
  sales?: DashboardWidget<SalesPayload> | null;
  lowStock?: DashboardWidget<CountItemsPayload<LowStockItem>> | null;
  expiry?: DashboardWidget<CountItemsPayload<ExpiryItem>> | null;
  approvals?: DashboardWidget<CountItemsPayload<WorkItem>> | null;
  receivables?: DashboardWidget<AgingPayload> | null;
  payables?: DashboardWidget<AgingPayload> | null;
  topProducts?: DashboardWidget<CountItemsPayload<TopProductItem>> | null;
  transfers?: DashboardWidget<CountItemsPayload<TransferItem>> | null;
  compliance?: DashboardWidget<CompliancePayload> | null;
  openPurchaseOrders?: DashboardWidget<CountItemsPayload<WorkItem>> | null;
}

export interface DashboardView {
  role: DashboardRole | string;
  asOf: string;
  generatedAt: string;
  scope: DashboardScope | string;
  branchId: string | null;
  branchName: string | null;
  permittedRoles: string[];
  cashier?: CashierDesk | null;
  inventory?: InventoryDesk | null;
  accountant?: AccountantDesk | null;
  owner?: OwnerDesk | null;
}

export interface DashboardQuery {
  branchId?: string;
  scope?: DashboardScope;
}

export async function fetchDashboard(
  role: DashboardRole,
  query: DashboardQuery = {},
): Promise<DashboardView> {
  const params: DashboardQuery = {};
  if (query.branchId) {
    params.branchId = query.branchId;
  }
  if (query.scope) {
    params.scope = query.scope;
  }
  const { data } = await apiClient.get<DashboardView>(API.dashboard(role), { params });
  return data;
}
