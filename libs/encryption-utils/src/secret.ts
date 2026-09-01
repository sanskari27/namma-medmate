import { compare, hash } from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

// ponytail: bcrypt cost 12 until Argon2id native is available in the Lambda runtime (06-auth NFR-2).
export async function hashSecret(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS);
}

export async function verifySecret(storedHash: string, plain: string): Promise<boolean> {
  return compare(plain, storedHash);
}
