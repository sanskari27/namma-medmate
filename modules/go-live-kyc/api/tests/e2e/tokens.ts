import { readFileSync } from 'node:fs';

export function e2eTokens() {
  const path = process.env.GO_LIVE_KYC_E2E_TOKENS_PATH ?? '/tmp/go-live-kyc-e2e-tokens.json';
  return JSON.parse(readFileSync(path, 'utf8')) as {
    pharmacy: string;
    hq: string;
  };
}
