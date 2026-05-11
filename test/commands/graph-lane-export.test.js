'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { runGraph, validateIntentLifecycleDomains } = require('../../src/commands/graph');
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

function writeLaneFixture(root, lane, payload) {
  const lanePath = path.join(root, 'knowledge-base', '.kb', 'graph-ingest', `${lane}.json`);
  fs.mkdirSync(path.dirname(lanePath), { recursive: true });
  fs.writeFileSync(lanePath, JSON.stringify(payload, null, 2), 'utf8');
}

function writeApplyAuditFixture(root) {
  const applyRoot = path.join(root, 'knowledge-base', '.kb', 'apply');
  const receiptsRoot = path.join(applyRoot, 'receipts');
  fs.mkdirSync(receiptsRoot, { recursive: true });

  const receipt = {
    schema: 'kbx-apply-receipt-v1',
    applied_at: '2026-05-11T10:00:00.000Z',
    request: 'update docs index links',
    classification: {
      intent_type: 'update',
      target_scope: 'docs',
      mutation_class: 'docs-only',
    },
    suggestion: {
      primary_pipe: 'PipeDocsFast',
      required_gates: ['P2', 'P10'],
      fallback_or_escalation: null,
    },
    write_operations: [],
    status: 'applied-safe-noop',
  };

  fs.writeFileSync(
    path.join(receiptsRoot, '20260511-update-docs-index-links.json'),
    JSON.stringify(receipt, null, 2),
    'utf8'
  );

  fs.writeFileSync(
    path.join(applyRoot, 'ledger.jsonl'),
    `${JSON.stringify({
      applied_at: receipt.applied_at,
      receipt: '.kb/apply/receipts/20260511-update-docs-index-links.json',
      request: receipt.request,
      target_scope: 'docs',
      mutation_class: 'docs-only',
      status: receipt.status,
    })}\n`,
    'utf8'
  );
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

  it('supports lane alias command', async () => {
    const out = await captureAsync(() => runGraph(['lane', 'rules', '--json'], { workspaceRoot }));
    const json = JSON.parse(out.stdout);

    assert.equal(json.ok, true);
    assert.equal(json.lane, 'rules');
    assert.ok(fs.existsSync(json.output));
  });

  it('exports read-only frontend json graph with schema version, nodes, and edges', async () => {
    writeLaneFixture(workspaceRoot, 'intents', {
      format: 'graph-ingest-v1',
      lane: 'intents',
      nodes: [
        {
          id: 'intent:demo',
          type: 'Intent',
          properties: { id: 'demo', workflow_lifecycle: 'active', ontology_lifecycle: null },
        },
      ],
      edges: [],
    });
    writeLaneFixture(workspaceRoot, 'rules', {
      format: 'graph-ingest-v1',
      lane: 'rules',
      nodes: [
        { id: 'rule:KBX-M001', type: 'Rule', properties: { rule_id: 'KBX-M001' } },
      ],
      edges: [],
    });
    writeLaneFixture(workspaceRoot, 'source', {
      format: 'graph-ingest-v1',
      lane: 'source',
      nodes: [
        { id: 'src:entity:1', type: 'SourceEntity', properties: { source_path: 'src/a.ts' } },
      ],
      edges: [
        { type: 'RELATES_TO', from: 'src:entity:1', to: 'src:entity:1', properties: {} },
      ],
    });
    writeApplyAuditFixture(workspaceRoot);

    const outPath = path.join(workspaceRoot, '.kbx-graph', 'latest.json');
    const out = await captureAsync(() => runGraph([
      'export',
      '--format=json',
      '--out',
      outPath,
      '--json',
    ], { workspaceRoot }));

    const summary = JSON.parse(out.stdout);
    assert.equal(summary.ok, true);
    assert.equal(summary.schema_version, 'kbx-observability-graph-v1');
    assert.ok(fs.existsSync(outPath));

    const payload = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    assert.ok(Array.isArray(payload.nodes));
    assert.ok(Array.isArray(payload.edges));
    assert.equal(payload.schema_version, 'kbx-observability-graph-v1');
    assert.ok(payload.nodes.some((n) => n.type === 'Intent'));
    assert.ok(payload.nodes.some((n) => n.type === 'Rule'));
    assert.ok(payload.nodes.some((n) => n.type === 'Artifact'));
    assert.ok(payload.edges.some((e) => e.type === 'INTENT_RUN'));
    assert.ok(payload.edges.some((e) => e.type === 'RUN_DECISION'));
    assert.ok(payload.edges.some((e) => e.type === 'DECISION_PIPE'));
    assert.ok(payload.edges.some((e) => e.type === 'DECISION_RULE'));
    assert.ok(payload.edges.some((e) => e.type === 'DECISION_GATE'));
    assert.ok(payload.edges.some((e) => e.type === 'GATE_EVIDENCE'));
    assert.ok(payload.edges.some((e) => e.type === 'RUN_RESULT'));
    assert.equal(payload.read_only, true);
    assert.equal(payload.validation.ok, true);
  });

  it('hard-fails when intents lane still uses legacy lifecycle field', () => {
    assert.throws(
      () => validateIntentLifecycleDomains({ lifecycle: 'active' }, { nodeId: 'intent:legacy' }),
      /legacy "lifecycle" field/
    );
  });

  it('hard-fails when workflow_lifecycle receives ontology states', () => {
    assert.throws(
      () => validateIntentLifecycleDomains({ workflow_lifecycle: 'DRAFT', ontology_lifecycle: null }, { nodeId: 'intent:bad-workflow' }),
      /ontology lifecycle "DRAFT" in workflow_lifecycle/
    );
  });

  it('hard-fails when ontology_lifecycle receives workflow states', () => {
    assert.throws(
      () => validateIntentLifecycleDomains({ workflow_lifecycle: 'active', ontology_lifecycle: 'closed' }, { nodeId: 'intent:bad-ontology' }),
      /workflow lifecycle "closed" in ontology_lifecycle/
    );
  });

  it('accepts explicit lifecycle domains for intent nodes', () => {
    const result = validateIntentLifecycleDomains(
      { workflow_lifecycle: 'active', ontology_lifecycle: 'VERIFIED' },
      { nodeId: 'intent:ok' }
    );

    assert.deepEqual(result, {
      workflow_lifecycle: 'active',
      ontology_lifecycle: 'VERIFIED',
    });
  });
});
