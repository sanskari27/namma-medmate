import { createManageUsersStore } from '@namma-medmate/manage-users-ui';
import { appConfig } from '../config/app-config.ts';
import { getAccessToken, getLocationId } from '../services/api/token.ts';

export const manageUsersStore = createManageUsersStore({
  baseUrl: appConfig.manageUsersApiBaseUrl,
  getAccessToken,
  getLocationId,
});
