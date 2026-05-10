'use strict';

const fs = require('fs');
const path = require('path');
const { registerRules } = require('../rule-engine');
const { SEVERITY, OWNER_LAYER, ENFORCEABILITY, RUNTIME_STATUS } = require('./registry');

function readIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function containsAll(text, tokens) {
  if (!text) return false;
  return tokens.every((token) => text.includes(token));
}

function joinRel(base, p) {
  return path.relative(base, p).replace(/\\/g, '/');
}

const ALIGNMENT_DOC = 'template/15-governance/rule-catalog-contract.md';

const AX003_DETERMINISTIC_BLOCK_ALIGNMENT = {
  id: 'KBX-AX003',
  title: 'Deterministic block contract alignment',
  description: 'Deterministic block contract must be present in KBAgent contract docs.',
  severity: SEVERITY.WARN,
  owner_layer: OWNER_LAYER.SHARED,
  enforceability: ENFORCEABILITY.SEMI,
  runtime_status: RUNTIME_STATUS.IMPLEMENTED,
  since_version: '2.8.0',
  source_doc: ALIGNMENT_DOC,
  check({ kbPath }) {
    const violations = [];
    const targets = [
      path.join(kbPath, 'template', '.github', 'agents', 'kbx.agent.template.md'),
      path.join(kbPath, 'template', '12-ai-skills', 'agent-operating-manual.md'),
    ];

    for (const target of targets) {
      const text = readIfExists(target);
      if (!text) continue;
      const ok = containsAll(text, [
        'SV Factory gate tier (deterministic)',
        'MUST stop immediately',
      ]);
      if (!ok) {
        violations.push({
          file: joinRel(kbPath, target),
          message: 'Missing deterministic block contract markers (SV Factory gate tier + MUST stop immediately).',
        });
      }
    }

    return violations;
  },
};

const PR025_THREE_LAYER_ALIGNMENT = {
  id: 'KBX-PR025',
  title: 'Three-layer execution contract alignment',
  description: 'Three-layer execution contract must be mirrored in core KBAgent docs.',
  severity: SEVERITY.WARN,
  owner_layer: OWNER_LAYER.SHARED,
  enforceability: ENFORCEABILITY.SEMI,
  runtime_status: RUNTIME_STATUS.IMPLEMENTED,
  since_version: '2.8.0',
  source_doc: ALIGNMENT_DOC,
  check({ kbPath }) {
    const violations = [];
    const agentTemplate = path.join(kbPath, 'template', '.github', 'agents', 'kbx.agent.template.md');
    const manual = path.join(kbPath, 'template', '12-ai-skills', 'agent-operating-manual.md');

    const checks = [
      {
        file: agentTemplate,
        tokens: ['Three-Layer Vibe Execution Contract', 'Layer 1', 'Layer 2', 'Layer 3'],
      },
      {
        file: manual,
        tokens: ['Three-Layer Vibe Flow (SVFactory + KBAgent)', 'Layer 1', 'Layer 2', 'Layer 3'],
      },
    ];

    for (const item of checks) {
      const text = readIfExists(item.file);
      if (!text) continue;
      if (!containsAll(text, item.tokens)) {
        violations.push({
          file: joinRel(kbPath, item.file),
          message: 'Missing full three-layer contract markers (Layer 1/2/3).',
        });
      }
    }

    return violations;
  },
};

const WF008_INTENT_GATE_ALIGNMENT = {
  id: 'KBX-WF008',
  title: 'Intent start gate alignment',
  description: 'Intent start gate markers must exist in process and agent contract docs.',
  severity: SEVERITY.WARN,
  owner_layer: OWNER_LAYER.SVFACTORY,
  enforceability: ENFORCEABILITY.SEMI,
  runtime_status: RUNTIME_STATUS.IMPLEMENTED,
  since_version: '2.8.0',
  source_doc: ALIGNMENT_DOC,
  check({ kbPath }) {
    const violations = [];
    const processFile = path.join(kbPath, 'svfactory', 'process.md');
    const agentTemplate = path.join(kbPath, 'template', '.github', 'agents', 'kbx.agent.template.md');

    const processText = readIfExists(processFile);
    if (processText && !containsAll(processText, ['Workflow 8', 'Gate 1', 'Gate 2', 'Gate 3'])) {
      violations.push({
        file: joinRel(kbPath, processFile),
        message: 'Missing Workflow 8 gate markers (Gate 1/2/3).',
      });
    }

    const agentText = readIfExists(agentTemplate);
    if (agentText && !containsAll(agentText, ['Gate 1', 'Gate 2', 'Gate 3'])) {
      violations.push({
        file: joinRel(kbPath, agentTemplate),
        message: 'Missing intent gate markers (Gate 1/2/3) in agent template.',
      });
    }

    return violations;
  },
};

const KA103_NL_TRIGGER_ALIGNMENT = {
  id: 'KBX-KA103',
  title: 'NL intent-trigger mapping alignment',
  description: 'Natural-language intent trigger mapping must be present in KBAgent contract docs.',
  severity: SEVERITY.WARN,
  owner_layer: OWNER_LAYER.KBAGENT,
  enforceability: ENFORCEABILITY.SEMI,
  runtime_status: RUNTIME_STATUS.IMPLEMENTED,
  since_version: '2.8.0',
  source_doc: ALIGNMENT_DOC,
  check({ kbPath }) {
    const violations = [];
    const files = [
      path.join(kbPath, 'template', '.github', 'agents', 'kbx.agent.template.md'),
      path.join(kbPath, 'template', '12-ai-skills', 'agent-operating-manual.md'),
    ];

    for (const file of files) {
      const text = readIfExists(file);
      if (!text) continue;
      const ok = containsAll(text, [
        'Deterministic NL intent-trigger mapping',
        'kbx intent status',
        'kbx intent create',
        'kbx intent close',
      ]);
      if (!ok) {
        violations.push({
          file: joinRel(kbPath, file),
          message: 'Missing deterministic NL intent-trigger mapping markers.',
        });
      }
    }

    return violations;
  },
};

registerRules([
  AX003_DETERMINISTIC_BLOCK_ALIGNMENT,
  PR025_THREE_LAYER_ALIGNMENT,
  WF008_INTENT_GATE_ALIGNMENT,
  KA103_NL_TRIGGER_ALIGNMENT,
]);

module.exports = [
  AX003_DETERMINISTIC_BLOCK_ALIGNMENT,
  PR025_THREE_LAYER_ALIGNMENT,
  WF008_INTENT_GATE_ALIGNMENT,
  KA103_NL_TRIGGER_ALIGNMENT,
];
