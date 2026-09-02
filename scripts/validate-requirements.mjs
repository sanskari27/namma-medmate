import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'docs/requirements');
const errors = [];
const sourceCache = new Map();
const allowedStatuses = new Set([
  'ready',
  'in_progress',
  'implemented',
  'verified',
  'done',
  'blocked',
  'deferred',
]);

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(target) : [target];
  }));
  return nested.flat();
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function headingSlug(heading) {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}_\- ]/gu, '')
    .replaceAll(' ', '-');
}

async function sourceAnchors(file) {
  if (sourceCache.has(file)) return sourceCache.get(file);
  const content = await readFile(file, 'utf8');
  const anchors = new Set(
    content
      .split('\n')
      .filter((line) => /^#{1,6}\s+/.test(line))
      .map((line) => headingSlug(line.replace(/^#{1,6}\s+/, ''))),
  );
  sourceCache.set(file, anchors);
  return anchors;
}

function frontmatter(content, file) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    errors.push(`${file}: missing YAML frontmatter`);
    return null;
  }
  const body = match[1];
  const scalar = (key) => body.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))?.[1]?.trim();
  const array = (key) => {
    const value = scalar(key);
    if (value === undefined) return undefined;
    if (!value.startsWith('[') || !value.endsWith(']')) {
      errors.push(`${file}: ${key} must be an inline array`);
      return [];
    }
    const inside = value.slice(1, -1).trim();
    return inside ? inside.split(',').map((item) => item.trim()) : [];
  };
  const sourceMatch = body.match(/^sources:\n((?:  - .+\n?)+)/m);
  return {
    id: scalar('id'),
    epic: scalar('epic'),
    phase: Number(scalar('phase')),
    apps: array('apps'),
    dependsOn: array('depends_on'),
    blockedBy: array('blocked_by'),
    sources: sourceMatch
      ? sourceMatch[1].trim().split('\n').map((line) => line.replace(/^\s*-\s*/, ''))
      : [],
  };
}

const markdownFiles = (await filesBelow(root)).filter((file) => file.endsWith('.md'));
const stories = new Map();

for (const file of markdownFiles) {
  if (path.basename(file).startsWith('_')) continue;
  const content = await readFile(file, 'utf8');
  const idMatch = content.match(/^id:\s*(M\d+-S\d{2})$/m);
  if (!idMatch) continue;
  const meta = frontmatter(content, file);
  if (!meta) continue;
  const id = idMatch[1];
  if (stories.has(id)) errors.push(`${file}: duplicate story ID ${id}`);
  stories.set(id, { file, content, ...meta });

  if (meta.id !== id) errors.push(`${file}: frontmatter ID mismatch`);
  if (!/^M\d+$/.test(meta.epic ?? '')) errors.push(`${file}: invalid epic ${meta.epic}`);
  if (!id.startsWith(`${meta.epic}-S`)) {
    errors.push(`${file}: story ID ${id} does not belong to epic ${meta.epic}`);
  }
  if (![1, 2].includes(meta.phase)) errors.push(`${file}: phase must be 1 or 2`);
  if (!meta.apps || !meta.dependsOn || !meta.blockedBy) {
    errors.push(`${file}: apps, depends_on, and blocked_by are required arrays`);
  }
  if (meta.sources.length === 0) errors.push(`${file}: at least one source is required`);
  if (!content.includes('## Acceptance criteria') && meta.phase === 1) {
    errors.push(`${file}: missing Acceptance criteria section`);
  }
  if (content.includes('The server commits the complete result once')) {
    errors.push(`${file}: contains boilerplate acceptance criteria`);
  }
  if (content.includes('An eligible actor')) {
    errors.push(`${file}: acceptance criteria must name story personas`);
  }
  const acceptanceIds = [...content.matchAll(new RegExp(`${id}-AC\\d{2}`, 'g'))].map((match) => match[0]);
  if (new Set(acceptanceIds).size < 2) errors.push(`${file}: fewer than two acceptance criteria`);

  for (const source of meta.sources) {
    const [sourceFile, anchor] = source.split('#');
    const absoluteSource = path.resolve(sourceFile);
    if (!(await exists(absoluteSource))) {
      errors.push(`${file}: missing source ${source}`);
    } else if (anchor && !(await sourceAnchors(absoluteSource)).has(anchor)) {
      errors.push(`${file}: missing source anchor ${source}`);
    }
  }
}

for (const [id, story] of stories) {
  for (const dependency of story.dependsOn ?? []) {
    if (dependency === id) errors.push(`${story.file}: self dependency`);
    if (!stories.has(dependency)) errors.push(`${story.file}: missing dependency ${dependency}`);
  }
}

