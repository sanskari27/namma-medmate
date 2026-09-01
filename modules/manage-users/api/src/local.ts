import { listenLocal } from '@namma-medmate/lambda-bootstrap';
import {
  createMemoryAuthRepository,
  createMemoryTenancyRepository,
} from '@namma-medmate/db-services';
import { allPermissionsTrue } from './permissions.ts';
import { createApp } from './app.ts';
import { loadManageUsersEnv } from './config/env.ts';
import {
  localSeedPharmacy,
  LOCAL_SEED_LOCATION_ID,
  LOCAL_SEED_OWNER_ID,
  LOCAL_SEED_TENANT_ID,
} from './local-seed.ts';

const env = loadManageUsersEnv();
const auth = createMemoryAuthRepository();
await auth.createUser({
  userId: LOCAL_SEED_OWNER_ID,
  tenantId: LOCAL_SEED_TENANT_ID,
  locationId: LOCAL_SEED_LOCATION_ID,
  loginId: 'priya.owner',
  role: 'owner',
  passwordEnabled: true,
  otpEnabled: true,
  otpMobile: '+919876543210',
  permissions: allPermissionsTrue(),
});
listenLocal(
  createApp(env, { auth, tenancy: createMemoryTenancyRepository(localSeedPharmacy()) }),
  env.MANAGE_USERS_API_PORT,
  'manage-users-api',
);
