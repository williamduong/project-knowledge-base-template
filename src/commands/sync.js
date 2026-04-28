const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { getGitDiffNameStatus, getGitLogRange, getGitMetadata, getWorkingTreeStatus } = require('../lib/git');
const { persistStateAndRender, readStateFile } = require('../lib/state');
const {
  buildDocumentIndex,
  mapDiffToDocuments,
  parseDiffNameStatus,
  updateFinalizationQueue,
} = require('../lib/kb-analysis');

function parseArgs(args) {
  const options = {
    acceptBaseline: false,
  };

  for (const current of args) {
    if (current === '--accept-baseline') {
      options.acceptBaseline = true;
      continue;
    }

    throw new Error(`Unknown sync option \"${current}\".`);
  }

  return options;
}

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowTimestampForFile() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
}

function getReportsDirectory(context) {
  if (context.mode === 'private-git') {
    return path.join(path.dirname(context.statePath), 'reports');
  }

  return path.join(path.dirname(context.statePath), 'reports');
}

function writeSyncReport({ reportPath, state, git, logRange, diffNameStatus, mappedDocs, dirtyEntries }) {
  let mappingSection = 'No source_of_truth mappings matched changed files.\n';
  if (mappedDocs && mappedDocs.length > 0) {
    const lines = mappedDocs.map((item, index) => {
      const paths = item.matches.map((match) => match.filePath).slice(0, 5).join(', ');
      return `${index + 1}. ${item.document.relativePath} (matches: ${item.matches.length}) -> ${paths}`;
    });

    mappingSection = `${lines.join('\n')}\n`;
  }

  const report = `# KB Sync Report

- Generated At: ${new Date().toISOString()}
- Brand Scope: ${state.brandScope}
- Storage Mode: ${state.storageMode}
- Baseline: ${state.sourceRepositoryGitBaseline}
- Current HEAD: ${git.head || 'NOT_AVAILABLE'}
- Branch: ${git.branch || 'NOT_AVAILABLE'}
- Repository: ${git.originUrl || state.sourceRepositoryIdentifier}
- Uncommitted Changes: ${dirtyEntries.length}

## Diff Name Status

\`\`\`
${diffNameStatus || 'No diff output available.'}
\`\`\`

## Working Tree Status

\`\`\`
${dirtyEntries.map((entry) => entry.raw).join('\n') || 'No uncommitted changes.'}
\`\`\`

## source_of_truth Mapping

${mappingSection}

## Git Log Range

\`\`\`
${logRange || 'No log output available.'}
\`\`\`
`;

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report, 'utf8');
}

function performSync({ cwd, options }) {
  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });
  const state = readStateFile({ statePath: context.statePath });
  const git = getGitMetadata(workspaceRoot);
  const dirtyEntries = git.isGitRepo ? getWorkingTreeStatus(workspaceRoot) : [];
  const today = nowDate();

  state.lastDriftCheckAt = today;

  if (!git.isGitRepo) {
    state.driftStatus = 'unknown';
    state.notes = 'Sync ran without git metadata; baseline remains unchanged.';

    persistStateAndRender({
      statePath: context.statePath,
      renderedRevisionStatePath: context.renderedRevisionStatePath,
      state,
    });

    return {
      status: 'WARN',
      message: 'Workspace is not a git repository. Sync updated check timestamp only.',
      context,
      state,
    };
  }

  const baseline = state.sourceRepositoryGitBaseline;
  const head = git.head;

  if (!baseline || baseline === 'NOT_AVAILABLE') {
    state.driftStatus = 'unknown';
    state.notes = `Sync detected git metadata but no baseline is set. Current HEAD: ${head}.`;

    persistStateAndRender({
      statePath: context.statePath,
      renderedRevisionStatePath: context.renderedRevisionStatePath,
      state,
    });

    return {
      status: 'WARN',
      message: 'Baseline is NOT_AVAILABLE. Run sync with --accept-baseline after review.',
      context,
      state,
    };
  }

  state.sourceDefaultBranch = git.branch || state.sourceDefaultBranch;
  state.sourceRepositoryIdentifier = git.originUrl || state.sourceRepositoryIdentifier;

  if (baseline === head) {
    if (dirtyEntries.length > 0) {
      state.driftStatus = 'drift-detected';
      state.notes = `Baseline matches HEAD but working tree has ${dirtyEntries.length} uncommitted change(s).`;

      persistStateAndRender({
        statePath: context.statePath,
        renderedRevisionStatePath: context.renderedRevisionStatePath,
        state,
      });

      return {
        status: 'WARN',
        message: `Baseline matches HEAD, but working tree has ${dirtyEntries.length} uncommitted change(s).`,
        context,
        state,
      };
    }

    state.driftStatus = 'aligned';
    state.notes = 'Sync confirmed baseline is aligned with current HEAD and clean working tree.';

    persistStateAndRender({
      statePath: context.statePath,
      renderedRevisionStatePath: context.renderedRevisionStatePath,
      state,
    });

    return {
      status: 'PASS',
      message: 'Baseline is aligned with HEAD.',
      context,
      state,
    };
  }

  const logRange = getGitLogRange(workspaceRoot, baseline, 'HEAD');
  const diffNameStatus = getGitDiffNameStatus(workspaceRoot, baseline, 'HEAD');
  const diffRows = parseDiffNameStatus(diffNameStatus);
  const docs = buildDocumentIndex({ contentRoot: context.contentRoot, workspaceRoot });
  const mappedDocs = mapDiffToDocuments({ diffRows, documents: docs });
  const reportsDirectory = getReportsDirectory(context);
  const reportPath = path.join(reportsDirectory, `sync-report-${nowTimestampForFile()}.md`);

  writeSyncReport({ reportPath, state, git, logRange, diffNameStatus, mappedDocs, dirtyEntries });

  const queueUpdate = updateFinalizationQueue({
    contentRoot: context.contentRoot,
    mappedDocs,
    baseline,
    head,
    date: today,
  });

  state.driftStatus = options.acceptBaseline ? 'aligned' : 'drift-detected';
  state.notes = options.acceptBaseline
    ? `Sync accepted baseline update after report review. Report: ${reportPath}`
    : `Sync detected drift. Review report before reconciliation: ${reportPath}`;

  if (queueUpdate.updated) {
    state.notes += ` Queue updated: ${queueUpdate.queuePath}`;
  }

  if (options.acceptBaseline) {
    state.sourceRepositoryGitBaseline = head;
    state.baselineCapturedAt = today;
    state.kbPatchRevision = Number(state.kbPatchRevision || 0) + 1;
  }

  persistStateAndRender({
    statePath: context.statePath,
    renderedRevisionStatePath: context.renderedRevisionStatePath,
    state,
  });

  return {
    status: options.acceptBaseline ? 'PASS' : 'WARN',
    message: options.acceptBaseline
      ? `Drift report generated and baseline updated to ${head}.`
      : 'Drift detected. Report generated and state updated; baseline unchanged.',
    context,
    state,
    reportPath,
    queueUpdate,
  };
}

function runSync({ args, cwd }) {
  const options = parseArgs(args);
  const result = performSync({ cwd, options });

  console.log(`sync: ${result.status}`);
  console.log(result.message);
  if (result.reportPath) {
    console.log(`Report: ${result.reportPath}`);
  }

  if (result.queueUpdate && result.queueUpdate.updated) {
    console.log(`Queue updated: ${result.queueUpdate.queuePath}`);
  }
}

module.exports = {
  performSync,
  runSync,
};