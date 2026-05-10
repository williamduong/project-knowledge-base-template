'use strict';

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { recordIntentCheckpoint } = require('../../src/lib/intent-checkpoint');

function mkTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-intent-checkpoint-test-'));
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

function runGit(cwd, args) {
  return spawnSync('git', args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}

describe('recordIntentCheckpoint', () => {
  const dirs = [];
  after(() => { for (const d of dirs) cleanup(d); });

  it('skips when no focus.md exists', () => {
    const dir = mkTmpDir();
    dirs.push(dir);
    const result = recordIntentCheckpoint({
      workspaceRoot: dir,
      eventName: 'intent.status',
      intentId: 'v2-7-demo',
    });
    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'focus-file-not-found');
  });

  it('writes checkpoint line and commits focus.md when svfactory/focus.md exists', () => {
    const dir = mkTmpDir();
    dirs.push(dir);

    fs.mkdirSync(path.join(dir, 'svfactory'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'svfactory', 'focus.md'), '# Focus\n', 'utf8');

    runGit(dir, ['init']);
    runGit(dir, ['config', 'user.email', 'test@example.com']);
    runGit(dir, ['config', 'user.name', 'Test User']);
    runGit(dir, ['add', '.']);
    runGit(dir, ['commit', '-m', 'init']);

    const result = recordIntentCheckpoint({
      workspaceRoot: dir,
      eventName: 'intent.create',
      intentId: 'v2-7-demo',
      note: 'created for test',
    });

    assert.equal(result.skipped, false);
    assert.equal(result.relFocus, 'svfactory/focus.md');

    const content = fs.readFileSync(path.join(dir, 'svfactory', 'focus.md'), 'utf8');
    assert.ok(content.includes('## Intent Checkpoints'));
    assert.ok(content.includes('event=intent.create'));
    assert.ok(content.includes('intent=v2-7-demo'));

    const log = runGit(dir, ['log', '--oneline', '-1']);
    assert.equal(log.status, 0);
    assert.ok((log.stdout || '').includes('chore(checkpoint): intent.create v2-7-demo'));
  });
});
