'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { parseArgs, runNext } = require('../../src/commands/next');

function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-next-'));
  const svFactoryRoot = path.join(root, 'knowledge-base');
  fs.mkdirSync(path.join(svFactoryRoot, '.kb'), { recursive: true });
  fs.mkdirSync(path.join(svFactoryRoot, '05-backend'), { recursive: true });
  fs.writeFileSync(path.join(svFactoryRoot, '.kb', 'state.json'), JSON.stringify({ schemaVersion: 2 }, null, 2), 'utf8');
  return { root, svFactoryRoot };
}

test('next parseArgs: --json', () => {
  const o = parseArgs(['--json']);
  assert.equal(o.json, true);
});

test('next parseArgs: unknown throws', () => {
  assert.throws(() => parseArgs(['--bogus']), /Unknown next option/);
});

test('runNext: prints clean message when no actions exist', () => {
  const { root, svFactoryRoot } = makeWorkspace();
  fs.writeFileSync(path.join(svFactoryRoot, '05-backend', 'auth.md'), '---\ntitle: Auth\nkb_state: verified\n---\nbody\n', 'utf8');

  const logs = [];
  const orig = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    runNext({ args: [], cwd: root });
  } finally {
    console.log = orig;
  }

  assert.ok(logs.some((line) => line.includes('KB clean')));
});

test('runNext: prints prioritized sections when actions exist', () => {
  const { root, svFactoryRoot } = makeWorkspace();
  fs.writeFileSync(path.join(svFactoryRoot, '05-backend', 'auth.md'), '---\ntitle: Auth\nkb_state: needs-review\nlast_updated: 2026-04-01\n---\nbody\n', 'utf8');
  fs.writeFileSync(path.join(svFactoryRoot, '.kb', 'impact.json'), JSON.stringify({ impacted: [{ doc: '05-backend/auth.md', matched_changes: ['src/auth.js'] }], unbound_changes: [] }, null, 2), 'utf8');

  const logs = [];
  const orig = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    runNext({ args: [], cwd: root });
  } finally {
    console.log = orig;
  }

  assert.ok(logs.some((line) => line.includes('Next best action: kb verify 05-backend/auth.md')));
  assert.ok(logs.some((line) => line.includes('Drift unresolved')));
});
