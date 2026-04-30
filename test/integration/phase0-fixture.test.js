'use strict';

/**
 * Integration test cho Phase 0 fixture v1.3:
 * 8 doc bind × 22 changed file (diff v1.2.1..HEAD trên template repo).
 *
 * Mục đích: chứng minh impact engine match đúng với fixture đã validate manual.
 * Không phụ thuộc git tại runtime — fixture inline.
 *
 * Reference: knowledge.md T7, R12, D9; focus.md Phase 0 outcome.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { matchPaths } = require('../../src/lib/binding-matcher');
const { partitionChanges, deriveVerdict } = require('../../src/lib/impact');

// 22 changed files between v1.2.1 and HEAD on template repo (Phase 0 fixture).
const CHANGED_FILES = [
  { status: 'M', path: '.gitignore' },
  { status: 'M', path: 'package.json' },
  { status: 'M', path: 'src/cli.js' },
  { status: 'M', path: 'src/commands/doctor.js' },
  { status: 'M', path: 'src/commands/help.js' },
  { status: 'A', path: 'src/commands/ide.js' },
  { status: 'M', path: 'src/commands/init.js' },
  { status: 'A', path: 'src/commands/status.js' },
  { status: 'M', path: 'src/commands/uninstall.js' },
  { status: 'M', path: 'src/commands/update.js' },
  { status: 'M', path: 'src/lib/context.js' },
  { status: 'A', path: 'src/lib/kb-presence.js' },
  { status: 'M', path: 'template/.github/agents/kb.agent.md' },
  { status: 'A', path: 'template/.github/hooks/revision-state-guard.json' },
  { status: 'A', path: 'template/.github/prompts/kb-ask.prompt.md' },
  { status: 'M', path: 'template/.github/prompts/kb-plan.prompt.md' },
  { status: 'M', path: 'template/.github/prompts/kb-run.prompt.md' },
  { status: 'M', path: 'template/00-start-here/finalization-plan.md' },
  { status: 'M', path: 'template/00-start-here/repository-revision-state.md' },
  { status: 'M', path: 'template/TEMPLATE_CHANGELOG.md' },
  { status: 'M', path: 'template/template.json' },
  { status: 'A', path: 'tools/sync-versions.js' },
];

// 8 binding theo D9 heuristic (00-start-here→commands/cli, 12-ai-skills→agents/prompts,
// 15-governance→tools/scripts/template config) + 5 doc tier-specific khác để cover spread.
const BINDINGS = [
  // 00-start-here tier → CLI surface
  { doc: '00-start-here/how-to-use-this-kb.md', paths: ['src/commands/**', 'src/cli.js', 'bin/**'] },
  { doc: '00-start-here/finalization-plan.md', paths: ['src/commands/init.js', 'src/commands/uninstall.js'] },
  { doc: '00-start-here/repository-revision-state.md', paths: ['src/lib/context.js', 'src/lib/kb-presence.js', 'src/commands/status.js'] },
  // 12-ai-skills tier → agents/prompts
  { doc: '12-ai-skills/agent-operating-manual.md', paths: ['template/.github/agents/**', 'template/.github/prompts/**'] },
  // 15-governance tier → tools/template config
  { doc: '15-governance/template-versioning-policy.md', paths: ['tools/sync-versions.js', 'package.json', 'template/template.json', 'template/TEMPLATE_CHANGELOG.md'] },
  { doc: '15-governance/review-cadence.md', paths: ['template/.github/hooks/**', 'template/00-start-here/repository-revision-state.md'] },
  // 04-frontend / 05-backend / 07-database tier → no overlap with this diff (unbound expectation)
  { doc: '05-backend/middleware-and-auth.md', paths: ['src/middleware/**', 'src/auth.js'] },
  { doc: '07-database/schema-and-migrations.md', paths: ['src/prisma/**', 'prisma/**'] },
];

// Expected impact (manually validated in Phase 0 dogfood):
// Sau khi áp R12 filter (template/ = contentRoot self-edits), 4/8 binding match thật:
// - 2 binding chỉ trỏ vào template/** → tất cả target rơi vào selfEdits → 0 match (đúng).
//   Đây chính là insight R12: KB self-edit không tự đưa nó vào impact list.
// - 2 binding cho tier 04/05/07 không có overlap với diff này (đúng — tier không touch).
const EXPECTED_IMPACTED_DOCS = new Set([
  '00-start-here/how-to-use-this-kb.md',
  '00-start-here/finalization-plan.md',
  '00-start-here/repository-revision-state.md',
  '15-governance/template-versioning-policy.md',
]);

const EXPECTED_UNBOUND = new Set([
  '.gitignore', // no doc binds gitignore
]);

const EXPECTED_SELF_EDITS = new Set([
  // Phase 0 noted: template/00-start-here/finalization-plan.md
  // and template/00-start-here/repository-revision-state.md are KB content under template/ tier.
  // Template/ here is the SOURCE template, NOT a downstream KB contentRoot —
  // so on the *template* repo itself, contentRoot = "template" and these become self-edits.
  'template/.github/agents/kb.agent.md',
  'template/.github/hooks/revision-state-guard.json',
  'template/.github/prompts/kb-ask.prompt.md',
  'template/.github/prompts/kb-plan.prompt.md',
  'template/.github/prompts/kb-run.prompt.md',
  'template/00-start-here/finalization-plan.md',
  'template/00-start-here/repository-revision-state.md',
  'template/TEMPLATE_CHANGELOG.md',
  'template/template.json',
]);

test('Phase 0 fixture: partitionChanges separates template/ self-edits', () => {
  const { selfEdits, codeChanges } = partitionChanges(CHANGED_FILES, 'template');
  const selfPaths = new Set(selfEdits.map((e) => e.path));
  for (const expected of EXPECTED_SELF_EDITS) {
    assert.ok(selfPaths.has(expected), `expected self-edit: ${expected}`);
  }
  // codeChanges = 22 - 9 self-edits = 13
  assert.equal(selfEdits.length, EXPECTED_SELF_EDITS.size, `selfEdits count: got ${selfEdits.length}, expected ${EXPECTED_SELF_EDITS.size}`);
  assert.equal(codeChanges.length, CHANGED_FILES.length - EXPECTED_SELF_EDITS.size);
});

test('Phase 0 fixture: 4/8 bindings match after R12 self-edit filter', () => {
  const { codeChanges } = partitionChanges(CHANGED_FILES, 'template');
  const codePaths = codeChanges.map((c) => c.path);

  const impactedDocs = new Set();
  const allMatched = new Set();

  for (const binding of BINDINGS) {
    const matches = matchPaths(codePaths, binding.paths);
    if (matches.length > 0) {
      impactedDocs.add(binding.doc);
      matches.forEach((m) => allMatched.add(m));
    }
  }

  assert.equal(impactedDocs.size, EXPECTED_IMPACTED_DOCS.size, `impacted count`);
  for (const doc of EXPECTED_IMPACTED_DOCS) {
    assert.ok(impactedDocs.has(doc), `expected impacted: ${doc}`);
  }

  // Unbound = codeChanges not matched by any binding
  const unbound = codePaths.filter((p) => !allMatched.has(p));
  assert.deepEqual(new Set(unbound), EXPECTED_UNBOUND, `unbound: got ${JSON.stringify(unbound)}`);
});

test('Phase 0 fixture: derived verdict is "attention" (impacted-docs)', () => {
  const { codeChanges } = partitionChanges(CHANGED_FILES, 'template');
  const codePaths = codeChanges.map((c) => c.path);
  const impacted = [];
  const allMatched = new Set();
  for (const binding of BINDINGS) {
    const matches = matchPaths(codePaths, binding.paths);
    if (matches.length > 0) {
      impacted.push({ doc: binding.doc, matched_changes: matches });
      matches.forEach((m) => allMatched.add(m));
    }
  }
  const unbound = codePaths.filter((p) => !allMatched.has(p));
  const verdict = deriveVerdict({ impacted, unbound_changes: unbound, skipped_reason: null });
  assert.equal(verdict.code, 1);
  assert.equal(verdict.label, 'attention');
  assert.equal(verdict.reason, 'impacted-docs');
});
