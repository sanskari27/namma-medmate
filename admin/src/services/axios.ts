import axios from 'axios';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  code: string | null;
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

apiClient.interceptors.response.use((response) => {
  const body = response.data as ApiResponse<unknown>;
  if (body && typeof body === 'object' && 'success' in body) {
    if (!body.success) {
      return Promise.reject(new Error(body.message ?? 'Request failed'));
    }
    response.data = body.data;
  }
  return response;
});
