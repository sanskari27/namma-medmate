import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface Doctor {
  id: string;
  tenantId: string;
  name: string;
  registrationNumber: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorInput {
  name: string;
  registrationNumber?: string;
  phone?: string;
  notes?: string;
}

export interface TopReferringDoctor {
  id: string;
  name: string;
  registrationNumber: string | null;
  referralCount: number;
}

export async function listDoctors(): Promise<Doctor[]> {
  const { data } = await apiClient.get<{ items: Doctor[] }>(API.DOCTORS);
  return data.items;
}

export async function createDoctor(input: DoctorInput): Promise<Doctor> {
  const { data } = await apiClient.post<Doctor>(API.DOCTORS, input);
  return data;
}

export async function updateDoctor(id: string, input: DoctorInput): Promise<Doctor> {
  const { data } = await apiClient.patch<Doctor>(API.doctor(id), input);
  return data;
}

export async function deactivateDoctor(id: string): Promise<Doctor> {
  const { data } = await apiClient.delete<Doctor>(API.doctor(id));
  return data;
}

export async function listTopReferringDoctors(limit = 5): Promise<TopReferringDoctor[]> {
  const { data } = await apiClient.get<{ items: TopReferringDoctor[] }>(API.DOCTORS_TOP_REFERRING, {
    params: { limit },
  });
  return data.items;
}
