'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { collectNextActions, isCriticalMissingDoc } = require('../../src/lib/work-queue');

test('isCriticalMissingDoc: only critical folders with template/unset count', () => {
  assert.equal(isCriticalMissingDoc({ relativePath: '05-backend/auth.md', kbState: 'template' }), true);
  assert.equal(isCriticalMissingDoc({ relativePath: '12-ai-skills/guide.md', kbState: 'template' }), false);
  assert.equal(isCriticalMissingDoc({ relativePath: '05-backend/auth.md', kbState: 'verified' }), false);
});

test('collectNextActions: drift has highest priority and review excludes drift docs', () => {
  const out = collectNextActions({
    impactData: {
      impacted: [
        { doc: '05-backend/auth.md', matched_changes: ['src/auth.js'], auto_downgraded: true },
      ],
    },
    documents: [
      { relativePath: '05-backend/auth.md', kbState: 'needs-review', frontmatter: { last_updated: '2026-05-01' } },
      { relativePath: '03-architecture/overview.md', kbState: 'needs-review', frontmatter: { last_updated: '2026-04-01' } },
    ],
    sourceIndex: { entries: [] },
    now: new Date('2026-05-04T00:00:00Z'),
  });

  assert.equal(out.summary.drift, 1);
  assert.equal(out.summary.review, 1);
  assert.equal(out.nextBestAction.kind, 'drift');
  assert.equal(out.sections.review[0].doc, '03-architecture/overview.md');
});

test('collectNextActions: includes missing critical and stale source mirror', () => {
  const out = collectNextActions({
    impactData: { impacted: [] },
    documents: [
      { relativePath: '05-backend/errors.md', kbState: 'template', frontmatter: {} },
      { relativePath: '12-ai-skills/guide.md', kbState: 'template', frontmatter: {} },
    ],
    sourceIndex: {
      entries: [
        { source_path: 'src/jobs/mailer.js', kb_coverage: 'stale' },
        { source_path: 'src/unused.js', kb_coverage: 'uncovered' },
      ],
    },
    now: new Date('2026-05-04T00:00:00Z'),
  });

  assert.equal(out.summary.missing, 1);
  assert.equal(out.summary.source, 1);
  assert.equal(out.sections.missing[0].command, 'kb questions --print');
  assert.equal(out.sections.source[0].command, 'kb extract src/jobs/mailer.js');
});

test('collectNextActions: empty state returns no next action', () => {
  const out = collectNextActions({ impactData: { impacted: [] }, documents: [], sourceIndex: { entries: [] } });
  assert.equal(out.summary.total, 0);
  assert.equal(out.nextBestAction, null);
});