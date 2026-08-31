import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function collectProjectJson(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectProjectJson(full)));
    } else if (entry.name === 'project.json') {
      files.push(full);
    }
  }
  return files;
}

const errors: string[] = [];
const projects = await collectProjectJson(repoRoot);
for (const file of projects) {
  const project = JSON.parse(await readFile(file, 'utf8')) as { name?: string; tags?: string[] };
  if (!project.tags || project.tags.length === 0) {
    errors.push(`${file} is missing Nx tags`);
    continue;
  }
  const hasType = project.tags.some((tag) => tag.startsWith('type:'));
  const hasDomain = project.tags.some((tag) => tag.startsWith('domain:'));
  if (!hasType || !hasDomain) {
    errors.push(`${file} must declare type:* and domain:* tags`);
  }
}

const modulesDir = join(repoRoot, 'modules');
const domains = await readdir(modulesDir, { withFileTypes: true });
for (const domain of domains) {
  if (!domain.isDirectory() || domain.name.startsWith('_')) {
    continue;
  }
  const apiDb = join(modulesDir, domain.name, 'api/db');
  if (await pathExists(apiDb)) {
    errors.push(`${apiDb} is forbidden; persist through libs/db-services`);
  }
  for (const part of ['ui', 'api', 'docs'] as const) {
    if (!(await pathExists(join(modulesDir, domain.name, part)))) {
      errors.push(`modules/${domain.name} is missing ${part}/`);
    }
  }
}

if (errors.length > 0) {
  throw new Error(`Boundary validation failed:\n${errors.join('\n')}`);
}

process.stdout.write(`validated ${projects.length} Nx projects\n`);
