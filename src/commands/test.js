const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { readStateFile } = require('../lib/state');
const { getGitMetadata, getWorkingTreeStatus } = require('../lib/git');
const { buildDocumentIndex } = require('../lib/kb-analysis');

function parseArgs(args) {
  const options = {
    sample: 5,
    all: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === '--sample') {
      const value = Number(args[index + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error('test --sample requires a positive number.');
      }

      options.sample = Math.floor(value);
      index += 1;
      continue;
    }

    if (current === '--all') {
      options.all = true;
      continue;
    }

    throw new Error(`Unknown test option \"${current}\".`);
  }

  return options;
}

function sampleArray(items, count) {
  if (items.length <= count) {
    return [...items];
  }

  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = temp;
  }

  return copy.slice(0, count);
}

function runTest({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });
  const state = readStateFile({ statePath: context.statePath });
  const git = getGitMetadata(workspaceRoot);
  const dirtyEntries = git.isGitRepo ? getWorkingTreeStatus(workspaceRoot) : [];
  const docs = buildDocumentIndex({ contentRoot: context.contentRoot, workspaceRoot });

  const failures = [];
  const warnings = [];

  if (!fs.existsSync(context.contentRoot)) {
    failures.push(`Missing content root: ${context.contentRoot}`);
  }

  if (!fs.existsSync(context.renderedRevisionStatePath)) {
    failures.push(`Missing rendered revision-state markdown: ${context.renderedRevisionStatePath}`);
  }

  if (state.storageMode !== context.mode) {
    warnings.push(`Storage mode mismatch (state=${state.storageMode}, discovered=${context.mode}).`);
  }

  if (git.isGitRepo) {
    if (!state.sourceRepositoryGitBaseline || state.sourceRepositoryGitBaseline === 'NOT_AVAILABLE') {
      warnings.push('Source baseline is NOT_AVAILABLE while workspace has git metadata.');
    } else if (git.head !== state.sourceRepositoryGitBaseline) {
      warnings.push(`Git HEAD differs from baseline (${state.sourceRepositoryGitBaseline} -> ${git.head}).`);
    }

    if (dirtyEntries.length > 0) {
      warnings.push(`Working tree has ${dirtyEntries.length} uncommitted change(s).`);
    }
  }

  if (docs.length === 0) {
    warnings.push('No markdown files found in KB content root.');
  }

  const sampled = options.all ? [...docs] : sampleArray(docs, options.sample);
  let sampledWithFrontmatter = 0;

  for (const doc of sampled) {
    const text = fs.readFileSync(doc.filePath, 'utf8');
    if (doc.frontmatter && (text.startsWith('---\n') || text.startsWith('---\r\n'))) {
      sampledWithFrontmatter += 1;
    }
  }

  if (sampled.length > 0 && sampledWithFrontmatter < sampled.length) {
    warnings.push(
      `Frontmatter check: ${sampledWithFrontmatter}/${sampled.length} sampled markdown files start with frontmatter.`
    );
  }

  const codeVerifiedDocs = docs.filter((doc) => doc.verification === 'code-verified');
  const missingSourceOfTruth = codeVerifiedDocs.filter((doc) => doc.sourceOfTruth.length === 0);
  const missingSourceTargets = codeVerifiedDocs.filter((doc) =>
    doc.sourceChecks.some((check) => !check.exists)
  );

  if (missingSourceOfTruth.length > 0) {
    warnings.push(
      `source_of_truth missing for ${missingSourceOfTruth.length} code-verified document(s).`
    );
  }

  if (missingSourceTargets.length > 0) {
    warnings.push(
      `source_of_truth targets not found for ${missingSourceTargets.length} code-verified document(s).`
    );
  }

  console.log('kb test summary');
  console.log(`- mode: ${context.mode}`);
  console.log(`- state file: ${context.statePath}`);
  console.log(`- markdown documents indexed: ${docs.length}`);
  console.log(`- sampled markdown files: ${sampled.length}${options.all ? ' (all docs)' : ''}`);
  console.log(`- sampled files with frontmatter: ${sampledWithFrontmatter}`);
  console.log(`- code-verified docs: ${codeVerifiedDocs.length}`);
  console.log(`- code-verified docs missing source_of_truth: ${missingSourceOfTruth.length}`);
  console.log(`- code-verified docs with missing source targets: ${missingSourceTargets.length}`);
  if (git.isGitRepo) {
    console.log(`- uncommitted working tree changes: ${dirtyEntries.length}`);
  }

  if (warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (failures.length > 0) {
    console.log('Failures:');
    for (const failure of failures) {
      console.log(`- ${failure}`);
    }

    throw new Error(`kb test failed with ${failures.length} failure(s).`);
  }

  const status = warnings.length > 0 ? 'WARN' : 'PASS';
  console.log(`Result: ${status}`);
}

module.exports = {
  runTest,
};