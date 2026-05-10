'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { runGraph } = require('../../src/commands/graph');
const { setRuleLifecycle } = require('../../src/lib/rule-lifecycle');

let workspaceRoot;

function writeStateFixture(root) {
  const statePath = path.join(root, 'knowledge-base', '.kb', 'state.json');
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ schemaVersion: 2, storageMode: 'tracked' }, null, 2));
}

function writeIntentBacklog(root, slug, dependsOn) {
  const filePath = path.join(root, 'knowledge-base', 'intents', '_backlog', `${slug}.md`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const frontmatter = [
    '---',
    `slug: ${slug}`,
    `title: "${slug}"`,
    'description: ""',
    'lifecycle: backlog',
    'created_at: 2026-05-10T00:00:00.000Z',
    'focus:',
    '  current: ""',
    '  last_updated: 2026-05-10',
    '  next_action: ""',
    `depends_on: ${dependsOn}`,
    'schema_version: 2.7.0-beta.2',
    '---',
    '',
    `# Backlog Intent: ${slug}`,
    '',
  ].join('\n');
  fs.writeFileSync(filePath, frontmatter, 'utf8');
}

function writeDocsFixture(root) {
  const aPath = path.join(root, 'knowledge-base', 'docs', 'a.md');
  const bPath = path.join(root, 'knowledge-base', 'docs', 'b.md');
  fs.mkdirSync(path.dirname(aPath), { recursive: true });
  fs.writeFileSync(aPath, '[to b](b.md)\n', 'utf8');
  fs.writeFileSync(bPath, '# b\n', 'utf8');
}

async function captureAsync(fn) {
  const stdout = [];
  const stderr = [];
  const oldLog = console.log;
  const oldErr = console.error;
  const oldWrite = process.stdout.write;
  const oldExit = process.exitCode;

  console.log = (...a) => stdout.push(a.join(' '));
  console.error = (...a) => stderr.push(a.join(' '));
  process.stdout.write = (chunk) => {
    stdout.push(String(chunk));
    return true;
  };
  process.exitCode = 0;

  try {
    await fn();
  } finally {
    console.log = oldLog;
    console.error = oldErr;
    process.stdout.write = oldWrite;
  }

  const exitCode = process.exitCode;
  process.exitCode = oldExit;
  return { stdout: stdout.join('\n'), stderr: stderr.join('\n'), exitCode };
}

describe('kbx graph export lane', () => {
  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-graph-lane-cmd-'));
    writeStateFixture(workspaceRoot);
  });

  afterEach(() => {
    try { fs.rmSync(workspaceRoot, { recursive: true, force: true }); } catch { }
  });

  it('exports rules lane to default path', async () => {
    setRuleLifecycle(workspaceRoot, {
      ruleId: 'KBX-AX001',
      status: 'active',
      state: 'implemented',
      actor: 'test',
    });

    const out = await captureAsync(() => runGraph(['export', '--lane=rules', '--json'], { workspaceRoot }));
    const json = JSON.parse(out.stdout);

    assert.equal(json.ok, true);
    assert.equal(json.lane, 'rules');
    assert.ok(json.output.endsWith(path.join('knowledge-base', '.kb', 'graph-ingest', 'rules.json')));
    assert.ok(fs.existsSync(json.output));
  });

  it('exports intents lane with dependency edges', async () => {
    writeIntentBacklog(workspaceRoot, 'child-intent', 'parent-intent');

    const out = await captureAsync(() => runGraph(['export', '--lane=intents', '--json'], { workspaceRoot }));
    const json = JSON.parse(out.stdout);
    const payload = JSON.parse(fs.readFileSync(json.output, 'utf8'));

    assert.equal(payload.format, 'graph-ingest-v1');
    assert.equal(payload.lane, 'intents');
    assert.ok(payload.nodes.some((n) => n.id === 'intent:child-intent'));
    assert.ok(payload.edges.some((e) => e.type === 'INTENT_DEPENDS_ON'));
  });

  it('exports source lane to default path', async () => {
    writeDocsFixture(workspaceRoot);

    const out = await captureAsync(() => runGraph(['export', '--lane=source', '--json'], { workspaceRoot }));
    const json = JSON.parse(out.stdout);
    const payload = JSON.parse(fs.readFileSync(json.output, 'utf8'));

    assert.equal(payload.format, 'graph-ingest-v1');
    assert.equal(payload.lane, 'source');
    assert.ok(payload.nodes.length >= 2);
    assert.ok(payload.edges.length >= 1);
  });
});
