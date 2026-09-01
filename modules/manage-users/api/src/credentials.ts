import type { AuthRepository } from '@namma-medmate/db-services';
import {
  hashSecret,
  openSecret,
  randomTempPassword,
  sealSecret,
} from '@namma-medmate/encryption-utils';

export async function issueTempPassword(
  auth: AuthRepository,
  userId: string,
  encryptKey: string,
  generate: () => string = randomTempPassword,
): Promise<string> {
  const tempPassword = generate();
  const passwordHash = await hashSecret(tempPassword);
  const updated = await auth.setPasswordCredentials(userId, {
    passwordHash,
    tempPasswordCiphertext: sealSecret(tempPassword, encryptKey),
    tempPasswordPending: true,
  });
  if (!updated) {
    throw new Error('User missing during password issue');
  }
  return tempPassword;
}

export function copyTempPassword(
  user: { tempPasswordPending: boolean; tempPasswordCiphertext: string | null },
  encryptKey: string,
): string {
  if (!user.tempPasswordPending || !user.tempPasswordCiphertext) {
    throw new Error('unavailable');
  }
  return openSecret(user.tempPasswordCiphertext, encryptKey);
}

export async function hashPin(pin: string): Promise<string> {
  return hashSecret(pin);
}
