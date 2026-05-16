'use strict';

/**
 * Intent Rules — v2.7 Phase 2
 *
 * Source doc: knowledge-base/intents directories (_active, _closed, etc.)
 * Each intent directory contains an intent.md file.
 *
 * Rules:
 *   KBX-I001  Active intents must have non-empty focus.next_action
 *   KBX-I002  Feature/breaking intents must have non-empty change_scope
 */

const fs = require('fs');
const path = require('path');
const { registerRules } = require('../rule-engine');
const { SEVERITY } = require('./registry');

function coerceFrontmatterValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^[+-]?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

/**
 * Parse YAML-style frontmatter from intent.md, including nested fields.
 * Returns object with parsed fields, or null if no frontmatter.
 *
 * Handles both flat and nested YAML:
 *   title: My Title         => fields.title = "My Title"
 *   focus:                  => fields.focus = { current: "...", next_action: "..." }
 *     current: "Foo"
 *     next_action: "Bar"
 */
function parseFrontmatter(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!match) return null;
  const block = match[1];
  const fields = {};
  const lines = block.split(/\r?\n/);
  let currentNested = null;
  let currentNestedKey = null;

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Detect indentation (2 spaces per level)
    const indentMatch = /^(\s*)(.*)$/.exec(line);
    const indent = indentMatch[1].length;
    const content_line = indentMatch[2];

    // Top-level key
    if (indent === 0) {
      const m = /^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/.exec(content_line);
      if (m) {
        const key = m[1];
        let val = m[2].trim().replace(/^["']|["']$/g, '');
        // If value is empty, might be start of nested object
        if (val === '') {
          currentNested = {};
          currentNestedKey = key;
          fields[key] = currentNested;
        } else {
          currentNested = null;
          currentNestedKey = null;
          // Type coercion
          val = coerceFrontmatterValue(val);
          fields[key] = val;
        }
      }
    }
    // Nested field (indented)
    else if (indent >= 2 && currentNested !== null) {
      const m = /^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/.exec(content_line);
      if (m) {
        const key = m[1];
        let val = m[2].trim().replace(/^["']|["']$/g, '');
        // Type coercion
        val = coerceFrontmatterValue(val);
        currentNested[key] = val;
      }
    }
  }

  return fields;
}

/**
 * List all intent directories (active + closed).
 * Returns array of absolute paths to intent.md files.
 */
function collectIntentFiles(kbPath) {
  const results = [];
  const intentsBase = path.join(kbPath, 'knowledge-base', 'intents');

  if (!fs.existsSync(intentsBase)) return results;

  function scanDir(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const abs = path.join(dir, ent.name);
      if (ent.isDirectory() && ent.name.startsWith('_')) {
        // _active, _closed, etc.
        scanDir(abs);
      } else if (ent.isDirectory()) {
        // Intent directory (e.g., v2-7-nl-rules-to-cli-logic)
        const intentMd = path.join(abs, 'intent.md');
        if (fs.existsSync(intentMd)) {
          results.push(intentMd);
        }
      }
    }
  }

  scanDir(intentsBase);
  return results;
}

/**
 * KBX-I001: Active intents must have non-empty focus.next_action
 */
const I001_ACTIVE_INTENT_HAS_NEXT_ACTION = {
  id: 'KBX-I001',
  description: 'Active intents must have non-empty focus.next_action field',
  severity: SEVERITY.WARN,
  source_doc: 'knowledge-base/intents directories (_active, _closed, etc.)',
  check(context) {
    const violations = [];
    const { kbPath } = context;
    const intentFiles = collectIntentFiles(kbPath);

    for (const intentPath of intentFiles) {
      let content;
      try { content = fs.readFileSync(intentPath, 'utf8'); } catch { continue; }

      const fm = parseFrontmatter(content);
      if (!fm) continue;

      // Only check active intents
      if (fm.lifecycle !== 'active') continue;

      // Check focus.next_action (nested field)
      const focus = fm.focus;
      const nextAction = (typeof focus === 'object' && focus !== null) ? focus.next_action : null;

      if (!nextAction || (typeof nextAction === 'string' && nextAction.trim() === '')) {
        const relPath = path.relative(kbPath, intentPath);
        violations.push({
          file: relPath,
          message: `Active intent missing or empty next_action in focus field`,
        });
      }
    }

    return violations;
  },
};

/**
 * KBX-I002: Feature/breaking intents must have non-empty change_scope
 */
const I002_FEATURE_HAS_CHANGE_SCOPE = {
  id: 'KBX-I002',
  description: 'Feature/breaking intents must have non-empty change_scope field',
  severity: SEVERITY.WARN,
  source_doc: 'knowledge-base/intents directories (_active, _closed, etc.)',
  check(context) {
    const violations = [];
    const { kbPath } = context;
    const intentFiles = collectIntentFiles(kbPath);

    for (const intentPath of intentFiles) {
      let content;
      try { content = fs.readFileSync(intentPath, 'utf8'); } catch { continue; }

      const fm = parseFrontmatter(content);
      if (!fm) continue;

      // Only check active intents with feature/breaking type
      if (fm.lifecycle !== 'active') continue;
      if (!['feature', 'breaking'].includes(fm.change_type)) continue;

      // Check change_scope is not empty
      const scope = fm.change_scope;
      if (!scope || (typeof scope === 'string' && scope.trim() === '')) {
        const relPath = path.relative(kbPath, intentPath);
        violations.push({
          file: relPath,
          message: `Feature/breaking intent missing or empty change_scope field`,
        });
      }
    }

    return violations;
  },
};

/**
 * KBX-I003: Active intents must declare chaos_estimate.estimated_delta
 */
const I003_ACTIVE_INTENT_HAS_CHAOS_ESTIMATE = {
  id: 'KBX-I003',
  description: 'Active intents must have numeric chaos_estimate.estimated_delta field',
  severity: SEVERITY.WARN,
  source_doc: 'knowledge-base/intents directories (_active, _closed, etc.)',
  check(context) {
    const violations = [];
    const { kbPath } = context;
    const intentFiles = collectIntentFiles(kbPath);

    for (const intentPath of intentFiles) {
      let content;
      try { content = fs.readFileSync(intentPath, 'utf8'); } catch { continue; }

      const fm = parseFrontmatter(content);
      if (!fm || fm.lifecycle !== 'active') continue;

      const chaosEstimate = fm.chaos_estimate;
      const estimatedDelta = chaosEstimate && typeof chaosEstimate === 'object'
        ? chaosEstimate.estimated_delta
        : null;

      if (typeof estimatedDelta !== 'number' || !Number.isFinite(estimatedDelta)) {
        const relPath = path.relative(kbPath, intentPath);
        violations.push({
          file: relPath,
          message: 'Active intent missing numeric chaos_estimate.estimated_delta field',
        });
      }
    }

    return violations;
  },
};

// ─── Export ─────────────────────────────────────────────────────────────────

const rules = [I001_ACTIVE_INTENT_HAS_NEXT_ACTION, I002_FEATURE_HAS_CHANGE_SCOPE, I003_ACTIVE_INTENT_HAS_CHAOS_ESTIMATE];

registerRules(rules);

module.exports = rules;