const visiting = new Set();
const visited = new Set();
function visit(id, trail = []) {
  if (visiting.has(id)) {
    errors.push(`dependency cycle: ${[...trail, id].join(' -> ')}`);
    return;
  }
  if (visited.has(id)) return;
  visiting.add(id);
  for (const dependency of stories.get(id)?.dependsOn ?? []) visit(dependency, [...trail, id]);
  visiting.delete(id);
  visited.add(id);
}
for (const id of stories.keys()) visit(id);

const decisionsFile = path.join(root, 'DECISIONS.md');
const decisionsContent = await readFile(decisionsFile, 'utf8');
const decisions = new Map();
for (const line of decisionsContent.split('\n')) {
  const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean);
  if (!/^D-\d{3}$/.test(cells[0] ?? '')) continue;
  const [id, , , status, blocks] = cells;
  if (!['Open', 'Closed'].includes(status)) errors.push(`${decisionsFile}: invalid status for ${id}`);
  decisions.set(id, {
    status,
    blocks: blocks.split(',').map((item) => item.trim()).filter(Boolean),
  });
}

for (const [storyId, story] of stories) {
  for (const decisionId of story.blockedBy ?? []) {
    if (!decisions.has(decisionId)) errors.push(`${story.file}: missing decision ${decisionId}`);
    if (!decisions.get(decisionId)?.blocks.includes(storyId)) {
      errors.push(`${story.file}: ${decisionId} does not reciprocally list ${storyId}`);
    }
  }
}
for (const [decisionId, decision] of decisions) {
  for (const storyId of decision.blocks) {
    if (!stories.has(storyId)) errors.push(`${decisionsFile}: ${decisionId} blocks missing ${storyId}`);
    if (!stories.get(storyId)?.blockedBy.includes(decisionId)) {
      errors.push(`${decisionsFile}: ${storyId} does not reciprocally list ${decisionId}`);
    }
  }
}

const trackerFile = path.join(root, 'AGENT-REQUIREMENT-IMPLEMENTATION.md');
const trackerContent = await readFile(trackerFile, 'utf8');
const tracker = new Map();
for (const line of trackerContent.split('\n')) {
  const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean);
  if (!/^M\d+-S\d{2}$/.test(cells[0] ?? '')) continue;
  const [id, epic, apps, status, dependencies, blockedBy] = cells;
  if (tracker.has(id)) errors.push(`${trackerFile}: duplicate row ${id}`);
  if (!allowedStatuses.has(status)) errors.push(`${trackerFile}: invalid status ${status} for ${id}`);
  tracker.set(id, { epic, apps, status, dependencies, blockedBy });
}

for (const [id, story] of stories) {
  const row = tracker.get(id);
  const status = row?.status;
  if (!row) errors.push(`${trackerFile}: missing story ${id}`);
  if (row && row.epic !== story.epic) {
    errors.push(`${trackerFile}: ${id} epic ${row.epic} does not match ${story.epic}`);
  }
  const expectedApps = story.apps.length ? story.apps.join(' + ') : 'decision';
  const expectedDependencies = story.dependsOn.length ? story.dependsOn.join(', ') : '—';
  const expectedBlockedBy = story.blockedBy.length ? story.blockedBy.join(', ') : '—';
  const expectedBlockedByClosed = story.blockedBy.length
    ? `${story.blockedBy.join(', ')} closed`
    : '—';
  if (row && row.apps !== expectedApps) {
    errors.push(`${trackerFile}: ${id} apps "${row.apps}" do not match "${expectedApps}"`);
  }
  if (row && row.dependencies !== expectedDependencies) {
    errors.push(`${trackerFile}: ${id} dependencies do not match story frontmatter`);
  }
  if (
    row &&
    row.blockedBy !== expectedBlockedBy &&
    row.blockedBy !== expectedBlockedByClosed
  ) {
    const historicalClosedNote = /^(D-\d{3}(?:, D-\d{3})*) closed$/.test(row.blockedBy);
    if (!(story.blockedBy.length === 0 && historicalClosedNote)) {
      errors.push(`${trackerFile}: ${id} decisions do not match story frontmatter`);
    }
  }
  if (story.phase === 2 && status !== 'deferred') {
    errors.push(`${trackerFile}: Phase 2 story ${id} must be deferred`);
  }
  const openDecisionBlocks = (story.blockedBy ?? []).filter(
    (decisionId) => decisions.get(decisionId)?.status === 'Open',
  );
  if (openDecisionBlocks.length > 0 && !['blocked', 'deferred'].includes(status)) {
    errors.push(`${trackerFile}: decision-linked story ${id} must be blocked or deferred`);
  }
  if (story.blockedBy.length === 0 && status === 'blocked') {
    errors.push(`${trackerFile}: ${id} is blocked without a decision`);
  }
}
for (const id of tracker.keys()) {
  if (!stories.has(id)) errors.push(`${trackerFile}: row ${id} has no story file`);
}
if ([...tracker.values()].filter((row) => row.status === 'in_progress').length > 1) {
  errors.push(`${trackerFile}: more than one story is in_progress`);
}

