'use strict';

const fs = require('fs');
const path = require('path');

const { listActiveIntentIds, intentWorkspacePath, findIntentWorkspace } = require('../intent');

const GATE_TYPES = ['operator-global', 'observation', 'intent-local', 'pipeline-specific'];
const GATE_SCOPES = ['workspace-global', 'intent', 'release', 'maintain', 'observation'];
const GATE_STATUSES = ['pending', 'in-progress', 'done', 'skipped'];
const GATE_PRIORITIES = ['low', 'medium', 'high'];

function templatePath(contentRoot) {
  return path.join(contentRoot, '14-templates', 'gates.md.template');
}

function gatesFilePath(contentRoot, intentId) {
  const workspace = findIntentWorkspace(contentRoot, intentId) || intentWorkspacePath(contentRoot, intentId);
  return path.join(workspace, 'gates.md');
}

function defaultPreamble(intentId, generatedAt = new Date().toISOString()) {
  return [
    '---',
    `intent_id: ${intentId}`,
    'type: intent-gates',
    `generated_at: ${generatedAt}`,
    '---',
    '',
    `# Gates - ${intentId}`,
    '',
    '> Managed by KB Agent. Human-gate records for tasks that require a non-AI actor.',
    '> AI writes to this file and continues - does NOT block workflow.',
    '> See `agent-operating-manual.md#human-gate-protocol` for full spec.',
    '',
    '---',
    '',
  ].join('\n');
}

function loadTemplatePrefix(contentRoot, intentId) {
  const fp = templatePath(contentRoot);
  if (!fs.existsSync(fp)) {
    return defaultPreamble(intentId);
  }

  const raw = fs.readFileSync(fp, 'utf8')
    .replace(/REPLACE_WITH_INTENT_ID/g, intentId)
    .replace(/REPLACE_WITH_TIMESTAMP/g, new Date().toISOString());

  const firstGate = raw.search(/^##\s+HG-\d+\s+·\s+/m);
  let prefix = firstGate >= 0 ? raw.slice(0, firstGate) : raw;
  prefix = stripExampleBlock(prefix).trimEnd();
  return `${prefix}\n\n`;
}

function stripExampleBlock(raw) {
  return raw.replace(/<!-- EXAMPLE[\s\S]*?-->\s*/m, '');
}

function normalizePrefix(prefix, contentRoot, intentId) {
  const cleaned = stripExampleBlock(prefix || '').trim();
  if (cleaned) {
    return `${cleaned}\n\n`;
  }
  return loadTemplatePrefix(contentRoot, intentId);
}

function parseListField(value) {
  if (!value || value === '—') return [];
  const trimmed = String(value).trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return trimmed
    .split(/\r?\n/)
    .map((line) => line.replace(/^-+\s*/, '').trim())
    .filter(Boolean);
}

function extractField(block, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\*\\*${escaped}:\\*\\*\\s*(.*)$`, 'm');
  const match = block.match(pattern);
  return match ? match[1].trim() : '';
}

function extractSection(block, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\*\\*${escaped}:\\*\\*\\s*\\r?\\n([\\s\\S]*?)(?=^\\*\\*[A-Za-z]|\\Z)`, 'm');
  const match = block.match(pattern);
  if (!match) return [];
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-+\s*/, '').trim())
    .filter(Boolean);
}

