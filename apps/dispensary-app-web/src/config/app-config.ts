export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001',
  tenancyApiBaseUrl: import.meta.env.VITE_TENANCY_API_BASE_URL ?? 'http://localhost:3002',
  whatsappApiBaseUrl: import.meta.env.VITE_WHATSAPP_API_BASE_URL ?? 'http://localhost:3003',
  masterCatalogueApiBaseUrl:
    import.meta.env.VITE_MASTER_CATALOGUE_API_BASE_URL ?? 'http://localhost:3005',
  planGatingApiBaseUrl: import.meta.env.VITE_PLAN_GATING_API_BASE_URL ?? 'http://localhost:3006',
  manageUsersApiBaseUrl: import.meta.env.VITE_MANAGE_USERS_API_BASE_URL ?? 'http://localhost:3007',
  employeesApiBaseUrl: import.meta.env.VITE_EMPLOYEES_API_BASE_URL ?? 'http://localhost:3008',
  tokenStorageKey: 'namma.accessToken',
  locationStorageKey: 'namma.locationId',
  deviceStorageKey: 'namma.deviceToken',
  loginIdStorageKey: 'namma.loginId',
};
