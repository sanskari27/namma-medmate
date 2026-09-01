import { createPlanGatingStore } from '@namma-medmate/plan-gating-ui';
import { appConfig } from '../config/app-config.ts';
import { getAccessToken, getLocationId } from '../services/api/token.ts';

export const planGatingStore = createPlanGatingStore({
  baseUrl: appConfig.planGatingApiBaseUrl,
  getAccessToken,
  getLocationId,
});
