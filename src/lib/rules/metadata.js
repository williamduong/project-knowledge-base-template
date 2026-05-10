'use strict';

/**
 * Metadata Rules — v2.7
 *
 * Source doc: template/15-governance/metadata-schema.md
 *
 * Rules:
 *   KBX-M001  Required frontmatter fields present (title, type, status, owner)
 *   KBX-M002  status field must be one of allowed values
 *   KBX-M003  verification field must be one of allowed values (if present)
 *   KBX-M004  time_state field must be one of allowed values (if present)
 */

const fs = require('fs');
const path = require('path');
const { registerRules } = require('../rule-engine');
const { OWNER_LAYER, ENFORCEABILITY, RUNTIME_STATUS } = require('./registry');

const REQUIRED_FIELDS = ['title', 'type', 'status', 'owner'];

// Keep parser backward-compatible across shipped template generations.
const ALLOWED_STATUS = ['active', 'draft', 'deprecated', 'archived', 'stable', 'template'];
const ALLOWED_VERIFICATION = ['code-verified', 'design-only', 'unverified', 'self-referential', 'outdated'];
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
  if (!fs.existsSync(rootDir)) return results;
  const SKIP = new Set(['.kb', '.git', 'node_modules', '.github', 'intents', '_archive', '_closed', '_backlog', '_active', 'proposed-changes']);
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(full);
      }
    }
  }
  walk(rootDir);
  return results;
}

registerRules([
  {
    id: 'KBX-M001',
    title: 'Required frontmatter fields',
    description: 'Required frontmatter fields must be present: title, type, status, owner.',
    severity: 'error',
    owner_layer: OWNER_LAYER.SVFACTORY,
    enforceability: ENFORCEABILITY.AUTO,
    runtime_status: RUNTIME_STATUS.IMPLEMENTED,
    since_version: '2.7.0-beta.2',
    source_doc: 'template/15-governance/metadata-schema.md',
    check({ kbPath }) {
      const violations = [];
      const kbDir = path.join(kbPath, 'knowledge-base');
      const templateDir = path.join(kbPath, 'template');
      const dirs = [kbDir, templateDir].filter(d => fs.existsSync(d));
      for (const dir of dirs) {
        for (const file of collectKbDocs(dir)) {
          let content;
          try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
          const fm = parseFrontmatterFields(content);
          if (!fm) continue; // no frontmatter = not a governed doc
          const missing = REQUIRED_FIELDS.filter(f => !fm[f]);
          if (missing.length > 0) {
            violations.push({
              file: path.relative(kbPath, file).replace(/\\/g, '/'),
              message: `Missing required frontmatter field(s): ${missing.join(', ')}`,
            });
          }
        }
      }
      return violations;
    },
  },

  {
    id: 'KBX-M002',
    title: 'Valid status enum',
    description: `status field must be one of: ${ALLOWED_STATUS.join(', ')}.`,
    severity: 'error',
    owner_layer: OWNER_LAYER.SVFACTORY,
    enforceability: ENFORCEABILITY.AUTO,
    runtime_status: RUNTIME_STATUS.IMPLEMENTED,
    since_version: '2.7.0-beta.2',
    source_doc: 'template/15-governance/metadata-schema.md',
    check({ kbPath }) {
      const violations = [];
      const kbDir = path.join(kbPath, 'knowledge-base');
      const templateDir = path.join(kbPath, 'template');
      const dirs = [kbDir, templateDir].filter(d => fs.existsSync(d));
      for (const dir of dirs) {
        for (const file of collectKbDocs(dir)) {
          let content;
          try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
          const fm = parseFrontmatterFields(content);
          if (!fm || !fm.status) continue;
          if (!ALLOWED_STATUS.includes(fm.status)) {
            violations.push({
              file: path.relative(kbPath, file).replace(/\\/g, '/'),
              message: `Invalid status "${fm.status}". Allowed: ${ALLOWED_STATUS.join(', ')}`,
            });
          }
        }
      }
      return violations;
    },
  },

  {
    id: 'KBX-M003',
    title: 'Valid verification enum',
    description: `verification field, when present, must be one of: ${ALLOWED_VERIFICATION.join(', ')}.`,
    severity: 'warn',
    owner_layer: OWNER_LAYER.SVFACTORY,
    enforceability: ENFORCEABILITY.AUTO,
    runtime_status: RUNTIME_STATUS.IMPLEMENTED,
    since_version: '2.7.0-beta.2',
    source_doc: 'template/15-governance/metadata-schema.md',
    check({ kbPath }) {
      const violations = [];
      const kbDir = path.join(kbPath, 'knowledge-base');
      const templateDir = path.join(kbPath, 'template');
      const dirs = [kbDir, templateDir].filter(d => fs.existsSync(d));
      for (const dir of dirs) {
        for (const file of collectKbDocs(dir)) {
          let content;
          try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
          const fm = parseFrontmatterFields(content);
          if (!fm || !fm.verification) continue;
          if (!ALLOWED_VERIFICATION.includes(fm.verification)) {
            violations.push({
              file: path.relative(kbPath, file).replace(/\\/g, '/'),
              message: `Invalid verification "${fm.verification}". Allowed: ${ALLOWED_VERIFICATION.join(', ')}`,
            });
          }
        }
      }
      return violations;
    },
  },

  {
    id: 'KBX-M004',
    title: 'Valid time_state enum',
    description: `time_state field, when present, must be one of: ${ALLOWED_TIME_STATE.join(', ')}.`,
    severity: 'warn',
    owner_layer: OWNER_LAYER.SVFACTORY,
    enforceability: ENFORCEABILITY.AUTO,
    runtime_status: RUNTIME_STATUS.IMPLEMENTED,
    since_version: '2.7.0-beta.2',
    source_doc: 'template/15-governance/metadata-schema.md',
    check({ kbPath }) {
      const violations = [];
      const kbDir = path.join(kbPath, 'knowledge-base');
      const templateDir = path.join(kbPath, 'template');
      const dirs = [kbDir, templateDir].filter(d => fs.existsSync(d));
      for (const dir of dirs) {
        for (const file of collectKbDocs(dir)) {
          let content;
          try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
          const fm = parseFrontmatterFields(content);
          if (!fm || !fm.time_state) continue;
          if (!ALLOWED_TIME_STATE.includes(fm.time_state)) {
            violations.push({
              file: path.relative(kbPath, file).replace(/\\/g, '/'),
              message: `Invalid time_state "${fm.time_state}". Allowed: ${ALLOWED_TIME_STATE.join(', ')}`,
            });
          }
        }
      }
      return violations;
    },
  },
]);
