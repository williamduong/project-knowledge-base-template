'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseArgs,
  detectMaintainProposalClass,
  buildMaintainIntentProposal,
  maybeCreateMaintainIntent,
  checkStaleRelease,
  STALE_RELEASE_DAYS,
} = require('../../src/commands/maintain');
const { createIntentWorkspace } = require('../../src/lib/intent');

function makeWorkspace(catalogData) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-maintain-'));
  const kbDir = path.join(root, 'knowledge-base');
  const dotKb = path.join(kbDir, '.kb');
  fs.mkdirSync(dotKb, { recursive: true });

  // Minimal state.json so resolveExistingState succeeds
  fs.writeFileSync(
    path.join(dotKb, 'state.json'),
    JSON.stringify({
      schemaVersion: 1,
      cliVersion: '1.5.0',
      templateVersion: '1.5.0',
      storageMode: 'tracked',
      brandScope: 'test',
      metadataPolicy: 'advisory',
      driftStatus: 'clean',
      ideIntegration: { enabled: false, targets: [] },
    }),
    'utf8'
  );

  if (catalogData !== undefined) {
    fs.writeFileSync(
      path.join(dotKb, 'catalog.json'),
      JSON.stringify(catalogData, null, 2),
      'utf8'
    );
  }

  return { root, kbDir };
}

function daysAgo(n) {
  const d = new Date(Date.now() - n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

test('checkStaleRelease: no catalog file → silent (no throw)', () => {
  const { root } = makeWorkspace();
  assert.doesNotThrow(() => checkStaleRelease({ workspaceRoot: root }));
});

test('checkStaleRelease: catalog with no current → logs warning', () => {
  const { root } = makeWorkspace({
    schemaVersion: 1,
    current: null,
    releases: [],
  });

  const logs = [];
  const orig = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    checkStaleRelease({ workspaceRoot: root });
  } finally {
    console.log = orig;
  }

  assert.ok(logs.some((l) => l.includes('no release tagged yet')));
});

test('checkStaleRelease: release within threshold → no warning', () => {
  const version = 'v1.4.0';
  const { root } = makeWorkspace({
    schemaVersion: 1,
    current: version,
    releases: [
      {
        version,
        released_at: daysAgo(10),
        git_tag: version,
        git_commit: 'abc1234',
        template_version: '1.4.0',
        summary: 'recent release',
        prerelease: false,
        stats: { intents_applied: 0, docs_changed: 0, ad_hoc_commits: 0 },
        intents_applied: [],
      },
    ],
  });

  const logs = [];
  const orig = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    checkStaleRelease({ workspaceRoot: root });
  } finally {
    console.log = orig;
  }

  assert.ok(!logs.some((l) => l.includes('WARNING') && l.includes('days ago')));
});

test(`checkStaleRelease: release > ${STALE_RELEASE_DAYS} days old → logs WARNING with day count`, () => {
  const version = 'v1.3.0';
  const staleAge = STALE_RELEASE_DAYS + 5;
  const { root } = makeWorkspace({
    schemaVersion: 1,
    current: version,
    releases: [
      {
        version,
        released_at: daysAgo(staleAge),
        git_tag: version,
        git_commit: 'def5678',
        template_version: '1.3.0',
        summary: 'old release',
        prerelease: false,
        stats: { intents_applied: 0, docs_changed: 0, ad_hoc_commits: 0 },
        intents_applied: [],
      },
    ],
  });

  const logs = [];
  const orig = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    checkStaleRelease({ workspaceRoot: root });
  } finally {
    console.log = orig;
  }

  const warn = logs.find((l) => l.includes('WARNING') && l.includes('days ago'));
  assert.ok(warn, `Expected stale WARNING but got: ${JSON.stringify(logs)}`);
  assert.ok(warn.includes(version));
});

test('parseArgs: supports observation proposal flags', () => {
  const opts = parseArgs(['--suggest-intent', '--create-intent', '--intent-mode=full', '--json']);
  assert.equal(opts.suggestIntent, true);
  assert.equal(opts.createIntent, true);
  assert.equal(opts.intentMode, 'full');
  assert.equal(opts.json, true);
});

test('parseArgs: rejects unknown intent mode', () => {
  assert.throws(() => parseArgs(['--intent-mode=weird']), /Unknown maintain intent mode/);
});

test('detectMaintainProposalClass: prioritizes reconstruction trigger', () => {
  const proposalClass = detectMaintainProposalClass({
    reconstruction: { triggered: true },
    gateResults: {
      debt: { status: 'warn' },
      entropy: { status: 'warn' },
    },
  });
  assert.equal(proposalClass, 'reconstruction');
});

test('buildMaintainIntentProposal: returns null when gates pass', () => {
  const proposal = buildMaintainIntentProposal({
    gateResults: {
      debt: { status: 'pass', evidence: [] },
      entropy: { status: 'pass', evidence: [] },
    },
    reconstruction: { triggered: false },
    options: { intentMode: 'quick' },
    now: new Date('2026-05-11T00:00:00.000Z'),
  });
  assert.equal(proposal, null);
});

test('buildMaintainIntentProposal: builds debt proposal with scope', () => {
  const proposal = buildMaintainIntentProposal({
    gateResults: {
      debt: {
        status: 'warn',
        evidence: [{ id: 'D01' }],
        recommendedAction: 'Resolve debt',
      },
      entropy: { status: 'pass', evidence: [], recommendedAction: null },
    },
    reconstruction: { triggered: false },
    options: { intentMode: 'quick' },
    now: new Date('2026-05-11T00:00:00.000Z'),
  });
  assert.ok(proposal);
  assert.equal(proposal.intentId, 'maintain-debt-20260511');
  assert.deepEqual(proposal.changeScope, ['debt:D01']);
  assert.equal(proposal.changeType, 'fix');
});

test('maybeCreateMaintainIntent: returns dry proposal when create disabled', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-maintain-proposal-'));
  const contentRoot = path.join(root, 'knowledge-base');
  const result = maybeCreateMaintainIntent({
    contentRoot,
    proposal: {
      intentId: 'maintain-debt-20260511',
      mode: 'quick',
      changeType: 'fix',
      proposalClass: 'debt',
      changeScope: ['debt:D01'],
      decisionSummary: 'Resolve debt',
    },
    shouldCreate: false,
  });
  assert.equal(result.created, false);
  assert.equal(result.reason, 'dry-proposal');
});

test('maybeCreateMaintainIntent: skips duplicate active class', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-maintain-dedupe-'));
  const contentRoot = path.join(root, 'knowledge-base');
  const ws = createIntentWorkspace(contentRoot, {
    intentId: 'maintain-debt-existing',
    mode: 'quick',
    changeType: 'fix',
  });
  const metaPath = path.join(ws, 'intent.md');
  const text = fs.readFileSync(metaPath, 'utf8');
  fs.writeFileSync(metaPath, text.replace(/\n---\s*\n/, '\nmaintain_proposal_class: debt\n---\n'), 'utf8');

  const result = maybeCreateMaintainIntent({
    contentRoot,
    proposal: {
      intentId: 'maintain-debt-20260511',
      mode: 'quick',
      changeType: 'fix',
      proposalClass: 'debt',
      changeScope: ['debt:D01'],
      decisionSummary: 'Resolve debt',
    },
    shouldCreate: true,
  });

  assert.equal(result.created, false);
  assert.equal(result.reason, 'duplicate-active-class');
  assert.equal(result.intentId, 'maintain-debt-existing');
});
