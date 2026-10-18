import { apiClient } from './axios';

export interface WaitlistSignup {
  id: string;
  name: string;
  phone: string;
  pincode: string;
  age: number;
  gender: string;
  consent: boolean;
  source: string;
  lang: string;
  offer: string;
  createdAt: string;
}

export async function listWaitlist(): Promise<WaitlistSignup[]> {
  const { data } = await apiClient.get<{ items: WaitlistSignup[] }>('/api/v1/admin/waitlist');
  return data.items;
}
