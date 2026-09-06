import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type CampaignStatus = 'DRAFT' | 'READY_FOR_DELIVERY';

export interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  status: CampaignStatus;
  tagIds: string[];
  templateUniqueName: string;
  namespaceName: string;
  variables: Record<string, string>;
  previewedAt: string | null;
  recipientCount: number | null;
  frozenAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignTagOption {
  id: string;
  name: string;
}

export interface CampaignTemplateOption {
  uniqueName: string;
  namespaceName: string;
  status: string;
}

export interface CampaignList {
  items: Campaign[];
  tags: CampaignTagOption[];
  templates: CampaignTemplateOption[];
}

export interface CampaignDraftInput {
  name: string;
  tagIds: string[];
  templateUniqueName: string;
  variables?: Record<string, string>;
}

export async function listCampaigns(): Promise<CampaignList> {
  const { data } = await apiClient.get<CampaignList>(API.CAMPAIGNS);
  return data;
}

export async function createCampaign(input: CampaignDraftInput): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>(API.CAMPAIGNS, input);
  return data;
}

export async function previewCampaign(id: string, expectedVersion: number): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>(API.campaignPreview(id), { expectedVersion });
  return data;
}

export async function readyCampaign(id: string, expectedVersion: number): Promise<Campaign> {
  const { data } = await apiClient.post<Campaign>(API.campaignReady(id), { expectedVersion });
  return data;
}
