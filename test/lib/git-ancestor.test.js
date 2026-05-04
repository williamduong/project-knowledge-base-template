'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const { isAncestor } = require('../../src/lib/git');

function run(command, cwd) {
  return execSync(command, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).trim();
}

test('isAncestor: detects commit ancestry correctly', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-git-ancestor-'));
  fs.writeFileSync(path.join(root, 'a.txt'), 'one\n', 'utf8');
  run('git init', root);
  run('git config user.email "kb@test.local"', root);
  run('git config user.name "KB Test"', root);
  run('git add a.txt', root);
  run('git commit -m "one"', root);
  const first = run('git rev-parse HEAD', root);
  fs.writeFileSync(path.join(root, 'a.txt'), 'two\n', 'utf8');
  run('git add a.txt', root);
  run('git commit -m "two"', root);
  const second = run('git rev-parse HEAD', root);

  assert.equal(isAncestor(root, first, second), true);
  assert.equal(isAncestor(root, second, first), false);
});