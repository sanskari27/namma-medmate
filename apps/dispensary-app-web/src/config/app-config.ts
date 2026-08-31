export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001',
  tenancyApiBaseUrl: import.meta.env.VITE_TENANCY_API_BASE_URL ?? 'http://localhost:3002',
  tokenStorageKey: 'namma.accessToken',
  locationStorageKey: 'namma.locationId',
};
