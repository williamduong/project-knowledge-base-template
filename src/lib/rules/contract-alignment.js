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
const HARDENING_INTENT_ID = 'v2-8-v2-8-svfactory-rule-catalog-hardening';
const REQUIRED_LANES = ['rules', 'intents', 'source'];

function hasIntentDirectory(kbPath, relPath) {
  return fs.existsSync(path.join(kbPath, relPath, HARDENING_INTENT_ID));
}

function isHardeningIntentActive(kbPath) {
  return (
    hasIntentDirectory(kbPath, path.join('knowledge-base', 'intents', '_active')) ||
    hasIntentDirectory(kbPath, path.join('intents', '_active'))
  );
}

function laneArtifactCandidates(kbPath, lane) {
  return [
    path.join(kbPath, 'knowledge-base', '.kb', 'graph-ingest', `${lane}.json`),
    path.join(kbPath, '.kb', 'graph-ingest', `${lane}.json`),
  ];
}

function validateLaneArtifact(kbPath, lane) {
  const candidates = laneArtifactCandidates(kbPath, lane);
  const existing = candidates.find((filePath) => fs.existsSync(filePath));
  if (!existing) {
    return {
      ok: false,
      file: joinRel(kbPath, candidates[0]),
      message: `Missing graph-ingest lane artifact for "${lane}".`,
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(existing, 'utf8'));
    if (parsed.format !== 'graph-ingest-v1') {
      return {
        ok: false,
        file: joinRel(kbPath, existing),
        message: `Lane artifact "${lane}" must declare format="graph-ingest-v1".`,
      };
    }
    if (parsed.lane !== lane) {
      return {
        ok: false,
        file: joinRel(kbPath, existing),
        message: `Lane artifact "${lane}" must declare lane="${lane}".`,
      };
    }
  } catch {
    return {
      ok: false,
      file: joinRel(kbPath, existing),
      message: `Lane artifact "${lane}" must be valid JSON graph-ingest payload.`,
    };
  }

  return { ok: true };
}

const GV001_DETERMINISTIC_BLOCK_ALIGNMENT = {
  id: 'KBX-GV001',
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

const GV002_CLI_FIRST_GATE_ALIGNMENT = {
  id: 'KBX-GV002',
  title: 'CLI-first gate alignment',
  description: 'CLI-first deterministic gate markers must exist across SVFactory and KBAgent contracts.',
  severity: SEVERITY.WARN,
  owner_layer: OWNER_LAYER.SHARED,
  enforceability: ENFORCEABILITY.SEMI,
  runtime_status: RUNTIME_STATUS.IMPLEMENTED,
  since_version: '2.8.0',
  source_doc: ALIGNMENT_DOC,
  check({ kbPath }) {
    const violations = [];
    const svfactoryCore = path.join(kbPath, 'svfactory', 'agent.md');
    const agentTemplate = path.join(kbPath, 'template', '.github', 'agents', 'kbx.agent.template.md');

    const coreText = readIfExists(svfactoryCore);
    if (coreText && !containsAll(coreText, ['Pre-start hook', 'deterministic CLI checks first'])) {
      violations.push({
        file: joinRel(kbPath, svfactoryCore),
        message: 'Missing CLI-first session hook markers in svfactory/agent.md.',
      });
    }

    const agentText = readIfExists(agentTemplate);
    if (agentText && !containsAll(agentText, ['Run `kbx status --json`', 'Run `kbx doctor --json`'])) {
      violations.push({
        file: joinRel(kbPath, agentTemplate),
        message: 'Missing mandatory CLI-first preflight markers in KBAgent template.',
      });
    }

    return violations;
  },
};

const PR026_SESSION_HOOK_BOUNDARY_ALIGNMENT = {
  id: 'KBX-PR026',
  title: 'Session hook boundary alignment',
  description: 'Session start/end hook markers must exist in SVFactory natural rules.',
  severity: SEVERITY.WARN,
  owner_layer: OWNER_LAYER.SVFACTORY,
  enforceability: ENFORCEABILITY.SEMI,
  runtime_status: RUNTIME_STATUS.IMPLEMENTED,
  since_version: '2.8.0',
  source_doc: ALIGNMENT_DOC,
  check({ kbPath }) {
    const violations = [];
    const coreFile = path.join(kbPath, 'svfactory', 'agent.md');
    const extFile = path.join(kbPath, 'svfactory', 'rules-extensions.md');

    const coreText = readIfExists(coreFile);
    if (coreText && !containsAll(coreText, ['Session hooks are mandatory', 'Pre-start hook', 'End-session hook'])) {
      violations.push({
        file: joinRel(kbPath, coreFile),
        message: 'Missing mandatory session hook markers in SVFactory core rules.',
      });
    }

    const extText = readIfExists(extFile);
    if (extText && !containsAll(extText, ['Session Hook Slots', 'Pre-start hook slot', 'Pre-end hook slot'])) {
      violations.push({
        file: joinRel(kbPath, extFile),
        message: 'Missing detailed session hook slot markers in SVFactory extension rules.',
      });
    }

    return violations;
  },
};

const WF011_THREE_LAYER_WORKFLOW_ALIGNMENT = {
  id: 'KBX-WF011',
  title: 'Workflow 11 three-layer alignment',
  description: 'Workflow 11 three-layer execution markers must remain present in SVFactory process.',
  severity: SEVERITY.WARN,
  owner_layer: OWNER_LAYER.SVFACTORY,
  enforceability: ENFORCEABILITY.SEMI,
  runtime_status: RUNTIME_STATUS.IMPLEMENTED,
  since_version: '2.8.0',
  source_doc: ALIGNMENT_DOC,
  check({ kbPath }) {
    const violations = [];
    const processFile = path.join(kbPath, 'svfactory', 'process.md');
    const processText = readIfExists(processFile);

    if (processText && !containsAll(processText, ['Workflow 11', 'Layer 1', 'Layer 2', 'Layer 3'])) {
      violations.push({
        file: joinRel(kbPath, processFile),
        message: 'Missing Workflow 11 three-layer markers in svfactory/process.md.',
      });
    }

    return violations;
  },
};

const KA104_SESSION_CHOOSER_ALIGNMENT = {
  id: 'KBX-KA104',
  title: 'Session chooser alignment',
  description: 'KBAgent contract must keep mandatory session chooser and deterministic preflight markers.',
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
        'Session-start intent chooser',
        'Run `kbx intent list`',
      ]);
      if (!ok) {
        violations.push({
          file: joinRel(kbPath, file),
          message: 'Missing mandatory session chooser markers in KBAgent contract docs.',
        });
      }
    }

    return violations;
  },
};

