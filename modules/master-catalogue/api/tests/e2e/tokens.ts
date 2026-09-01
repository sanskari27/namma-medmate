import { readFileSync } from 'node:fs';

export function e2eTokens() {
  const path =
    process.env.MASTER_CATALOGUE_E2E_TOKENS_PATH ?? '/tmp/master-catalogue-e2e-tokens.json';
  return JSON.parse(readFileSync(path, 'utf8')) as {
    pharmacy: string;
    hq: string;
  };
}

export const SERVICE = 'e2e-mc-service';
