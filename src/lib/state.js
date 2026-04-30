const fs = require('fs');
const path = require('path');

function createInitialState({ packageVersion, templateVersion, mode, workspaceRoot, brandScope, gitMetadata, storagePaths }) {
  const today = new Date().toISOString().slice(0, 10);
  const baseline = gitMetadata.head || 'NOT_AVAILABLE';
  const branch = gitMetadata.branch || 'NOT_AVAILABLE';
  const repoIdentifier = gitMetadata.originUrl || 'NOT_SET';
  const driftStatus = gitMetadata.head ? 'aligned' : 'unknown';
  const baselineCapturedAt = gitMetadata.head ? today : 'NOT_AVAILABLE';
  const lastDriftCheckAt = gitMetadata.head ? today : 'NOT_AVAILABLE';
  const baselineScope = gitMetadata.head ? `whole repository on ${branch}` : 'workspace without git baseline';
  const notes = gitMetadata.head
    ? 'Initialized by kb init against the current repository HEAD.'
    : 'Initialized without git metadata. Replace placeholders after git is available.';

  return {
    schemaVersion: 2,
    cliVersion: packageVersion,
    templateVersion,
    kbPatchRevision: 0,
    versionLineage: templateVersion,
    storageMode: mode,
    brandScope,
    workspaceRoot,
    contentRoot: storagePaths.contentRoot,
    visibleMountPath: storagePaths.visibleMountPath,
    sourceRepositoryIdentifier: repoIdentifier,
    sourceDefaultBranch: branch,
    sourceRepositoryGitBaseline: baseline,
    baselineCapturedAt,
    lastDriftCheckAt,
    driftStatus,
    baselineScope,
    lastReconciledTemplateVersion: templateVersion,
    notes,
    metadataPolicy: 'advisory',
    ideIntegration: {
      enabled: false,
      targets: [],
    },
  };
}

function writeStateFile({ statePath, state }) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

function readStateFile({ statePath }) {
  if (!fs.existsSync(statePath)) {
    throw new Error(`State file not found: ${statePath}`);
  }

  const raw = fs.readFileSync(statePath, 'utf8');
  const parsed = JSON.parse(raw);
  return migrateState(parsed);
}

function migrateState(state) {
  if (!state || typeof state !== 'object') return state;
  let changed = false;
  if (typeof state.metadataPolicy !== 'string') {
    state.metadataPolicy = 'advisory';
    changed = true;
  }
  if (!state.ideIntegration || typeof state.ideIntegration !== 'object') {
    state.ideIntegration = { enabled: false, targets: [] };
    changed = true;
  } else {
    if (typeof state.ideIntegration.enabled !== 'boolean') {
      state.ideIntegration.enabled = false;
      changed = true;
    }
    if (!Array.isArray(state.ideIntegration.targets)) {
      state.ideIntegration.targets = [];
      changed = true;
    }
  }
  if (changed && (typeof state.schemaVersion !== 'number' || state.schemaVersion < 2)) {
    state.schemaVersion = 2;
  }
  return state;
}

function renderRevisionStateMarkdown(state) {
  const today = new Date().toISOString().slice(0, 10);
  const stateFilePath = state.storageMode === 'private-git' ? '.git/project-kb/state.json' : 'knowledge-base/.kb/state.json';

  return `---
title: Repository Revision State
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: self-referential
last_updated: ${today}
last_verified: ${today}
related:
  - how-to-use-this-kb.md
  - finalization-plan.md
  - ../12-ai-skills/agent-operating-manual.md
  - ../12-ai-skills/prompt-pack.md
  - ../15-governance/review-cadence.md
  - ../15-governance/verification-policy.md
  - ../15-governance/template-versioning-policy.md
tags:
  - git
  - revision
  - drift
  - maintenance
---

# Repository Revision State

Stores the last repository baseline that agents used when they verified, upgraded, or synchronized this knowledge base.

## Version Identity

| Field | Value |
|---|---|
| KB Template Version | ${state.templateVersion} |
| KB Patch Revision | ${state.kbPatchRevision} |
| Version Lineage | ${state.versionLineage} |
| Brand Scope | ${state.brandScope} |
| Source Repository Identifier | ${state.sourceRepositoryIdentifier} |
| Source Default Branch | ${state.sourceDefaultBranch} |

For downstream project use, the Brand Scope field should identify the product or brand boundary inside which commit comparison is valid. Do not compare commits across unrelated brands or repositories.

## Current Baseline

| Field | Value |
|---|---|
| Source Repository Git Baseline | ${state.sourceRepositoryGitBaseline} |
| Baseline Captured At | ${state.baselineCapturedAt} |
| Last Drift Check At | ${state.lastDriftCheckAt} |
| Drift Status | ${state.driftStatus} |
| Baseline Scope | ${state.baselineScope} |
| Last Reconciled Template Version | ${state.lastReconciledTemplateVersion} |
| Notes | ${state.notes} |

## Machine State

| Field | Value |
|---|---|
| CLI Version | ${state.cliVersion} |
| Storage Mode | ${state.storageMode} |
| State File | ${stateFilePath} |
| Content Root | ${state.contentRoot} |
| Visible Mount Path | ${state.visibleMountPath} |

## Mandatory Agent Check

Before broad maintenance, migration, upgrade, or repo-wide edits:

1. Read this file.
2. If the repository is not under git, keep placeholders explicit and do not invent a revision baseline.
3. If the repository is under git, resolve the current HEAD revision within the recorded brand and repository scope.
4. Compare HEAD with Source Repository Git Baseline.
5. If they differ, review git history from the stored baseline to HEAD before trusting KB freshness.
6. If template version changed since the last reconciliation, run the version patch flow as part of the same maintenance pass.
`;
}

function persistStateAndRender({ statePath, renderedRevisionStatePath, state }) {
  writeStateFile({ statePath, state });
  const markdown = renderRevisionStateMarkdown(state);
  fs.mkdirSync(path.dirname(renderedRevisionStatePath), { recursive: true });
  fs.writeFileSync(renderedRevisionStatePath, markdown, 'utf8');
}

module.exports = {
  createInitialState,
  persistStateAndRender,
  readStateFile,
  renderRevisionStateMarkdown,
  writeStateFile,
  migrateState,
};