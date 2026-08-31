#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const MAX_INITIAL_JS_KIB = 250;
const MAX_TOTAL_ASSETS_KIB = 500;

const dist = process.argv[2];
if (!dist) {
  throw new Error('Usage: node check-bundle-size.mjs <distDir>');
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

const files = await walk(dist);
let jsBytes = 0;
let totalBytes = 0;
for (const file of files) {
  const gzipped = gzipSync(await readFile(file)).length;
  totalBytes += gzipped;
  if (file.endsWith('.js')) {
    jsBytes += gzipped;
  }
}

const jsKib = jsBytes / 1024;
const totalKib = totalBytes / 1024;
if (jsKib > MAX_INITIAL_JS_KIB) {
  throw new Error(`JS gzip budget exceeded: ${jsKib.toFixed(1)} KiB > ${MAX_INITIAL_JS_KIB} KiB`);
}
if (totalKib > MAX_TOTAL_ASSETS_KIB) {
  throw new Error(
    `Total gzip budget exceeded: ${totalKib.toFixed(1)} KiB > ${MAX_TOTAL_ASSETS_KIB} KiB`,
  );
}

process.stdout.write(`bundle ok: js=${jsKib.toFixed(1)}KiB total=${totalKib.toFixed(1)}KiB\n`);
