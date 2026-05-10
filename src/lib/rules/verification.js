'use strict';

/**
 * Verification Rules — v2.7 Phase 2
 *
 * Source doc: template/15-governance/verification-policy.md
 *
 * Rules:
 *   KBX-V001  time_state field must be present when verification = code-verified
 *   KBX-V002  time_state must be one of allowed values
 */

const fs = require('fs');
const path = require('path');
const { registerRules } = require('../rule-engine');
const { SEVERITY, OWNER_LAYER, ENFORCEABILITY, RUNTIME_STATUS } = require('./registry');

const ALLOWED_TIME_STATE = [
  'current',
  'point-in-time',
  'evergreen',
  'historical',
  '2026-current',
  'future',
  'to_be',
  'mixed',
  'timeless',
  'target',
];

/**
 * Parse frontmatter fields from a markdown file.
 * Returns null if no valid frontmatter block found.
 */
function parseFrontmatterFields(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!match) return null;
  const block = match[1];
  const fields = {};
  for (const line of block.split(/\r?\n/)) {
    const m = /^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/.exec(line);
    if (m) {
      const key = m[1];
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      fields[key] = val;
    }
  }
  return fields;
}

/**
 * Collect all .md files under a directory recursively,
 * excluding .kb/, .git/, node_modules/, and intents/ sub-paths.
 */
function collectKbDocs(rootDir) {
  const results = [];
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (['.kb', '.git', 'node_modules'].includes(ent.name)) continue;
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(abs);
      } else if (ent.isFile() && ent.name.endsWith('.md')) {
        results.push(abs);
      }
    }
  }
  walk(rootDir);
  return results;
}

/**
 * KBX-V001: time_state field must be present when verification = code-verified
 */
const V001_TIME_STATE_REQUIRED = {
  id: 'KBX-V001',
  title: 'time_state required with code-verified',
  description: 'time_state field must be present when verification = code-verified',
  severity: SEVERITY.ERROR,
  owner_layer: OWNER_LAYER.SVFACTORY,
  enforceability: ENFORCEABILITY.AUTO,
  runtime_status: RUNTIME_STATUS.IMPLEMENTED,
  since_version: '2.7.0-beta.2',
  source_doc: 'template/15-governance/verification-policy.md',
  check(context) {
    const violations = [];
    const { kbPath } = context;
    const docs = collectKbDocs(kbPath);

    for (const docPath of docs) {
      let content;
      try { content = fs.readFileSync(docPath, 'utf8'); } catch { continue; }

      const fields = parseFrontmatterFields(content);
      if (!fields) continue;

      const verification = fields.verification;
      if (verification === 'code-verified' && !fields.time_state) {
        const relPath = path.relative(kbPath, docPath);
        violations.push({
          file: relPath,
          message: 'verification=code-verified but time_state is missing',
        });
      }
    }
    return violations;
  },
};

/**
 * KBX-V002: time_state must be one of allowed values
 */
const V002_TIME_STATE_VALID = {
  id: 'KBX-V002',
  title: 'Valid verification time_state',
  description: `time_state must be one of: ${ALLOWED_TIME_STATE.join(', ')}`,
  severity: SEVERITY.ERROR,
  owner_layer: OWNER_LAYER.SVFACTORY,
  enforceability: ENFORCEABILITY.AUTO,
  runtime_status: RUNTIME_STATUS.IMPLEMENTED,
  since_version: '2.7.0-beta.2',
  source_doc: 'template/15-governance/verification-policy.md',
  check(context) {
    const violations = [];
    const { kbPath } = context;
    const docs = collectKbDocs(kbPath);

    for (const docPath of docs) {
      let content;
      try { content = fs.readFileSync(docPath, 'utf8'); } catch { continue; }

      const fields = parseFrontmatterFields(content);
      if (!fields) continue;

      const timeState = fields.time_state;
      if (timeState && !ALLOWED_TIME_STATE.includes(timeState)) {
        const relPath = path.relative(kbPath, docPath);
        violations.push({
          file: relPath,
          message: `time_state "${timeState}" not allowed. Use one of: ${ALLOWED_TIME_STATE.join(', ')}`,
        });
      }
    }
    return violations;
  },
};

// ─── Export ─────────────────────────────────────────────────────────────────

const rules = [V001_TIME_STATE_REQUIRED, V002_TIME_STATE_VALID];

registerRules(rules);

module.exports = rules;
