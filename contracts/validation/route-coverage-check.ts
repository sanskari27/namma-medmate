import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { discoverContracts, repoRoot } from '../codegen/aggregate-contracts.ts';

interface ImplementedRoute {
  method: string;
  path: string;
}

export async function checkRouteCoverage(): Promise<void> {
  const contracts = await discoverContracts();
  const declared = new Set<string>();
  for (const contract of contracts) {
    const paths = (contract.document.paths ?? {}) as Record<string, Record<string, unknown>>;
    for (const [path, methods] of Object.entries(paths)) {
      for (const method of Object.keys(methods)) {
        declared.add(`${method.toLowerCase()} ${path}`);
      }
    }
  }

  const implemented = new Set<string>();
  for (const contract of contracts) {
    const routesPath = join(
      repoRoot,
      'modules',
      contract.domain,
      'api/contract/implemented-routes.json',
    );
    const routes = JSON.parse(await readFile(routesPath, 'utf8')) as ImplementedRoute[];
    for (const route of routes) {
      implemented.add(`${route.method.toLowerCase()} ${route.path}`);
    }
  }

  for (const route of implemented) {
    if (!declared.has(route)) {
      throw new Error(`Implemented route is missing from OpenAPI: ${route}`);
    }
  }
  for (const route of declared) {
    if (route.endsWith(' /health')) {
      throw new Error('/health must not appear in domain OpenAPI contracts');
    }
    if (!implemented.has(route)) {
      throw new Error(`OpenAPI route is missing an implementation: ${route}`);
    }
  }
}

if (process.argv[1]?.endsWith('route-coverage-check.ts')) {
  await checkRouteCoverage();
  process.stdout.write('route coverage ok\n');
}
