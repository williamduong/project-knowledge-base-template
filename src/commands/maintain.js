const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { performSync } = require('./sync');
const { runTest } = require('./test');
const { runDoctor } = require('./doctor');
const { readCatalog } = require('../lib/catalog');
const { resolveExistingState } = require('../lib/context');
const {
  readDebtIndex,
  readEntropyIndex,
  readLessonsIndex,
  runAllGates,
  evaluateReconstructionTriggers,
} = require('../lib/observation');
const {
  createIntentWorkspace,
  listActiveIntentIds,
  readIntentMeta,
} = require('../lib/intent');

function parseArgs(args) {
  const options = {
    acceptBaseline: false,
    fast: false,
    json: false,
    suggestIntent: false,
    createIntent: false,
    intentMode: 'quick',
  };

  for (const current of args || []) {
    if (current === '--accept-baseline') {
      options.acceptBaseline = true;
      continue;
    }

    if (current === '--fast') {
      options.fast = true;
      continue;
    }

    if (current === '--json') {
      options.json = true;
      continue;
    }

    if (current === '--suggest-intent') {
      options.suggestIntent = true;
      continue;
    }

    if (current === '--create-intent') {
      options.createIntent = true;
      options.suggestIntent = true;
      continue;
    }

    if (current.startsWith('--intent-mode=')) {
      options.intentMode = current.slice('--intent-mode='.length).trim();
      if (options.intentMode !== 'quick' && options.intentMode !== 'full') {
        throw new Error(`Unknown maintain intent mode "${options.intentMode}". Supported: quick, full.`);
      }
      continue;
    }

    throw new Error(`Unknown maintain option \"${current}\".`);
  }

  return options;
}

function hasScript({ workspaceRoot, scriptName }) {
  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const data = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return Boolean(data && data.scripts && data.scripts[scriptName]);
  } catch {
    return false;
  }
}

function runDocGateIfAvailable({ workspaceRoot }) {
  if (!hasScript({ workspaceRoot, scriptName: 'doc:gate' })) {
    console.log('maintain: skip doc:gate (no script found in workspace package.json)');
    return;
  }

  console.log('maintain: running npm run doc:gate');
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['run', 'doc:gate'], {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error('maintain failed: doc:gate returned a non-zero exit code.');
  }
}

