import { request } from './http';
import type { ApiResult, Address, Pharmacy } from '@/types';

export async function fetchAddresses(): Promise<ApiResult<Address[]>> {
  return request<Address[]>('/addresses');
}

export async function fetchPharmacies(): Promise<ApiResult<Pharmacy[]>> {
  return request<Pharmacy[]>('/pharmacies');
}

export async function fetchPharmacy(id: string): Promise<ApiResult<Pharmacy>> {
  return request<Pharmacy>(`/pharmacy/${id}`);
}

export interface DetectLocationResponse {
  address: Address;
  nearbyPharmacyCount: number;
  fastestMinutes: number;
}

/** Ask the platform for the device position and resolve it to an address. */
export async function detectLocation(): Promise<ApiResult<DetectLocationResponse>> {
  return request<DetectLocationResponse>('/location/detect');
}
