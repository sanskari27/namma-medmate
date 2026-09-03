import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface KioskTicket {
  id: string;
  token: number;
  walkInName: string | null;
  pickupRequest: string;
  createdAt: string;
}

export interface KioskSession {
  id: string;
  status: string;
  openedAt: string;
  openedBy: string;
}

export interface KioskState {
  planEntitled: boolean;
  hasModule: boolean;
  branchType: string | null;
  activeBranchId: string | null;
  blockReason: string | null;
  session: KioskSession | null;
  waitingTickets: KioskTicket[];
}

export async function getKiosk(): Promise<KioskState> {
  const { data } = await apiClient.get<KioskState>(API.KIOSK);
  return data;
}

export async function openKiosk(): Promise<KioskState> {
  const { data } = await apiClient.post<KioskState>(API.KIOSK_OPEN);
  return data;
}

export async function closeKiosk(): Promise<KioskState> {
  const { data } = await apiClient.post<KioskState>(API.KIOSK_CLOSE);
  return data;
}

export async function createKioskTicket(
  walkInName: string,
  pickupRequest: string,
): Promise<KioskState> {
  const { data } = await apiClient.post<KioskState>(API.KIOSK_TICKETS, {
    walkInName: walkInName || null,
    pickupRequest,
  });
  return data;
}

export async function cancelKioskTicket(ticketId: string): Promise<KioskState> {
  const { data } = await apiClient.post<KioskState>(API.kioskTicketCancel(ticketId));
  return data;
}
