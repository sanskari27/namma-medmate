import { createAuthStore } from '@namma-medmate/auth-ui';
import { appConfig } from '../config/app-config.ts';
import {
  clearChemistSession,
  getAccessToken,
  getDeviceToken,
  getStoredLoginId,
  navigateTo,
  persistChemistSession,
} from '../services/api/token.ts';

export const dispensaryStore = createAuthStore({
  baseUrl: appConfig.apiBaseUrl,
  getAccessToken,
  getDeviceToken,
  getStoredLoginId,
  persistSession: persistChemistSession,
  clearSession: clearChemistSession,
  navigate: navigateTo,
});
