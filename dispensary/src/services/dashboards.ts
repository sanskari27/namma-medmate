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
  receivablesTotalPaise: number;
  payablesTotalPaise: number;
  expenseTotalPaise: number;
  receivableBuckets: BucketItem[];
  sources: { aging: string; expenses: string };
}

export interface OwnerDesk {
  todaySalesPaise: number;
  todayBillCount: number;
  branches: BranchSales[];
  receivablesTotalPaise: number;
  payablesTotalPaise: number;
  expenseTotalPaise: number;
  lowStockCount: number;
  sources: { sales: string; stock: string; aging: string; expenses: string };
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
