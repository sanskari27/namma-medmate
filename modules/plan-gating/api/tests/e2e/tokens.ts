import { readFileSync } from 'node:fs';

export function e2eTokens() {
  const path = process.env.PLAN_GATING_E2E_TOKENS_PATH ?? '/tmp/plan-gating-e2e-tokens.json';
  return JSON.parse(readFileSync(path, 'utf8')) as {
    pharmacy: string;
    hq: string;
  };
}
