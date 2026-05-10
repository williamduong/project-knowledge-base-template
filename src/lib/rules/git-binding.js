'use strict';

/**
 * Git Binding Rules — v2.7 Phase 2
 *
 * Source doc: template/15-governance/git-binding-policy.md
 *
 * Rules:
 *   KBX-GB001  Intent IDs must follow vX-Y-slug pattern (e.g., v2-7-nl-rules-to-cli-logic)
 *   KBX-GB002  focus.md must expose Intent Checkpoints section for deterministic checkpoint trace
 */

const fs = require('fs');
const path = require('path');
const { registerRules } = require('../rule-engine');
const { SEVERITY, OWNER_LAYER, ENFORCEABILITY, RUNTIME_STATUS } = require('./registry');

/**
 * Parse YAML-style frontmatter from intent.md.
 * Returns object with parsed fields, or null if no frontmatter.
 */
function parseFrontmatter(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!match) return null;
  const block = match[1];
  const fields = {};
  for (const line of block.split(/\r?\n/)) {
    const m = /^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/.exec(line);
    if (m) {
      const key = m[1];
      let val = m[2].trim().replace(/^["']|["']$/g, '');
      fields[key] = val;
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
        // Skip archived legacy intents to preserve backward compatibility.
        if (ent.name === '_archive') continue;
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
 * KBX-GB001: Intent IDs must follow vX-Y-slug pattern
 *
 * Valid patterns:
 *   v2-7-nl-rules-to-cli-logic
 *   v1-3-git-binding
 *   v3-0-monorepo-split
 *
 * Invalid:
 *   2-7-rules (missing v prefix)
 *   v2_7_rules (underscore instead of dash)
 *   v2-7 (no slug)
 */
const GB001_INTENT_ID_FORMAT = {
  id: 'KBX-GB001',
  title: 'Intent ID format vX-Y-slug',
  description: 'Intent IDs must follow vX-Y-slug pattern (e.g., v2-7-nl-rules-to-cli-logic)',
  severity: SEVERITY.ERROR,
  owner_layer: OWNER_LAYER.SVFACTORY,
  enforceability: ENFORCEABILITY.AUTO,
  runtime_status: RUNTIME_STATUS.IMPLEMENTED,
  since_version: '2.7.0-beta.2',
  source_doc: 'template/15-governance/git-binding-policy.md',
  check(context) {
    const violations = [];
    const { kbPath } = context;
    const intentFiles = collectIntentFiles(kbPath);

    // Pattern: vX-Y-<slug> where X,Y are digits and slug is lowercase alphanumeric-dash
    const validPattern = /^v\d+-\d+-[a-z0-9]+(-[a-z0-9]+)*$/;

    for (const intentPath of intentFiles) {
      let content;
      try { content = fs.readFileSync(intentPath, 'utf8'); } catch { continue; }

      const fm = parseFrontmatter(content);
      if (!fm) continue;

      const intentId = fm.id;
      if (!intentId || !validPattern.test(intentId)) {
        const relPath = path.relative(kbPath, intentPath);
        violations.push({
          file: relPath,
          message: `Intent ID "${intentId}" does not match vX-Y-slug pattern (e.g., v2-7-nl-rules-to-cli-logic)`,
        });
      }
    }

    return violations;
  },
};

/**
 * KBX-GB002: focus.md must expose checkpoint section
 *
 * Deterministic checkpoint commits rely on this section to keep append-only trace lines.
 * We only enforce when a focus.md file exists in known root paths.
 */
const GB002_FOCUS_CHECKPOINT_SECTION = {
  id: 'KBX-GB002',
  title: 'focus.md intent checkpoints section',
  description: 'focus.md must contain "## Intent Checkpoints" section when focus file is present',
  severity: SEVERITY.WARN,
  owner_layer: OWNER_LAYER.SVFACTORY,
  enforceability: ENFORCEABILITY.AUTO,
  runtime_status: RUNTIME_STATUS.IMPLEMENTED,
  since_version: '2.7.0-beta.2',
  source_doc: 'template/15-governance/git-binding-policy.md',
  check(context) {
    const violations = [];
    const { kbPath } = context;

    const candidates = [
      path.join(kbPath, 'svfactory', 'focus.md'),
      path.join(kbPath, 'kb-root', 'focus.md'),
    ];

    const focusPath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!focusPath) {
      return violations;
    }

    let content;
    try {
      content = fs.readFileSync(focusPath, 'utf8');
    } catch {
      return violations;
    }

    if (!content.includes('## Intent Checkpoints')) {
      violations.push({
        file: path.relative(kbPath, focusPath),
        message: 'Missing "## Intent Checkpoints" section required for deterministic checkpoint history',
      });
    }

    return violations;
  },
};

// ─── Export ─────────────────────────────────────────────────────────────────

const rules = [GB001_INTENT_ID_FORMAT, GB002_FOCUS_CHECKPOINT_SECTION];

registerRules(rules);

module.exports = rules;
