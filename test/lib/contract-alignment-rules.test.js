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
  it('loads new AX/PR/WF/KA rule IDs', () => {
    const ids = loadRules().map((r) => r.id);
    for (const id of ['KBX-AX003', 'KBX-PR025', 'KBX-WF008', 'KBX-KA103']) {
      assert.ok(ids.includes(id), `Missing alignment rule ${id}`);
    }
  });

  it('passes when contract markers exist', () => {
    const kbPath = makeTmpKb({
      'template/.github/agents/kbx.agent.template.md': [
        'SV Factory gate tier (deterministic)',
        'MUST stop immediately',
        'Three-Layer Vibe Execution Contract',
        'Layer 1',
        'Layer 2',
        'Layer 3',
        'Gate 1',
        'Gate 2',
        'Gate 3',
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
        'Deterministic NL intent-trigger mapping',
        'kbx intent status',
        'kbx intent create',
        'kbx intent close',
      ].join('\n'),
      'svfactory/process.md': [
        'Workflow 8',
        'Gate 1',
        'Gate 2',
        'Gate 3',
      ].join('\n'),
    });

    const { violations } = runRules(kbPath, ['KBX-AX003', 'KBX-PR025', 'KBX-WF008', 'KBX-KA103']);
    cleanup(kbPath);
    assert.equal(violations.length, 0);
  });

  it('reports violation when markers are missing', () => {
    const kbPath = makeTmpKb({
      'template/.github/agents/kbx.agent.template.md': 'stub',
      'template/12-ai-skills/agent-operating-manual.md': 'stub',
      'svfactory/process.md': 'stub',
    });

    const { violations } = runRules(kbPath, ['KBX-AX003', 'KBX-PR025', 'KBX-WF008', 'KBX-KA103']);
    cleanup(kbPath);
    assert.ok(violations.length > 0);
  });
});
