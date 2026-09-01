import { createMasterCatalogueStore } from '@namma-medmate/master-catalogue-ui';
import { appConfig } from '../config/app-config.ts';
import { getAccessToken } from '../services/api/token.ts';

export const masterCatalogueStore = createMasterCatalogueStore({
  baseUrl: appConfig.masterCatalogueApiBaseUrl,
  getAccessToken,
});