function parseGateBlock(block, intentId, filePath) {
  const header = block.match(/^##\s+(HG-\d+)\s+·\s+([A-Za-z-]+)/m);
  if (!header) {
    return null;
  }

  const gateId = header[1];
  const status = header[2];
  return {
    id: gateId,
    status,
    actor: extractField(block, 'Actor') || 'human',
    action: extractField(block, 'Action'),
    why: extractField(block, 'Why'),
    inputsNeeded: (() => {
      const sectionItems = extractSection(block, 'Inputs needed');
      if (sectionItems.length > 0) return sectionItems;
      return parseListField(extractField(block, 'Inputs needed'));
    })(),
    expectedOutput: extractField(block, 'Expected output'),
    blocking: parseListField(extractField(block, 'Blocking')),
    priority: extractField(block, 'Priority') || 'medium',
    createdAt: extractField(block, 'Created'),
    doneAt: extractField(block, 'Done at'),
    outputReceived: extractField(block, 'Output received'),
    skipReason: extractField(block, 'Skip reason'),
    gate_type: 'intent-local',
    scope: 'intent',
    source: 'gates.md',
    sourcePath: filePath,
    intentId,
  };
}

function parseGatesFile(raw, { intentId, filePath }) {
  const firstGate = raw.search(/^##\s+HG-\d+\s+·\s+/m);
  const prefix = firstGate >= 0 ? raw.slice(0, firstGate) : raw;
  const blocks = firstGate >= 0
    ? raw
      .slice(firstGate)
      .split(/(?=^##\s+HG-\d+\s+·\s+)/m)
      .map((block) => block.trim())
      .filter(Boolean)
    : [];

  const gates = blocks
    .map((block) => parseGateBlock(block, intentId, filePath))
    .filter(Boolean);

  return { prefix, gates };
}

function serializeList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '—';
  }
  if (items.length === 1) {
    return items[0];
  }
  return `\n${items.map((item) => `- ${item}`).join('\n')}`;
}

function serializeGate(gate) {
  const lines = [
    `## ${gate.id} · ${gate.status}`,
    '',
    `**Actor:** ${gate.actor || 'human'}`,
    `**Action:** ${gate.action || '—'}`,
    `**Why:** ${gate.why || '—'}`,
    `**Inputs needed:** ${serializeList(gate.inputsNeeded)}`,
    `**Expected output:** ${gate.expectedOutput || '—'}`,
    `**Blocking:** ${gate.blocking && gate.blocking.length > 0 ? `[${gate.blocking.join(', ')}]` : '[]'}`,
    `**Priority:** ${gate.priority || 'medium'}`,
    `**Created:** ${gate.createdAt || new Date().toISOString()}`,
    `**Done at:** ${gate.doneAt || '—'}`,
    `**Output received:** ${gate.outputReceived || '—'}`,
  ];

  if (gate.skipReason) {
    lines.push(`**Skip reason:** ${gate.skipReason}`);
  }

  lines.push('');
  return lines.join('\n');
}

function writeGateFile(filePath, prefix, gates) {
  const body = gates.map((gate) => serializeGate(gate)).join('\n');
  const content = `${prefix}${body}`.trimEnd() + '\n';
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function ensureIntentWorkspaceExists(contentRoot, intentId) {
  const workspace = findIntentWorkspace(contentRoot, intentId);
  if (!workspace) {
    throw new Error(`Intent "${intentId}" not found.`);
  }
  return workspace;
}

function readIntentGates(contentRoot, intentId) {
  ensureIntentWorkspaceExists(contentRoot, intentId);
  const filePath = gatesFilePath(contentRoot, intentId);
  if (!fs.existsSync(filePath)) {
    return {
      intentId,
      filePath,
      exists: false,
      prefix: loadTemplatePrefix(contentRoot, intentId),
      gates: [],
    };
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = parseGatesFile(raw, { intentId, filePath });
  return {
    intentId,
    filePath,
    exists: true,
    prefix: normalizePrefix(parsed.prefix, contentRoot, intentId),
    gates: parsed.gates,
  };
}

function nextGateId(gates) {
  const max = (gates || []).reduce((acc, gate) => {
    const match = String(gate.id || '').match(/^HG-(\d+)$/);
    if (!match) return acc;
    return Math.max(acc, Number(match[1]));
  }, 0);
  return `HG-${String(max + 1).padStart(3, '0')}`;
}

function addIntentGate(contentRoot, {
  intentId,
  actor = 'human',
  action,
  why,
  inputsNeeded = [],
  expectedOutput = '',
  blocking = [],
  priority = 'high',
  createdAt = new Date().toISOString(),
}) {
  if (!action) throw new Error('kbx gates add requires --action="...".');
  if (!why) throw new Error('kbx gates add requires --why="...".');
  if (!GATE_PRIORITIES.includes(priority)) {
    throw new Error(`kbx gates add: invalid priority "${priority}". Supported: ${GATE_PRIORITIES.join(', ')}`);
  }

  const state = readIntentGates(contentRoot, intentId);
  const gate = {
    id: nextGateId(state.gates),
    status: 'pending',
    actor,
    action,
    why,
    inputsNeeded,
    expectedOutput,
    blocking,
    priority,
    createdAt,
    doneAt: '—',
    outputReceived: '—',
    skipReason: '',
    gate_type: 'intent-local',
    scope: 'intent',
    source: 'gates.md',
    sourcePath: state.filePath,
    intentId,
  };

  const gates = [...state.gates, gate];
  writeGateFile(state.filePath, state.prefix, gates);
  return gate;
}

function updateIntentGate(contentRoot, {
  intentId,
  gateId,
  status,
  output = '',
  reason = '',
  timestamp = new Date().toISOString(),
}) {
  const state = readIntentGates(contentRoot, intentId);
  const gates = state.gates.map((gate) => ({ ...gate }));
  const target = gates.find((gate) => gate.id === gateId);
  if (!target) {
    throw new Error(`Gate "${gateId}" not found in intent "${intentId}".`);
  }

  if (status === 'done') {
    target.status = 'done';
    target.doneAt = timestamp;
    target.outputReceived = output || target.outputReceived || '—';
    target.skipReason = '';
  } else if (status === 'skipped') {
    target.status = 'skipped';
    target.doneAt = timestamp;
    target.skipReason = reason;
    target.outputReceived = output || target.outputReceived || '—';
  } else if (status === 'in-progress') {
    target.status = 'in-progress';
  } else {
    throw new Error(`Unsupported gate status transition "${status}".`);
  }

  writeGateFile(state.filePath, state.prefix, gates);
  return target;
}

function listIntentGates(contentRoot, { intentId = null, includeResolved = false } = {}) {
  const intentIds = intentId ? [intentId] : listActiveIntentIds(contentRoot);
  const records = [];

  for (const id of intentIds) {
    const state = readIntentGates(contentRoot, id);
    for (const gate of state.gates) {
      if (!includeResolved && (gate.status === 'done' || gate.status === 'skipped')) {
        continue;
      }
      records.push(gate);
    }
  }

  return records.sort((a, b) => {
    if (a.intentId !== b.intentId) return String(a.intentId).localeCompare(String(b.intentId));
    return String(a.id).localeCompare(String(b.id));
  });
}

function listPendingIntentGates(contentRoot, intentId) {
  return readIntentGates(contentRoot, intentId).gates.filter((gate) => gate.status === 'pending');
}

module.exports = {
  GATE_TYPES,
  GATE_SCOPES,
  GATE_STATUSES,
  GATE_PRIORITIES,
  gatesFilePath,
  parseGatesFile,
  readIntentGates,
  listIntentGates,
  listPendingIntentGates,
  addIntentGate,
  updateIntentGate,
};