function buildIntentIdPrefix(now = new Date()) {
  const y = String(now.getUTCFullYear());
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function detectMaintainProposalClass({ reconstruction, gateResults }) {
  if (reconstruction && reconstruction.triggered) return 'reconstruction';
  const debtWarn = gateResults && gateResults.debt && gateResults.debt.status === 'warn';
  const entropyWarn = gateResults && gateResults.entropy && gateResults.entropy.status === 'warn';
  if (debtWarn && entropyWarn) return 'stabilization';
  if (debtWarn) return 'debt';
  if (entropyWarn) return 'entropy';
  return null;
}

function buildMaintainIntentProposal({ gateResults, reconstruction, options, now = new Date() }) {
  const proposalClass = detectMaintainProposalClass({ reconstruction, gateResults });
  if (!proposalClass) return null;

  const intentId = `maintain-${proposalClass}-${buildIntentIdPrefix(now)}`;
  const debtEvidence = (gateResults.debt && gateResults.debt.evidence) || [];
  const entropyEvidence = (gateResults.entropy && gateResults.entropy.evidence) || [];
  const scope = [
    ...debtEvidence.map((e) => `debt:${e.id}`),
    ...entropyEvidence.map((e) => `entropy:${e.id}`),
  ];

  const summaryParts = [];
  if (reconstruction && reconstruction.triggered) {
    summaryParts.push(reconstruction.rationale);
  }
  if (gateResults.debt && gateResults.debt.status === 'warn') {
    summaryParts.push(gateResults.debt.recommendedAction);
  }
  if (gateResults.entropy && gateResults.entropy.status === 'warn') {
    summaryParts.push(gateResults.entropy.recommendedAction);
  }

  return {
    intentId,
    mode: options.intentMode,
    changeType: proposalClass === 'reconstruction' || proposalClass === 'stabilization' ? 'refactor' : 'fix',
    proposalClass,
    changeScope: scope,
    decisionSummary: summaryParts.filter(Boolean).join(' '),
  };
}

function hasSimilarActiveMaintainIntent(contentRoot, proposalClass) {
  const ids = listActiveIntentIds(contentRoot);
  for (const id of ids) {
    if (!id.startsWith('maintain-')) continue;
    try {
      const meta = readIntentMeta(contentRoot, id);
      const cls = meta.maintain_proposal_class || null;
      if (cls === proposalClass) {
        return { exists: true, intentId: id };
      }
    } catch {
      // Ignore malformed active intent metadata.
    }
  }
  return { exists: false, intentId: null };
}

function maybeCreateMaintainIntent({ contentRoot, proposal, shouldCreate }) {
  if (!proposal) return { created: false, reason: 'no-proposal', intentId: null, workspace: null };
  const dedupe = hasSimilarActiveMaintainIntent(contentRoot, proposal.proposalClass);
  if (dedupe.exists) {
    return {
      created: false,
      reason: 'duplicate-active-class',
      intentId: dedupe.intentId,
      workspace: null,
    };
  }

  if (!shouldCreate) {
    return { created: false, reason: 'dry-proposal', intentId: proposal.intentId, workspace: null };
  }

  const workspace = createIntentWorkspace(contentRoot, {
    intentId: proposal.intentId,
    mode: proposal.mode,
    changeType: proposal.changeType,
  });

  try {
    const metaPath = path.join(workspace, 'intent.md');
    const text = fs.readFileSync(metaPath, 'utf8');
    const insertBlock = [
      `maintain_proposal_class: ${proposal.proposalClass}`,
      `decision_summary: \"${String(proposal.decisionSummary || '').replace(/\"/g, '\\"')}\"`,
      `change_scope: [${proposal.changeScope.map((s) => `\"${s}\"`).join(', ')}]`,
    ].join('\n');
    const next = text.replace(/\n---\s*\n/, `\n${insertBlock}\n---\n`);
    fs.writeFileSync(metaPath, next, 'utf8');
  } catch {
    // Best-effort metadata enrichment; intent workspace is already created.
  }

  return {
    created: true,
    reason: 'created',
    intentId: proposal.intentId,
    workspace,
  };
}

function runMaintain({ args, cwd, packageJson }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);

  console.log(`maintain mode: ${options.fast ? 'fast' : 'full'}`);

  console.log('maintain: running kb sync');
  const syncResult = performSync({
    cwd: workspaceRoot,
    options: { acceptBaseline: options.acceptBaseline },
  });
  console.log(`maintain: sync status = ${syncResult.status}`);
  console.log(`maintain: ${syncResult.message}`);
  if (syncResult.reportPath) {
    console.log(`maintain: report = ${syncResult.reportPath}`);
  }

  if (!options.fast) {
    runDocGateIfAvailable({ workspaceRoot });
  } else {
    console.log('maintain: fast mode skips doc:gate for quicker feedback.');
  }

  console.log(`maintain: running kbx test ${options.fast ? '(sample)' : '--all'}`);
  runTest({ args: options.fast ? [] : ['--all'], cwd: workspaceRoot });

  console.log(`maintain: running kbx doctor ${options.fast ? '' : '--strict'}`.trim());
  runDoctor({
    args: options.fast ? [] : ['--strict'],
    cwd: workspaceRoot,
    packageJson,
  });

  let observation = null;
  let intentProposal = null;
  let intentAction = null;
  try {
    const context = resolveExistingState({ workspaceRoot });
    const { items: debtItems } = readDebtIndex(context.contentRoot);
    const { items: entropyItems } = readEntropyIndex(context.contentRoot);
    const { items: lessonItems } = readLessonsIndex(context.contentRoot);
    const { gateResults, overallStatus } = runAllGates({ debtItems, entropyItems, lessonItems });
    const reconstruction = evaluateReconstructionTriggers(gateResults);
    observation = {
      overallStatus,
      debtCount: debtItems.length,
      entropyCount: entropyItems.length,
      lessonCount: lessonItems.length,
      gateResults,
      reconstruction,
    };

    if (options.suggestIntent) {
      intentProposal = buildMaintainIntentProposal({ gateResults, reconstruction, options });
      intentAction = maybeCreateMaintainIntent({
        contentRoot: context.contentRoot,
        proposal: intentProposal,
        shouldCreate: options.createIntent,
      });
    }
  } catch (err) {
    console.log(`maintain: observation phase skipped (${err.message})`);
  }

  if (observation) {
    console.log(`maintain: observation gates = ${observation.overallStatus}`);
    if (observation.reconstruction && observation.reconstruction.triggered) {
      console.log(`maintain: reconstruction trigger = ${observation.reconstruction.triggers.join(', ')}`);
    }
  }

  if (intentAction && intentAction.created) {
    console.log(`maintain: created intent ${intentAction.intentId}`);
    console.log(`maintain: workspace = ${intentAction.workspace}`);
  } else if (intentAction && intentAction.reason === 'duplicate-active-class') {
    console.log(`maintain: skip creating intent (existing active class intent: ${intentAction.intentId})`);
  } else if (intentAction && intentAction.reason === 'dry-proposal' && intentProposal) {
    console.log(`maintain: intent proposal ready (${intentProposal.intentId})`);
  }

  checkStaleRelease({ workspaceRoot });

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx maintain',
      mode: options.fast ? 'fast' : 'full',
      observation,
      intentProposal,
      intentAction,
    }, null, 2));
  }

  console.log('maintain: completed');
}

const STALE_RELEASE_DAYS = 30;

function checkStaleRelease({ workspaceRoot }) {
  let context;
  try {
    context = resolveExistingState({ workspaceRoot });
  } catch (_err) {
    return; // no KB state — skip silently
  }

  let catalog;
  try {
    catalog = readCatalog(context.contentRoot);
  } catch (_err) {
    return; // catalog unreadable — non-fatal
  }

  if (!catalog || !catalog.current) {
    console.log('maintain: WARNING: no release tagged yet in catalog. Consider running: kbx release tag <version>');
    return;
  }

  const currentEntry = (catalog.releases || []).find((r) => r.version === catalog.current);
  if (!currentEntry || !currentEntry.released_at) return;

  const releasedMs = Date.parse(currentEntry.released_at);
  if (!Number.isFinite(releasedMs)) return;

  const daysSince = Math.floor((Date.now() - releasedMs) / 86_400_000);
  if (daysSince > STALE_RELEASE_DAYS) {
    console.log(`maintain: WARNING: current release ${catalog.current} was tagged ${daysSince} days ago (>${STALE_RELEASE_DAYS}d). Consider running: kbx release tag <version>`);
  }
}

module.exports = {
  parseArgs,
  buildMaintainIntentProposal,
  maybeCreateMaintainIntent,
  detectMaintainProposalClass,
  runMaintain,
  checkStaleRelease,
  STALE_RELEASE_DAYS,
};
