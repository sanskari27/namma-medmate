#!/usr/bin/env node
/**
 * Normalise React imports.
 *
 * The project uses the automatic JSX runtime, so `import React from 'react'`
 * is only needed where the `React` namespace is actually referenced
 * (`React.Component`, `React.Fragment`, …). Files that only use `ReactNode`
 * get a type-only import instead.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] ?? process.cwd();
const SKIP = new Set(['node_modules', 'android', 'ios', '.expo', 'coverage', 'dist']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.tsx?$/.test(entry.name)) files.push(full);
  }
  return files;
}

let changed = 0;

for (const file of walk(ROOT)) {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(/^import React(?:,\s*(\{[^}]*\}))? from 'react';\n/m);
  if (!match) continue;

  const named = match[1];
  const body = source.slice(0, match.index) + source.slice(match.index + match[0].length);

  if (/\bReact\./.test(body)) continue; // still uses the namespace — leave it

  let replacement = '';
  if (named) {
    replacement = `import ${named} from 'react';\n`;
  }

  let next = body;

  if (/\bReact\.ReactNode\b/.test(next)) {
    next = next.replace(/\bReact\.ReactNode\b/g, 'ReactNode');
    replacement = `import type { ReactNode } from 'react';\n`;
  }

  next = replacement + next;

  fs.writeFileSync(file, next);
  changed += 1;
}

console.log(`normalised React imports in ${changed} file(s)`);
