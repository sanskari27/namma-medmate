import { createEmployeesStore } from '@namma-medmate/employees-ui';
import { appConfig } from '../config/app-config.ts';
import { getAccessToken, getLocationId } from '../services/api/token.ts';

export const employeesStore = createEmployeesStore({
  baseUrl: appConfig.employeesApiBaseUrl,
  manageUsersBaseUrl: appConfig.manageUsersApiBaseUrl,
  getAccessToken,
  getLocationId,
});
