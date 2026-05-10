'use strict';

const fs = require('fs');
const path = require('path');
const { resolveExistingState } = require('./context');

const VALID_STATUS = new Set(['draft', 'active', 'deprecated', 'retired']);
const VALID_STATE = new Set(['planned', 'implemented', 'verified']);

function resolveRuleLifecyclePaths(workspaceRoot) {
  const context = resolveExistingState({ workspaceRoot });
  const root = path.join(context.contentRoot, '.kb', 'rules');
  return {
    context,
    root,
    statePath: path.join(root, 'lifecycle.json'),
    historyPath: path.join(root, 'history.ndjson'),
  };
}

function ensureStore(workspaceRoot) {
  const paths = resolveRuleLifecyclePaths(workspaceRoot);
  fs.mkdirSync(paths.root, { recursive: true });
  if (!fs.existsSync(paths.statePath)) {
    const initial = {
      schema_version: 1,
      updated_at: new Date().toISOString(),
      rules: {},
    };
    fs.writeFileSync(paths.statePath, JSON.stringify(initial, null, 2), 'utf8');
  }
  if (!fs.existsSync(paths.historyPath)) {
    fs.writeFileSync(paths.historyPath, '', 'utf8');
  }
  return paths;
}

function readState(workspaceRoot) {
  const paths = ensureStore(workspaceRoot);
  const raw = fs.readFileSync(paths.statePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed.rules || typeof parsed.rules !== 'object') {
    parsed.rules = {};
  }
  return { paths, state: parsed };
}

function writeState(paths, state) {
  state.updated_at = new Date().toISOString();
  fs.writeFileSync(paths.statePath, JSON.stringify(state, null, 2), 'utf8');
}

function appendHistory(paths, event) {
  const line = `${JSON.stringify(event)}\n`;
  fs.appendFileSync(paths.historyPath, line, 'utf8');
}

function validateInput({ ruleId, status, state }) {
  if (!ruleId || !/^KBX-[A-Z0-9]+\d{3}$/.test(ruleId)) {
    throw new Error(`Invalid rule ID: ${ruleId}`);
  }
  if (status !== undefined && !VALID_STATUS.has(status)) {
    throw new Error(`Invalid status "${status}". Allowed: ${Array.from(VALID_STATUS).join(', ')}`);
  }
  if (state !== undefined && !VALID_STATE.has(state)) {
    throw new Error(`Invalid state "${state}". Allowed: ${Array.from(VALID_STATE).join(', ')}`);
  }
}

function setRuleLifecycle(workspaceRoot, { ruleId, status, state, note, actor }) {
  validateInput({ ruleId, status, state });
  const { paths, state: store } = readState(workspaceRoot);
  const now = new Date().toISOString();
  const current = store.rules[ruleId] || {
    rule_id: ruleId,
    status: 'draft',
    state: 'planned',
    updated_at: now,
    history_count: 0,
  };

  const next = {
    ...current,
    status: status || current.status,
    state: state || current.state,
    updated_at: now,
  };

  store.rules[ruleId] = next;
  writeState(paths, store);

  const event = {
    ts: now,
    rule_id: ruleId,
    actor: actor || 'kbx.rules.lifecycle',
    event: 'set',
    from_status: current.status,
    to_status: next.status,
    from_state: current.state,
    to_state: next.state,
    note: note || null,
  };
  appendHistory(paths, event);

  next.history_count = (next.history_count || 0) + 1;
  store.rules[ruleId] = next;
  writeState(paths, store);

  return { rule: next, event, paths };
}

function listRuleLifecycle(workspaceRoot) {
  const { state } = readState(workspaceRoot);
  return Object.values(state.rules).sort((a, b) => a.rule_id.localeCompare(b.rule_id));
}

function readHistory(workspaceRoot, { ruleId, limit = 50 } = {}) {
  const paths = ensureStore(workspaceRoot);
  const raw = fs.readFileSync(paths.historyPath, 'utf8');
  const events = raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const filtered = ruleId ? events.filter((e) => e.rule_id === ruleId) : events;
  if (limit <= 0) return filtered;
  return filtered.slice(Math.max(filtered.length - limit, 0));
}

module.exports = {
  VALID_STATUS,
  VALID_STATE,
  resolveRuleLifecyclePaths,
  ensureStore,
  readState,
  setRuleLifecycle,
  listRuleLifecycle,
  readHistory,
};
