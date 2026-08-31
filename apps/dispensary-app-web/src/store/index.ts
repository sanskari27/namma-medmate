import { createAuthStore } from '@namma-medmate/auth-ui';
import { appConfig } from '../config/app-config.ts';
import { getAccessToken } from '../services/api/token.ts';

export const dispensaryStore = createAuthStore({
  baseUrl: appConfig.apiBaseUrl,
  getAccessToken,
});
