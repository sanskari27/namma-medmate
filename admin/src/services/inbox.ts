import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export interface HqInboxItem {
  id: string;
  title: string;
  body: string | null;
  sourceType: string;
  sourceId: string;
  read: boolean;
  createdAt: string;
}

export interface HqInboxPage {
  items: HqInboxItem[];
  unreadCount: number;
  page: number;
  size: number;
  totalPages: number;
  totalItems: number;
}

export interface HqOpenTarget {
  href: string;
  sourceType: string;
  sourceId: string;
}

export { ApiError, isApiError };

export async function listHqInbox(page = 0, size = 6): Promise<HqInboxPage> {
  const { data } = await apiClient.get<HqInboxPage>(API.NOTIFICATIONS, { params: { page, size } });
  return data;
}

export async function countHqUnread(): Promise<number> {
  const { data } = await apiClient.get<{ unreadCount: number }>(API.NOTIFICATIONS_UNREAD);
  return data.unreadCount;
}

export async function fileHqInboxItem(id: string): Promise<HqInboxItem> {
  const { data } = await apiClient.post<HqInboxItem>(`${API.NOTIFICATIONS}/${id}/read`);
  return data;
}

export async function openHqInboxItem(id: string): Promise<HqOpenTarget> {
  const { data } = await apiClient.post<HqOpenTarget>(`${API.NOTIFICATIONS}/${id}/open`);
  return data;
}