const GV003_GRAPH_INGEST_LANE_GATE = {
  id: 'KBX-GV003',
  title: 'Graph-ingest lane artifact acceptance gate',
  description: 'When v2.8 rule-catalog hardening intent is active, required lane artifacts must exist and be valid.',
  severity: SEVERITY.ERROR,
  owner_layer: OWNER_LAYER.SHARED,
  enforceability: ENFORCEABILITY.AUTO,
  runtime_status: RUNTIME_STATUS.IMPLEMENTED,
  since_version: '2.8.0',
  source_doc: ALIGNMENT_DOC,
  check({ kbPath }) {
    if (!isHardeningIntentActive(kbPath)) {
      return [];
    }

    const violations = [];
    for (const lane of REQUIRED_LANES) {
      const checkResult = validateLaneArtifact(kbPath, lane);
      if (!checkResult.ok) {
        violations.push({
          file: checkResult.file,
          message: `${checkResult.message} Run: kbx graph lane ${lane}`,
        });
      }
    }

    return violations;
  },
};

registerRules([
  GV001_DETERMINISTIC_BLOCK_ALIGNMENT,
  GV002_CLI_FIRST_GATE_ALIGNMENT,
  GV003_GRAPH_INGEST_LANE_GATE,
  PR025_THREE_LAYER_ALIGNMENT,
  PR026_SESSION_HOOK_BOUNDARY_ALIGNMENT,
  WF008_INTENT_GATE_ALIGNMENT,
  WF011_THREE_LAYER_WORKFLOW_ALIGNMENT,
  KA103_NL_TRIGGER_ALIGNMENT,
  KA104_SESSION_CHOOSER_ALIGNMENT,
]);

module.exports = [
  GV001_DETERMINISTIC_BLOCK_ALIGNMENT,
  GV002_CLI_FIRST_GATE_ALIGNMENT,
  GV003_GRAPH_INGEST_LANE_GATE,
  PR025_THREE_LAYER_ALIGNMENT,
  PR026_SESSION_HOOK_BOUNDARY_ALIGNMENT,
  WF008_INTENT_GATE_ALIGNMENT,
  WF011_THREE_LAYER_WORKFLOW_ALIGNMENT,
  KA103_NL_TRIGGER_ALIGNMENT,
  KA104_SESSION_CHOOSER_ALIGNMENT,
];
