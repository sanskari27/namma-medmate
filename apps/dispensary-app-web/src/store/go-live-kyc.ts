import { createGoLiveKycStore } from '@namma-medmate/go-live-kyc-ui';
import { appConfig } from '../config/app-config.ts';
import { getAccessToken, getLocationId } from '../services/api/token.ts';

export const goLiveKycStore = createGoLiveKycStore({
  baseUrl: appConfig.goLiveKycApiBaseUrl,
  getAccessToken,
  getLocationId,
});
