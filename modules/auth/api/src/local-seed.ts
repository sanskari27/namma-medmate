import type { AuthRepository } from '@namma-medmate/db-services';
import { hashSecret } from '@namma-medmate/encryption-utils';

export const SEED_TENANT_ID = '8f1c0a7e-2b3d-4e5f-8a90-123456789abc';
export const SEED_LOCATION_ID = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';
export const SEED_PASSWORD = 'CounterPass1';
export const SEED_PIN = '1234';

export async function seedAuthUsers(auth: AuthRepository): Promise<void> {
  const passwordHash = await hashSecret(SEED_PASSWORD);
  const pinHash = await hashSecret(SEED_PIN);
  await auth.createUser({
    tenantId: SEED_TENANT_ID,
    locationId: SEED_LOCATION_ID,
    loginId: 'priya.owner',
    passwordHash,
    passwordEnabled: true,
    otpEnabled: true,
    otpMobile: '+919876543210',
    pinHash,
    role: 'owner',
  });
  await auth.createUser({
    tenantId: SEED_TENANT_ID,
    locationId: SEED_LOCATION_ID,
    loginId: 'priya.cashier',
    passwordHash,
    passwordEnabled: true,
    otpEnabled: true,
    otpMobile: '+919876543211',
    pinHash,
    role: 'cashier',
  });
  await auth.createUser({
    tenantId: SEED_TENANT_ID,
    locationId: SEED_LOCATION_ID,
    loginId: 'otp.only',
    passwordEnabled: false,
    otpEnabled: true,
    otpMobile: '+919876543212',
    role: 'pharmacist',
  });
  await auth.createUser({
    tenantId: SEED_TENANT_ID,
    locationId: SEED_LOCATION_ID,
    loginId: 'password.only',
    passwordHash,
    passwordEnabled: true,
    otpEnabled: false,
    role: 'manager',
  });
  await auth.createUser({
    tenantId: SEED_TENANT_ID,
    locationId: SEED_LOCATION_ID,
    loginId: 'inactive.user',
    passwordHash,
    passwordEnabled: true,
    otpEnabled: false,
    role: 'cashier',
    active: false,
  });
  await auth.createUser({
    tenantId: SEED_TENANT_ID,
    locationId: SEED_LOCATION_ID,
    loginId: 'no.methods',
    passwordEnabled: false,
    otpEnabled: false,
    role: 'cashier',
  });
}
