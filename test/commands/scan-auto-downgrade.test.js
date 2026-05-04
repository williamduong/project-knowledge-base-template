'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const { computeImpact } = require('../../src/lib/impact');
const { autoDowngradeVerifiedDocs } = require('../../src/commands/scan');

function run(command, cwd) {
  return execSync(command, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
}

function writeFile(root, rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
}

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-scan-auto-'));
  run('git init', root);
  run('git config user.email "kb@test.local"', root);
  run('git config user.name "KB Test"', root);
  return root;
}

test('autoDowngradeVerifiedDocs: ignores pre-verify binding changes and downgrades post-verify ones', () => {
  const root = makeRepo();

  writeFile(root, 'src/auth.js', 'module.exports = 1;\n');
  writeFile(root, 'knowledge-base/05-backend/auth.md', '---\ntitle: Auth\nkb_state: needs-review\n---\nbody\n');
  run('git add .', root);
  run('git commit -m "init"', root);
  const baseline = run('git rev-parse HEAD', root);

  writeFile(root, 'knowledge-base/.kb/state.json', JSON.stringify({ schemaVersion: 2, sourceRepositoryGitBaseline: baseline }, null, 2));
  writeFile(root, 'knowledge-base/.kb/bindings.json', JSON.stringify({ version: 1, bindings: [{ doc: '05-backend/auth.md', paths: ['src/auth.js'], source: 'user' }] }, null, 2));

  writeFile(root, 'src/auth.js', 'module.exports = 2;\n');
  run('git add src/auth.js knowledge-base/.kb/state.json knowledge-base/.kb/bindings.json', root);
  run('git commit -m "source changes before verify"', root);
  const verifiedCommit = run('git rev-parse HEAD', root);

  writeFile(root, 'knowledge-base/05-backend/auth.md', `---\ntitle: Auth\nkb_state: verified\nlast_verified: 2026-05-04\nlast_verified_commit: ${verifiedCommit}\n---\nbody\n`);
  run('git add knowledge-base/05-backend/auth.md', root);
  run('git commit -m "verify doc"', root);

  const ctx = { contentRoot: path.join(root, 'knowledge-base'), statePath: path.join(root, 'knowledge-base', '.kb', 'state.json'), mode: 'tracked' };
  let impact = computeImpact({ workspaceRoot: root, ctx });
  assert.equal(impact.impacted.length, 1);

  let out = autoDowngradeVerifiedDocs({ impactData: impact, workspaceRoot: root, ctx, head: impact.head || 'HEAD' });
  assert.equal(out.autoDowngraded.length, 0);
  let docText = fs.readFileSync(path.join(root, 'knowledge-base/05-backend/auth.md'), 'utf8');
  assert.match(docText, /kb_state: verified/);

  writeFile(root, 'src/auth.js', 'module.exports = 3;\n');
  run('git add src/auth.js', root);
  run('git commit -m "source changes after verify"', root);

  impact = computeImpact({ workspaceRoot: root, ctx });
  out = autoDowngradeVerifiedDocs({ impactData: impact, workspaceRoot: root, ctx, head: impact.head || 'HEAD' });
  assert.equal(out.autoDowngraded.length, 1);
  assert.equal(out.autoDowngraded[0].doc, '05-backend/auth.md');

  docText = fs.readFileSync(path.join(root, 'knowledge-base/05-backend/auth.md'), 'utf8');
  assert.match(docText, /kb_state: needs-review/);
  assert.match(docText, /downgrade_reason: binding-changed-after-verify/);
});