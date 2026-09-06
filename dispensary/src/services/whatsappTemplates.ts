import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export type WhatsAppApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export interface WhatsAppProvider {
  displayNumber: string;
  phoneNumberId: string;
  health: string;
  syncedAt: string | null;
}

export interface WhatsAppTemplate {
  uniqueName: string;
  namespaceName: string;
  body: string;
  tenantSlots: string[];
  runtimeSlots: string[];
  status: WhatsAppApprovalStatus;
  variables: Record<string, string>;
  preview: string;
  version: number;
}

export interface WhatsAppOwnerCatalogue {
  provider: WhatsAppProvider;
  templates: WhatsAppTemplate[];
}

export async function listWhatsAppTemplates(): Promise<WhatsAppOwnerCatalogue> {
  const { data } = await apiClient.get<WhatsAppOwnerCatalogue>(API.WHATSAPP_TEMPLATES);
  return data;
}

export async function saveWhatsAppVariables(
  uniqueName: string,
  variables: Record<string, string>,
  version: number,
): Promise<WhatsAppTemplate> {
  const { data } = await apiClient.put<WhatsAppTemplate>(
    API.whatsappTemplateVariables(uniqueName),
    { variables, version },
  );
  return data;
}
