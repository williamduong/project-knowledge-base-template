'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { runRules, loadRules } = require('../../src/lib/rule-engine');

function makeTmpKb(files = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-contract-align-'));
  for (const [relPath, content] of Object.entries(files)) {
    const abs = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
  }
  return tmpDir;
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { }
}

describe('contract alignment rules (Phase C.2)', () => {
  it('loads new GV/PR/WF/KA rule IDs', () => {
    const ids = loadRules().map((r) => r.id);
    for (const id of [
      'KBX-GV001',
      'KBX-GV002',
      'KBX-GV003',
      'KBX-PR025',
      'KBX-PR026',
      'KBX-WF008',
      'KBX-WF011',
      'KBX-KA103',
      'KBX-KA104',
    ]) {
      assert.ok(ids.includes(id), `Missing alignment rule ${id}`);
    }
  });

  it('passes when contract markers exist', () => {
    const kbPath = makeTmpKb({
      'template/.github/agents/kbx.agent.template.md': [
        'SV Factory gate tier (deterministic)',
        'MUST stop immediately',
        'Run `kbx status --json`',
        'Run `kbx doctor --json`',
        'Three-Layer Vibe Execution Contract',
        'Layer 1',
        'Layer 2',
        'Layer 3',
        'Gate 1',
        'Gate 2',
        'Gate 3',
        'Session-start intent chooser',
        'Run `kbx intent list`',
        'Deterministic NL intent-trigger mapping',
        'kbx intent status',
        'kbx intent create',
        'kbx intent close',
      ].join('\n'),
      'template/12-ai-skills/agent-operating-manual.md': [
        'SV Factory gate tier (deterministic)',
        'MUST stop immediately',
        'Three-Layer Vibe Flow (SVFactory + KBAgent)',
        'Layer 1',
        'Layer 2',
        'Layer 3',
        'Session-start intent chooser',
        'Run `kbx intent list`',
        'Deterministic NL intent-trigger mapping',
        'kbx intent status',
        'kbx intent create',
        'kbx intent close',
      ].join('\n'),
      'svfactory/process.md': [
        'Workflow 8',
        'Workflow 11',
        'Layer 1',
        'Layer 2',
        'Layer 3',
        'Gate 1',
        'Gate 2',
        'Gate 3',
      ].join('\n'),
      'svfactory/agent.md': [
        'Session hooks are mandatory',
        'Pre-start hook',
        'deterministic CLI checks first',
        'End-session hook',
      ].join('\n'),
      'svfactory/rules-extensions.md': [
        'Session Hook Slots',
        'Pre-start hook slot',
        'Pre-end hook slot',
      ].join('\n'),
    });

    const { violations } = runRules(kbPath, [
      'KBX-GV001',
      'KBX-GV002',
      'KBX-PR025',
      'KBX-PR026',
      'KBX-WF008',
      'KBX-WF011',
      'KBX-KA103',
      'KBX-KA104',
    ]);
    cleanup(kbPath);
    assert.equal(violations.length, 0);
  });

  it('reports violation when markers are missing', () => {
    const kbPath = makeTmpKb({
      'template/.github/agents/kbx.agent.template.md': 'stub',
      'template/12-ai-skills/agent-operating-manual.md': 'stub',
      'svfactory/process.md': 'stub',
    });

    const { violations } = runRules(kbPath, [
      'KBX-GV001',
      'KBX-GV002',
      'KBX-PR025',
      'KBX-PR026',
      'KBX-WF008',
      'KBX-WF011',
      'KBX-KA103',
      'KBX-KA104',
    ]);
    cleanup(kbPath);
    assert.ok(violations.length > 0);
  });

  it('fails GV003 when hardening intent is active but lane artifacts are missing', () => {
    const kbPath = makeTmpKb({
      'knowledge-base/intents/_active/v2-8-v2-8-svfactory-rule-catalog-hardening/intent.md': '# active',
    });

    const { violations } = runRules(kbPath, ['KBX-GV003']);
    cleanup(kbPath);

    assert.equal(violations.length, 3);
    assert.ok(violations.every((v) => v.rule_id === 'KBX-GV003'));
  });

  it('passes GV003 when hardening intent is active and lane artifacts are valid', () => {
    const kbPath = makeTmpKb({
      'knowledge-base/intents/_active/v2-8-v2-8-svfactory-rule-catalog-hardening/intent.md': '# active',
      'knowledge-base/.kb/graph-ingest/rules.json': JSON.stringify({ format: 'graph-ingest-v1', lane: 'rules' }),
      'knowledge-base/.kb/graph-ingest/intents.json': JSON.stringify({ format: 'graph-ingest-v1', lane: 'intents' }),
      'knowledge-base/.kb/graph-ingest/source.json': JSON.stringify({ format: 'graph-ingest-v1', lane: 'source' }),
    });

    const { violations } = runRules(kbPath, ['KBX-GV003']);
    cleanup(kbPath);

    assert.equal(violations.length, 0);
  });
});
