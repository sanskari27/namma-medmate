import { readFileSync } from 'node:fs';

export function e2eTokens() {
  const path = process.env.EMPLOYEES_E2E_TOKENS_PATH ?? '/tmp/employees-e2e-tokens.json';
  return JSON.parse(readFileSync(path, 'utf8')) as {
    pharmacy: string;
    hq: string;
  };
}
