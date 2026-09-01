import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function keyFromSecret(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function sealSecret(plaintext: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFromSecret(secret), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${encrypted.toString('base64url')}.${tag.toString('base64url')}`;
}

export function openSecret(sealed: string, secret: string): string {
  const [ivPart, dataPart, tagPart] = sealed.split('.');
  if (!ivPart || !dataPart || !tagPart) {
    throw new Error('Invalid sealed secret');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyFromSecret(secret),
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export function randomTempPassword(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (const byte of bytes) {
    out += TEMP_PASSWORD_CHARS[byte % TEMP_PASSWORD_CHARS.length];
  }
  return out;
}