const actualCounts = Object.fromEntries([...allowedStatuses].map((status) => [status, 0]));
for (const row of tracker.values()) actualCounts[row.status] += 1;
const declaredCounts = new Map();
let inCountTable = false;
for (const line of trackerContent.split('\n')) {
  if (/^\| Status \| Count \|/.test(line)) {
    inCountTable = true;
    continue;
  }
  if (!inCountTable) continue;
  if (!line.startsWith('|')) break;
  const cells = line.split('|').map((cell) => cell.trim()).filter(Boolean);
  if (!cells.length || /^-+$/.test(cells[0].replaceAll(':', ''))) continue;
  const [status, count] = cells;
  if (!/^\d+$/.test(count ?? '')) {
    errors.push(`${trackerFile}: invalid count for ${status}`);
    continue;
  }
  declaredCounts.set(status, Number(count));
}
if (!declaredCounts.size) errors.push(`${trackerFile}: missing status count table`);
for (const status of allowedStatuses) {
  if (!declaredCounts.has(status)) {
    errors.push(`${trackerFile}: missing ${status} count`);
  } else if (declaredCounts.get(status) !== actualCounts[status]) {
    errors.push(
      `${trackerFile}: ${status} count ${declaredCounts.get(status)} does not match ${actualCounts[status]} rows`,
    );
  }
}
if (declaredCounts.get('total') !== tracker.size) {
  errors.push(
    `${trackerFile}: total count ${declaredCounts.get('total') ?? 'missing'} does not match ${tracker.size} rows`,
  );
}

for (const [id, story] of stories) {
  const epicIndex = path.join(path.dirname(story.file), '_index.md');
  const content = await readFile(epicIndex, 'utf8');
  const rowLine = content.split('\n').find((line) => line.includes(`[${id} —`));
  if (!rowLine) {
    errors.push(`${epicIndex}: missing story row ${id}`);
    continue;
  }
  const cells = rowLine.split('|').map((cell) => cell.trim()).filter(Boolean);
  const [, , apps, dependencies, blockedBy] = cells;
  const expectedApps = story.apps.length ? story.apps.join(' + ') : 'decision';
  const expectedDependencies = story.dependsOn.length ? story.dependsOn.join(', ') : '—';
  const expectedBlockedBy = story.blockedBy.length
    ? story.blockedBy.join(', ')
    : story.phase === 2 ? 'deferred' : '—';
  if (apps !== expectedApps) errors.push(`${epicIndex}: ${id} apps do not match frontmatter`);
  if (dependencies !== expectedDependencies) {
    errors.push(`${epicIndex}: ${id} dependencies do not match frontmatter`);
  }
  if (blockedBy !== expectedBlockedBy) {
    errors.push(`${epicIndex}: ${id} decision/deferred marker does not match frontmatter`);
  }
}

for (const file of markdownFiles) {
  const content = await readFile(file, 'utf8');
  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const targetFile = target.split('#')[0];
    if (!(await exists(path.resolve(path.dirname(file), targetFile)))) {
      errors.push(`${file}: broken link ${target}`);
    }
  }
}

const topIndex = await readFile(path.join(root, '_index.md'), 'utf8');
for (let module = 1; module <= 12; module += 1) {
  if (!topIndex.includes(`| M${module} |`)) errors.push(`_index.md: missing M${module} epic`);
  const row = topIndex.split('\n').find((line) => line.startsWith(`| M${module} |`));
  const declaredCount = Number(row?.split('|').map((cell) => cell.trim()).filter(Boolean)[2]);
  const actualCount = [...stories.values()].filter((story) => story.epic === `M${module}`).length;
  if (declaredCount !== actualCount) {
    errors.push(`_index.md: M${module} declares ${declaredCount} stories but has ${actualCount}`);
  }
}

if (errors.length) {
  console.error(`Requirements validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Requirements valid: ${stories.size} stories, ${decisions.size} decisions, ${tracker.size} tracker rows.`,
  );
}
