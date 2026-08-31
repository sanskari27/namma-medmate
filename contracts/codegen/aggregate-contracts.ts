import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

export interface DiscoveredContract {
  domain: string;
  path: string;
  document: Record<string, unknown>;
}

export async function discoverContracts(): Promise<DiscoveredContract[]> {
  const modulesDir = join(repoRoot, 'modules');
  const domains = await readdir(modulesDir, { withFileTypes: true });
  const contracts: DiscoveredContract[] = [];
  for (const domain of domains) {
    if (!domain.isDirectory() || domain.name.startsWith('_')) {
      continue;
    }
    const swaggerPath = join(modulesDir, domain.name, 'api/contract/swagger.yaml');
    try {
      const raw = await readFile(swaggerPath, 'utf8');
      const document = yaml.load(raw) as Record<string, unknown>;
      contracts.push({ domain: domain.name, path: swaggerPath, document });
    } catch {
      continue;
    }
  }
  return contracts.sort((a, b) => a.domain.localeCompare(b.domain));
}

export async function writeRegistry(contracts: DiscoveredContract[]): Promise<void> {
  const registryDir = join(repoRoot, 'contracts/registry');
  await mkdir(registryDir, { recursive: true });
  for (const contract of contracts) {
    const out = join(registryDir, `${contract.domain}.openapi.yaml`);
    const raw = await readFile(contract.path, 'utf8');
    await writeFile(out, raw);
  }
}

export function mergeContracts(contracts: DiscoveredContract[]): Record<string, unknown> {
  const paths: Record<string, unknown> = {};
  const schemas: Record<string, unknown> = {};
  const parameters: Record<string, unknown> = {};
  const responses: Record<string, unknown> = {};
  const securitySchemes: Record<string, unknown> = {};
  const operationIds = new Set<string>();
  const pathMethods = new Set<string>();

  for (const contract of contracts) {
    const docPaths = (contract.document.paths ?? {}) as Record<
      string,
      Record<string, { operationId?: string }>
    >;
    for (const [path, methods] of Object.entries(docPaths)) {
      for (const [method, operation] of Object.entries(methods)) {
        const key = `${method.toUpperCase()} ${path}`;
        if (pathMethods.has(key)) {
          throw new Error(`Duplicate path+method ${key}`);
        }
        pathMethods.add(key);
        if (operation.operationId) {
          if (operationIds.has(operation.operationId)) {
            throw new Error(`Duplicate operationId ${operation.operationId}`);
          }
          operationIds.add(operation.operationId);
        }
      }
      paths[path] = { ...(paths[path] as object | undefined), ...methods };
    }
    const components = (contract.document.components ?? {}) as {
      schemas?: Record<string, unknown>;
      parameters?: Record<string, unknown>;
      responses?: Record<string, unknown>;
      securitySchemes?: Record<string, unknown>;
    };
    Object.assign(schemas, components.schemas ?? {});
    Object.assign(parameters, components.parameters ?? {});
    Object.assign(responses, components.responses ?? {});
    Object.assign(securitySchemes, components.securitySchemes ?? {});
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Namma MedMate merged API',
      version: '0.1.0',
    },
    paths,
    components: {
      schemas,
      ...(Object.keys(parameters).length > 0 ? { parameters } : {}),
      ...(Object.keys(responses).length > 0 ? { responses } : {}),
      ...(Object.keys(securitySchemes).length > 0 ? { securitySchemes } : {}),
    },
  };
}

export async function writeMerged(document: Record<string, unknown>): Promise<string> {
  const out = join(repoRoot, 'contracts/merged-openapi.yaml');
  await mkdir(dirname(out), { recursive: true });
  const serialized = yaml.dump(document, { lineWidth: 120, noRefs: true });
  await writeFile(out, serialized);
  return out;
}

export function repoRelative(path: string): string {
  return relative(repoRoot, path);
}

export { repoRoot };
