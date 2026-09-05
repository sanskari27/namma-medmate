import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export type OfferKind = 'BOGO' | 'SEASONAL' | 'BUNDLE';
export type OfferStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type OfferBenefitType = 'PERCENT' | 'FLAT' | 'FREE_QTY';
export type OfferProductSlot = 'TRIGGER' | 'BENEFIT' | 'BUNDLE';

export interface SalesOfferProduct {
  productId: string;
  slot: OfferProductSlot;
}

export interface SalesOffer {
  id: string;
  tenantId: string;
  name: string;
  kind: OfferKind;
  status: OfferStatus;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  benefitType: OfferBenefitType;
  benefitValue: number;
  version: number;
  products: SalesOfferProduct[];
  createdAt: string;
  updatedAt: string;
}

export interface OfferInput {
  name: string;
  kind: OfferKind;
  priority: number;
  startsAt?: string | null;
  endsAt?: string | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  benefitType: OfferBenefitType;
  benefitValue: number;
  expectedVersion?: number;
  products: SalesOfferProduct[];
}

export async function listOffers(): Promise<{ items: SalesOffer[] }> {
  const { data } = await apiClient.get<{ items: SalesOffer[] }>(API.OFFERS);
  return data;
}

export async function createOffer(input: OfferInput): Promise<SalesOffer> {
  const { data } = await apiClient.post<SalesOffer>(API.OFFERS, input);
  return data;
}

export async function updateOffer(id: string, input: OfferInput): Promise<SalesOffer> {
  const { data } = await apiClient.patch<SalesOffer>(API.offer(id), input);
  return data;
}

export async function publishOffer(
  id: string,
  input: { expectedVersion: number },
): Promise<SalesOffer> {
  const { data } = await apiClient.post<SalesOffer>(API.offerPublish(id), input);
  return data;
}

export async function deactivateOffer(
  id: string,
  input: { expectedVersion: number },
): Promise<SalesOffer> {
  const { data } = await apiClient.post<SalesOffer>(API.offerDeactivate(id), input);
  return data;
}
