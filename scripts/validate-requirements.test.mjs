import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const repository = path.resolve('.');
const validator = path.join(repository, 'scripts/validate-requirements.mjs');

async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'requirements-validator-'));
  const root = path.join(directory, 'requirements');
  await cp(path.join(repository, 'docs/requirements'), root, { recursive: true });
  return { directory, root };
}

function validate(root) {
  return spawnSync(process.execPath, [validator, root], {
    cwd: repository,
    encoding: 'utf8',
  });
}

test('accepts the canonical requirements tree', async (t) => {
  const { directory, root } = await fixture();
  t.after(() => rm(directory, { force: true, recursive: true }));

  const result = validate(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Requirements valid: 70 stories, 13 decisions, 70 tracker rows/);
});

test('rejects a missing tracker row', async (t) => {
  const { directory, root } = await fixture();
  t.after(() => rm(directory, { force: true, recursive: true }));
  const tracker = path.join(root, 'AGENT-REQUIREMENT-IMPLEMENTATION.md');
  const content = await readFile(tracker, 'utf8');
  await writeFile(tracker, content.replace(/^\| M1-S01 \|.*\n/m, ''));

  const result = validate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing story M1-S01/);
});

test('rejects dependency cycles and index drift', async (t) => {
  const { directory, root } = await fixture();
  t.after(() => rm(directory, { force: true, recursive: true }));
  const story = path.join(root, '01-authentication-user-roles/m1-s01-email-and-password-login.md');
  const content = await readFile(story, 'utf8');
  await writeFile(story, content.replace('depends_on: []', 'depends_on: [M1-S01]'));

  const result = validate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /self dependency/);
  assert.match(result.stderr, /dependencies do not match/);
});

test('rejects tracker metadata drift', async (t) => {
  const { directory, root } = await fixture();
  t.after(() => rm(directory, { force: true, recursive: true }));
  const tracker = path.join(root, 'AGENT-REQUIREMENT-IMPLEMENTATION.md');
  const content = await readFile(tracker, 'utf8');
  await writeFile(
    tracker,
    content.replace(
      '| M1-S01 | M1 | server + dispensary + admin |',
      '| M1-S01 | M1 | server |',
    ),
  );

  const result = validate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /apps "server" do not match/);
});

test('rejects boilerplate acceptance criteria', async (t) => {
  const { directory, root } = await fixture();
  t.after(() => rm(directory, { force: true, recursive: true }));
  const story = path.join(root, '01-authentication-user-roles/m1-s01-email-and-password-login.md');
  const content = await readFile(story, 'utf8');
  await writeFile(story, `${content}\nThe server commits the complete result once.\n`);

  const result = validate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /contains boilerplate acceptance criteria/);
});

test('rejects a story ID assigned to the wrong epic', async (t) => {
  const { directory, root } = await fixture();
  t.after(() => rm(directory, { force: true, recursive: true }));
  const story = path.join(root, '01-authentication-user-roles/m1-s01-email-and-password-login.md');
  const content = await readFile(story, 'utf8');
  await writeFile(story, content.replace('epic: M1', 'epic: M2'));

  const result = validate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /story ID M1-S01 does not belong to epic M2/);
});

test('rejects generic acceptance personas', async (t) => {
  const { directory, root } = await fixture();
  t.after(() => rm(directory, { force: true, recursive: true }));
  const story = path.join(root, '01-authentication-user-roles/m1-s01-email-and-password-login.md');
  const content = await readFile(story, 'utf8');
  await writeFile(story, `${content}\nAn eligible actor performs the operation.\n`);

  const result = validate(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /acceptance criteria must name story personas/);
});
