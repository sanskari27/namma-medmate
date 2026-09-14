import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type KioskPaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'COD';

export type KioskAccentTheme = 'green' | 'dark' | 'gold';

export interface KioskTicketItem {
  productId: string;
  name: string;
  packLabel?: string | null;
  quantity: number;
  unitPricePaise: number;
  prescriptionRequired: boolean;
}

export interface KioskTicket {
  id: string;
  token: number;
  walkInName: string | null;
  pickupRequest: string;
  paymentMethod: KioskPaymentMethod | null;
  requiresRx: boolean;
  items: KioskTicketItem[];
  createdAt: string;
}

export interface KioskSession {
  id: string;
  status: string;
  openedAt: string;
  openedBy: string;
}

export interface KioskConfig {
  displayName: string;
  welcomeMessage: string;
  staffExitPin: string;
  idleResetSeconds: number;
  accentTheme: KioskAccentTheme;
  showPrices: boolean;
  allowRxUpload: boolean;
  acceptCash: boolean;
  acceptUpi: boolean;
  acceptCard: boolean;
  acceptCod: boolean;
}

export interface KioskState {
  planEntitled: boolean;
  hasModule: boolean;
  branchType: string | null;
  activeBranchId: string | null;
  branchName: string | null;
  blockReason: string | null;
  session: KioskSession | null;
  config: KioskConfig;
  waitingTickets: KioskTicket[];
}

export type KioskConfigInput = Partial<KioskConfig>;

export type CreateKioskTicketInput = {
  walkInName?: string;
  pickupRequest?: string;
  paymentMethod?: KioskPaymentMethod;
  items?: Array<{
    productId: string;
    name: string;
    packLabel?: string | null;
    quantity: number;
    unitPricePaise?: number;
    prescriptionRequired?: boolean;
  }>;
};

function normalizeTicket(raw: Record<string, unknown>): KioskTicket {
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  return {
    id: String(raw.id),
    token: Number(raw.token),
    walkInName: (raw.walkInName as string | null) ?? null,
    pickupRequest: String(raw.pickupRequest ?? ''),
    paymentMethod: (raw.paymentMethod as KioskPaymentMethod | null) ?? null,
    requiresRx: Boolean(raw.requiresRx),
    items: itemsRaw.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        productId: String(item.productId ?? ''),
        name: String(item.name ?? ''),
        packLabel: (item.packLabel as string | null) ?? null,
        quantity: Number(item.quantity ?? 1),
        unitPricePaise: Number(item.unitPricePaise ?? 0),
        prescriptionRequired: Boolean(item.prescriptionRequired),
      };
    }),
    createdAt: String(raw.createdAt),
  };
}

function normalizeState(data: Record<string, unknown>): KioskState {
  const config = (data.config ?? {}) as Partial<KioskConfig>;
  const tickets = Array.isArray(data.waitingTickets) ? data.waitingTickets : [];
  return {
    planEntitled: Boolean(data.planEntitled),
    hasModule: Boolean(data.hasModule),
    branchType: (data.branchType as string | null) ?? null,
    activeBranchId: (data.activeBranchId as string | null) ?? null,
    branchName: (data.branchName as string | null) ?? null,
    blockReason: (data.blockReason as string | null) ?? null,
    session: (data.session as KioskSession | null) ?? null,
    config: {
      displayName: config.displayName ?? 'Self Order',
      welcomeMessage:
        config.welcomeMessage ?? 'Tap to order your medicines & wellness products',
      staffExitPin: config.staffExitPin ?? '0000',
      idleResetSeconds: config.idleResetSeconds ?? 60,
      accentTheme: (config.accentTheme as KioskAccentTheme) ?? 'green',
      showPrices: config.showPrices ?? true,
      allowRxUpload: config.allowRxUpload ?? true,
      acceptCash: config.acceptCash ?? true,
      acceptUpi: config.acceptUpi ?? true,
      acceptCard: config.acceptCard ?? true,
      acceptCod: config.acceptCod ?? false,
    },
    waitingTickets: tickets.map((row) => normalizeTicket(row as Record<string, unknown>)),
  };
}

export async function getKiosk(): Promise<KioskState> {
  const { data } = await apiClient.get<Record<string, unknown>>(API.KIOSK);
  return normalizeState(data);
}

export async function openKiosk(): Promise<KioskState> {
  const { data } = await apiClient.post<Record<string, unknown>>(API.KIOSK_OPEN);
  return normalizeState(data);
}

export async function closeKiosk(): Promise<KioskState> {
  const { data } = await apiClient.post<Record<string, unknown>>(API.KIOSK_CLOSE);
  return normalizeState(data);
}

export async function saveKioskConfig(input: KioskConfigInput): Promise<KioskState> {
  const { data } = await apiClient.put<Record<string, unknown>>(API.KIOSK_CONFIG, input);
  return normalizeState(data);
}

export async function createKioskTicket(input: CreateKioskTicketInput): Promise<KioskState> {
  const { data } = await apiClient.post<Record<string, unknown>>(API.KIOSK_TICKETS, {
    walkInName: input.walkInName || null,
    pickupRequest: input.pickupRequest || null,
    paymentMethod: input.paymentMethod ?? null,
    items: input.items ?? [],
  });
  return normalizeState(data);
}

export async function cancelKioskTicket(ticketId: string): Promise<KioskState> {
  const { data } = await apiClient.post<Record<string, unknown>>(API.kioskTicketCancel(ticketId));
  return normalizeState(data);
}
