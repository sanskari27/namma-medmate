import { request } from './http';
import type { ApiResult, User } from '@/types';

export interface RequestOtpResponse {
  phone: string;
  expiresInSeconds: number;
}

export interface VerifyOtpResponse {
  token: string;
  user: User;
}

/** Ask the backend (or mock) to send a 4-digit SMS code to `phone`. */
export async function requestOtp(phone: string): Promise<ApiResult<RequestOtpResponse>> {
  return request<RequestOtpResponse>('/auth/request-otp', {
    method: 'POST',
    body: { phone },
  });
}

/** Exchange the 4-digit code for a session token and the user profile. */
export async function verifyOtp(
  phone: string,
  code: string,
): Promise<ApiResult<VerifyOtpResponse>> {
  return request<VerifyOtpResponse>('/auth/verify-otp', {
    method: 'POST',
    body: { phone, code },
  });
}
