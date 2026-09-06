import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type WhatsAppMessageKind = 'REFILL_DUE' | 'CREDIT_DUE' | 'CAMPAIGN';
export type WhatsAppMessageStatus = 'QUEUED' | 'SENT' | 'FAILED';

export interface WhatsAppMessage {
  id: string;
  tenantId: string;
  kind: WhatsAppMessageKind;
  sourceId: string;
  customerId: string;
  campaignId: string | null;
  templateUniqueName: string;
  namespaceName: string;
  preview: string;
  status: WhatsAppMessageStatus;
  failureCode: string | null;
  providerMessageId: string | null;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppMessageList {
  items: WhatsAppMessage[];
  queued: number;
  sent: number;
  failed: number;
}

export async function listWhatsAppMessages(params?: {
  kind?: WhatsAppMessageKind;
  status?: WhatsAppMessageStatus;
  campaignId?: string;
}): Promise<WhatsAppMessageList> {
  const { data } = await apiClient.get<WhatsAppMessageList>(API.WHATSAPP_MESSAGES, { params });
  return data;
}

export async function sendCampaignMessages(campaignId: string): Promise<WhatsAppMessageList> {
  const { data } = await apiClient.post<WhatsAppMessageList>(API.whatsappCampaignSend(campaignId));
  return data;
}

export async function retryWhatsAppMessage(id: string): Promise<WhatsAppMessage> {
  const { data } = await apiClient.post<WhatsAppMessage>(API.whatsappMessageRetry(id));
  return data;
}
