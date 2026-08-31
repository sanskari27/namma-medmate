import { appendFileSync, readFileSync } from 'node:fs';

const affected = JSON.parse(process.argv[2] ?? '[]');
const graph = JSON.parse(readFileSync(new URL('./workspace-map.json', import.meta.url), 'utf8'));
const pick = (list) => affected.filter((name) => list.includes(name));
const out = (key, value) =>
  appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${JSON.stringify(value)}\n`);
const apps = pick(graph.apps);
const moduleUis = pick(graph.moduleUis);
const moduleApis = pick(graph.moduleApis);
const libs = pick(graph.libs);
out('apps', apps);
out('module_uis', moduleUis);
out('module_apis', moduleApis);
out('libs', libs);
out('projects', [...apps, ...moduleUis, ...moduleApis, ...libs]);
