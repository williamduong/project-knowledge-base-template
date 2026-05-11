const fs = require('fs');
const path = require('path');

const { detectKbArtifacts } = require('../lib/kb-presence');
const { resolveExistingState } = require('../lib/context');
const { readStateFile } = require('../lib/state');
const { getWorkingTreeStatus } = require('../lib/git');
const {
  computeImpact,
  contentRootRelativeToWorkspace,
  readImpactFile,
  writeImpactFile,
} = require('../lib/impact');
const { normalizePath } = require('../lib/binding-matcher');
const { buildGraph, findRecursiveImpact } = require('../lib/impact-graph');
const { loadConfig, getConfigValue } = require('../lib/config');
const { readCatalog } = require('../lib/catalog');
const { pipelineFilePath, readPipeline } = require('../lib/pipeline');
const { getActiveIntentsSummary } = require('../lib/intent');
const {
  readDebtIndex,
  readEntropyIndex,
  readLessonsIndex,
  summariseDebt,
  summariseEntropy,
  summariseLessons,
  runAllGates,
  evaluateReconstructionTriggers,
  computeChaosCoefficient,
  readChaosHistory,
  compareChaosSnapshots,
} = require('../lib/observation');

const KNOWN_PIPELINE_TEMPLATES = new Set(['npm-package', 'docs-only', 'custom']);

function parseArgs(args) {
  const options = { json: false, quiet: false, noScan: false };
  for (const arg of args || []) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--quiet') {
      options.quiet = true;
      continue;
    }
    if (arg === '--no-scan') {
      options.noScan = true;
      continue;
    }
    throw new Error(`Unknown status option "${arg}". Supported: --json, --quiet, --no-scan`);
  }
  return options;
}

function relPath(target, root) {
  if (!target) return '';
  const rel = path.relative(root, target).replace(/\\/g, '/');
  return rel || '.';
}

function partitionWorkingTree(workingTree, contentRootRel) {
  const prefix = contentRootRel ? `${contentRootRel.replace(/\/+$/, '')}/` : null;
  const kbDirty = [];
  const codeDirty = [];
  for (const entry of workingTree || []) {
    const p = normalizePath(entry.filePath);
    if (prefix && (p === contentRootRel || p.startsWith(prefix))) {
      kbDirty.push({ status: entry.status, path: p });
    } else {
      codeDirty.push({ status: entry.status, path: p });
    }
  }
  return { kbDirty, codeDirty };
}

/**
 * Pure verdict derivation. Combines presence, state, impact, and working tree.
 *
 * Verdicts (per plan v1.3 Section 4 Phase 2):
 * - clean     : no impacted docs, no uncommitted KB changes, state OK
 * - attention : impacted/unbound/uncommitted-KB present
 * - blocked   : presence partial, state error, or impact skipped (no baseline / not git)
 *
 * Note: uncommitted *code* changes (outside contentRoot) do NOT trigger attention —
 * they are normal during development. Plan locks this behaviour intentionally.
 */
function deriveStatusVerdict({ presence, stateError, impactData, kbDirty }) {
  if (presence === 'partial') {
    return { code: 2, label: 'blocked', reasons: ['kb-partial'] };
  }
  if (stateError) {
    return { code: 2, label: 'blocked', reasons: ['state-error'] };
  }
  if (presence === 'fresh') {
    return { code: 0, label: 'clean', reasons: ['no-kb'] };
  }
  if (impactData && impactData.skipped_reason) {
    return { code: 2, label: 'blocked', reasons: [impactData.skipped_reason] };
  }

  const reasons = [];
  if (impactData) {
    if ((impactData.impacted || []).length > 0) reasons.push('impacted-docs');
    if ((impactData.unbound_changes || []).length > 0) reasons.push('unbound-changes');
  }
  if ((kbDirty || []).length > 0) reasons.push('kb-uncommitted');

  if (reasons.length === 0) {
    return { code: 0, label: 'clean', reasons: [] };
  }
  return { code: 1, label: 'attention', reasons };
}

function detectPipelineTemplate(rawText) {
  const text = String(rawText || '');
  const match = text.match(/Release pipeline template:\s*([A-Za-z0-9_-]+)/i);
  if (!match) return 'custom';
  const name = String(match[1] || '').trim().toLowerCase();
  if (!name) return 'custom';
  if (KNOWN_PIPELINE_TEMPLATES.has(name)) return name;
  return 'custom';
}

