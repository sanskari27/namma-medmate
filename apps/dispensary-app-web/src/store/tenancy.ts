import { createTenancyStore } from '@namma-medmate/tenancy-ui';
import { appConfig } from '../config/app-config.ts';
import { getAccessToken, getLocationId } from '../services/api/token.ts';

export const tenancyStore = createTenancyStore({
  baseUrl: appConfig.tenancyApiBaseUrl,
  getAccessToken,
  getLocationId,
});
