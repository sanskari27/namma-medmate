import { readFileSync } from 'node:fs';

export function e2eTokens() {
  const path = process.env.AUDIT_E2E_TOKENS_PATH ?? '/tmp/audit-e2e-tokens.json';
  return JSON.parse(readFileSync(path, 'utf8')) as {
    pharmacy: string;
    otherPharmacy: string;
    hq: string;
  };
}

export const SERVICE = 'e2e-audit-service';
export const TENANT = '8f1c0a7e-2b3d-4e5f-8a90-123456789abc';
export const LOCATION = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';