function getReleasePipelineState(contentRoot) {
  if (!contentRoot) {
    return {
      configured: false,
      template: null,
      filePath: null,
      valid: null,
      error: null,
    };
  }

  const filePath = pipelineFilePath(contentRoot);
  if (!fs.existsSync(filePath)) {
    return {
      configured: false,
      template: null,
      filePath,
      valid: null,
      error: null,
    };
  }

  let rawText = '';
  try {
    rawText = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return {
      configured: true,
      template: 'custom',
      filePath,
      valid: false,
      error: `Unable to read pipeline file: ${err.message}`,
    };
  }

  const template = detectPipelineTemplate(rawText);

  try {
    readPipeline(contentRoot, { required: true, filePath });
    return {
      configured: true,
      template,
      filePath,
      valid: true,
      error: null,
    };
  } catch (err) {
    return {
      configured: true,
      template,
      filePath,
      valid: false,
      error: err.message,
    };
  }
}

function runStatus({ args, cwd, packageJson }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const artifacts = detectKbArtifacts(workspaceRoot);

  let context = null;
  let state = null;
  let stateError = null;
  try {
    context = resolveExistingState({ workspaceRoot });
  } catch (err) {
    stateError = err.message;
  }
  if (context) {
    try {
      state = readStateFile({ statePath: context.statePath });
    } catch (err) {
      stateError = `State file unreadable: ${err.message}`;
    }
  }

  const presence = artifacts.classification; // 'fresh' | 'healthy' | 'partial'

  // Impact + working tree (only meaningful when KB is healthy and accessible)
  let impactData = null;
  let impactPath = null;
  let impactError = null;
  let kbDirty = [];
  let codeDirty = [];

  if (context && state && presence === 'healthy') {
    try {
      if (options.noScan) {
        impactData = readImpactFile(context.contentRoot);
      } else {
        impactData = computeImpact({ workspaceRoot, ctx: context });
        impactPath = writeImpactFile(context.contentRoot, impactData);
      }
    } catch (err) {
      impactError = err.message;
    }

    const workingTree = getWorkingTreeStatus(workspaceRoot);
    const contentRootRel = contentRootRelativeToWorkspace(workspaceRoot, context.contentRoot);
    const partition = partitionWorkingTree(workingTree, contentRootRel);
    kbDirty = partition.kbDirty;
    codeDirty = partition.codeDirty;
  }

  // Recursive impact summary (additive — no breaking change to impact.json on disk).
  let recursiveImpact = null;
  if (context && impactData && !impactData.skipped_reason) {
    const roots = (impactData.impacted || []).map((it) => it.doc);
    if (roots.length > 0) {
      try {
        const cfg = loadConfig(context.contentRoot);
        const depth = getConfigValue(cfg, 'impact.defaultDepth', 2);
        const { graph } = buildGraph({ contentRoot: context.contentRoot });
        const map = findRecursiveImpact({ graph, roots, depth });
        recursiveImpact = { depth, count: map.size };
      } catch (_err) {
        recursiveImpact = { depth: null, count: null, error: _err.message };
      }
    } else {
      recursiveImpact = { depth: null, count: 0 };
    }
  }

  // Catalog — current release line
  let catalogData = null;
  if (context && presence === 'healthy') {
    try {
      catalogData = readCatalog(context.contentRoot);
    } catch (_err) {
      // catalog missing or invalid — non-fatal
    }
  }

  let releasePipeline = null;
  if (context && presence === 'healthy') {
    releasePipeline = getReleasePipelineState(context.contentRoot);
  }

  // Active intents summary
  let activeIntents = null;
  if (context && presence === 'healthy') {
    try {
      activeIntents = getActiveIntentsSummary(context.contentRoot);
    } catch (_err) {
      // non-fatal — intents folder may not exist yet
    }
  }

  // Observation summary (detection-only, non-fatal)
  let observationSummary = null;
  if (context && presence === 'healthy') {
    try {
      const { items: debtItems } = readDebtIndex(context.contentRoot);
      const { items: entropyItems } = readEntropyIndex(context.contentRoot);
      const { items: lessonItems } = readLessonsIndex(context.contentRoot);
      const debtSummary = summariseDebt(debtItems);
      const entropySummary = summariseEntropy(entropyItems);
      const lessonSummary = summariseLessons(lessonItems);
      const { gateResults, overallStatus } = runAllGates({ debtItems, entropyItems, lessonItems });
      const reconstruction = evaluateReconstructionTriggers(gateResults);
      const chaosResult = computeChaosCoefficient({ debtItems, entropyItems, lessonItems });
      const { snapshots } = readChaosHistory(context.contentRoot);
      const previousSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
      const chaosTrend = compareChaosSnapshots(chaosResult, previousSnapshot);
      observationSummary = { debtSummary, entropySummary, lessonSummary, overallStatus, reconstruction, chaosResult, chaosTrend };
    } catch (_err) {
      // non-fatal — observation files may not exist yet
    }
  }

  const verdict = deriveStatusVerdict({ presence, stateError, impactData, kbDirty });

  if (options.quiet) {
    console.log(verdict.label);
    if (verdict.code !== 0) process.exit(verdict.code);
    return;
  }

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx status',
      cliVersion: packageJson && packageJson.version,
      workspaceRoot,
      presence,
      artifacts,
      state: state ? {
        schemaVersion: state.schemaVersion,
        cliVersion: state.cliVersion,
        templateVersion: state.templateVersion,
        storageMode: state.storageMode,
        brandScope: state.brandScope,
        metadataPolicy: state.metadataPolicy,
        ideIntegration: state.ideIntegration,
        driftStatus: state.driftStatus,
        sourceRepositoryGitBaseline: state.sourceRepositoryGitBaseline,
      } : null,
      stateError,
      impact: impactData,
      impactPath,
      impactError,
      recursiveImpact,
      workingTree: { kbDirty, codeDirty },
      currentRelease: catalogData ? catalogData.current : null,
      releasePipeline,
      activeIntents,
      observation: observationSummary,
      verdict,    }, null, 2));
    if (verdict.code !== 0) process.exit(verdict.code);
    return;
  }

  // Human-readable
  console.log('kbx status');
  console.log(`- workspace: ${workspaceRoot}`);
  console.log(`- presence : ${presence}`);
  console.log('- artifacts:');
  console.log(`    knowledge-base/                           : ${artifacts.kbDir ? 'yes' : 'no'}`);
  console.log(`    .github/agents/kbx.agent.md               : ${artifacts.agentFile ? 'yes' : 'no'}`);
  console.log(`    .github/prompts/kbx-plan|kbx-run.prompt.md: ${artifacts.promptFile ? 'yes' : 'no'}`);
  console.log(`    knowledge-base/.kb/state.json (or .git/project-kb): ${artifacts.stateFile ? 'yes' : 'no'}`);

  if (presence === 'partial') {
    console.log('');
    console.log('WARNING: KB state appears partial or corrupted.');
    console.log('Other KB artifacts exist but state.json is missing or invalid.');
    console.log('Do NOT run "kbx init" — it would overwrite existing KB content.');
    console.log('Recover with one of:');
    console.log('  1. git checkout HEAD -- knowledge-base/.kb/state.json');
    console.log('  2. kbx uninstall --force   then   kbx init --yes   (clean reinstall)');
    console.log('');
    console.log(`verdict: ${verdict.label}${verdict.reasons.length ? ` (${verdict.reasons.join(', ')})` : ''}`);
    if (verdict.code !== 0) process.exit(verdict.code);
    return;
  }

  if (presence === 'fresh') {
    console.log('');
    console.log('No KB detected in this workspace. Run: kbx init');
    console.log('');
    console.log(`verdict: ${verdict.label}`);
    return;
  }

  if (state) {
    console.log('- state:');
    console.log(`    schemaVersion   : ${state.schemaVersion}`);
    console.log(`    cliVersion      : ${state.cliVersion}`);
    console.log(`    templateVersion : ${state.templateVersion}`);
    console.log(`    storageMode     : ${state.storageMode}`);
    console.log(`    brandScope      : ${state.brandScope}`);
    console.log(`    metadataPolicy  : ${state.metadataPolicy}`);
    console.log(`    ideIntegration  : enabled=${state.ideIntegration && state.ideIntegration.enabled}, targets=${(state.ideIntegration && state.ideIntegration.targets || []).length}`);
    console.log(`    driftStatus     : ${state.driftStatus}`);
    if (context && context.contentRoot) {
      console.log(`    contentRoot     : ${relPath(context.contentRoot, workspaceRoot)}`);
    }
  } else if (stateError) {
    console.log(`- state error: ${stateError}`);
  }

  // Current release (from catalog)
  if (catalogData && catalogData.current) {
    const currentEntry = (catalogData.releases || []).find((r) => r.version === catalogData.current);
    const releasedAt = currentEntry ? currentEntry.released_at : '';
    console.log(`- current release: ${catalogData.current}${releasedAt ? ` (released ${releasedAt})` : ''}`);
  } else if (catalogData) {
    console.log('- current release: (none tagged yet — run: kbx release tag <version>)');
  }

  if (releasePipeline && releasePipeline.configured) {
    const invalidTag = releasePipeline.valid === false ? ', invalid' : '';
    console.log(`- release pipeline: configured (${releasePipeline.template}${invalidTag})`);
    if (releasePipeline.valid === false && releasePipeline.error) {
      console.log(`    pipeline error: ${releasePipeline.error}`);
    }
  } else if (releasePipeline) {
    console.log('- release pipeline: not configured');
  }

  // Impact section
  console.log('- impact:');
  if (impactError) {
    console.log(`    error: ${impactError}`);
  } else if (!impactData) {
    console.log(`    (no impact data; run "kbx scan" to refresh)`);
  } else if (impactData.skipped_reason) {
    console.log(`    skipped: ${impactData.skipped_reason}`);
  } else {
    console.log(`    baseline       : ${impactData.baseline || 'NOT_AVAILABLE'}`);
    console.log(`    head           : ${impactData.head || 'NOT_AVAILABLE'}`);
    console.log(`    impacted docs  : ${impactData.impacted.length}`);
    for (const item of impactData.impacted.slice(0, 5)) {
      console.log(`      - ${item.doc} (${item.matched_changes.length} match)`);
    }
    if (impactData.impacted.length > 5) {
      console.log(`      ... +${impactData.impacted.length - 5} more`);
    }
    console.log(`    unbound changes: ${impactData.unbound_changes.length}`);
    console.log(`    KB self-edits  : ${impactData.self_edits.length}`);
    if (recursiveImpact && recursiveImpact.count !== null && recursiveImpact.depth !== null) {
      console.log(`    recursive impact: ${recursiveImpact.count} doc(s) (depth ${recursiveImpact.depth}, related_strong only)`);
    } else if (recursiveImpact && recursiveImpact.error) {
      console.log(`    recursive impact: error (${recursiveImpact.error})`);
    }
    if (options.noScan) {
      console.log(`    (data from cached impact.json; omit --no-scan to refresh)`);
    }
  }

  // Working tree
  console.log('- working tree:');
  console.log(`    KB uncommitted   : ${kbDirty.length}`);
  for (const entry of kbDirty.slice(0, 5)) {
    console.log(`      - [${entry.status || '??'}] ${entry.path}`);
  }
  if (kbDirty.length > 5) {
    console.log(`      ... +${kbDirty.length - 5} more`);
  }
  console.log(`    code uncommitted : ${codeDirty.length}`);

  console.log('');

  // Active intents
  if (activeIntents) {
    console.log(`- active intents: ${activeIntents.count}`);
    for (const intent of activeIntents.intents.slice(0, 5)) {
      const warn = intent.has_warnings ? ' [!]' : '';
      console.log(`    ${intent.id} (${intent.mode || '?'}, ${intent.staged_count} staged${warn})`);
    }
    if (activeIntents.intents.length > 5) {
      console.log(`    ... +${activeIntents.intents.length - 5} more`);
    }
  }

  // Observation summary
  if (observationSummary) {
    console.log('- observation:');
    const { debtSummary, entropySummary, lessonSummary, overallStatus, reconstruction, chaosResult, chaosTrend } = observationSummary;
    console.log(`    debt    : total=${debtSummary.total}, open=${debtSummary.openCount}, high=${debtSummary.byTier.high}, red=${debtSummary.byTier.red}`);
    console.log(`    entropy : total=${entropySummary.total}, open=${entropySummary.openCount}, high=${entropySummary.byTier.high}, red=${entropySummary.byTier.red}`);
    console.log(`    lessons : total=${lessonSummary.total}, enforced=${lessonSummary.byStatus.enforced || 0}`);
    console.log(`    gates   : ${overallStatus}`);
    if (chaosResult) {
      const trendStr = chaosTrend && chaosTrend.hasPrevious
        ? ` (${chaosTrend.delta >= 0 ? '+' : ''}${chaosTrend.delta}${chaosTrend.spikeDetected ? ' SPIKE' : ''})`
        : '';
      console.log(`    chaos   : ${chaosResult.score.toFixed(1)} / 100  [${chaosResult.level.toUpperCase()}]${trendStr}  — run "kbx chaos" for full report`);
    }
    if (reconstruction.triggered) {
      console.log(`    RECONSTRUCTION TRIGGER: ${reconstruction.triggers.join(', ')}`);
      console.log(`    ${reconstruction.rationale}`);
    }
  }

  console.log('');
  console.log(`verdict: ${verdict.label}${verdict.reasons.length ? ` (${verdict.reasons.join(', ')})` : ''}`);

  if (verdict.code !== 0) process.exit(verdict.code);
}

module.exports = {
  detectPipelineTemplate,
  deriveStatusVerdict,
  getReleasePipelineState,
  partitionWorkingTree,
  runStatus,
};
