import { createWhatsAppStore } from '@namma-medmate/whatsapp-ui';
import { appConfig } from '../config/app-config.ts';
import { getAccessToken, getLocationId } from '../services/api/token.ts';

export const whatsappStore = createWhatsAppStore({
  baseUrl: appConfig.whatsappApiBaseUrl,
  getAccessToken,
  getLocationId,
});
