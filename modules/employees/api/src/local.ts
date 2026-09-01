import { listenLocal } from '@namma-medmate/lambda-bootstrap';
import {
  createMemoryAuthRepository,
  createMemoryTenancyRepository,
} from '@namma-medmate/db-services';
import { createApp } from './app.ts';
import { loadEmployeesEnv } from './config/env.ts';
import {
  localSeedPharmacy,
  LOCAL_SEED_LOCATION_ID,
  LOCAL_SEED_OWNER_ID,
  LOCAL_SEED_TENANT_ID,
} from './local-seed.ts';
import { allPermissionsTrue } from './permissions.ts';

const env = loadEmployeesEnv();
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
  env.EMPLOYEES_API_PORT,
  'employees-api',
);
