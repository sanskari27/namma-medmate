import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export type WhatsAppApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export interface WhatsAppProvider {
  displayNumber: string;
  phoneNumberId: string;
  health: string;
  syncedAt: string | null;
}

export interface WhatsAppStructure {
  uniqueName: string;
  body: string;
  tenantSlots: string[];
  runtimeSlots: string[];
  status: WhatsAppApprovalStatus;
  metaTemplateId: string;
}

export interface WhatsAppMasterCatalogue {
  provider: WhatsAppProvider;
  structures: WhatsAppStructure[];
}

export async function listWhatsAppTemplates(): Promise<WhatsAppMasterCatalogue> {
  const { data } = await apiClient.get<WhatsAppMasterCatalogue>(API.WHATSAPP_TEMPLATES);
  return data;
}

export async function syncWhatsAppProvider(): Promise<WhatsAppMasterCatalogue> {
  const { data } = await apiClient.post<WhatsAppMasterCatalogue>(API.WHATSAPP_PROVIDER_SYNC);
  return data;
}
