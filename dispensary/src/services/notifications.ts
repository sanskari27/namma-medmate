import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export interface InboxItem {
  id: string;
  title: string;
  body: string | null;
  sourceType: string;
  sourceId: string;
  read: boolean;
  createdAt: string;
}

export interface InboxPage {
  items: InboxItem[];
  unreadCount: number;
  page: number;
  size: number;
  totalPages: number;
  totalItems: number;
}

export interface OpenTarget {
  href: string;
  sourceType: string;
  sourceId: string;
}

export { ApiError, isApiError };

export async function fetchInbox(page = 0, size = 8): Promise<InboxPage> {
  const { data } = await apiClient.get<InboxPage>(API.NOTIFICATIONS, { params: { page, size } });
  return data;
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ unreadCount: number }>(API.NOTIFICATIONS_UNREAD);
  return data.unreadCount;
}

export async function markNotificationRead(id: string): Promise<InboxItem> {
  const { data } = await apiClient.post<InboxItem>(`${API.NOTIFICATIONS}/${id}/read`);
  return data;
}

export async function openNotification(id: string): Promise<OpenTarget> {
  const { data } = await apiClient.post<OpenTarget>(`${API.NOTIFICATIONS}/${id}/open`);
  return data;
}
