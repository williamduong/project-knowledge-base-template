const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { readStateFile } = require('../lib/state');
const { getGitMetadata } = require('../lib/git');

function parseArgs(args) {
  const options = {
    sample: 5,
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

    throw new Error(`Unknown test option \"${current}\".`);
  }

  return options;
}

function collectMarkdownFiles(root, output = []) {
  if (!fs.existsSync(root)) {
    return output;
  }

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') {
      continue;
    }

    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(fullPath, output);
      continue;
    }

    if (entry.name.toLowerCase().endsWith('.md')) {
      output.push(fullPath);
    }
  }

  return output;
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
  }

  const markdownFiles = collectMarkdownFiles(context.contentRoot, []);
  if (markdownFiles.length === 0) {
    warnings.push('No markdown files found in KB content root.');
  }

  const sampled = sampleArray(markdownFiles, options.sample);
  let sampledWithFrontmatter = 0;

  for (const filePath of sampled) {
    const text = fs.readFileSync(filePath, 'utf8');
    if (text.startsWith('---\n') || text.startsWith('---\r\n')) {
      sampledWithFrontmatter += 1;
    }
  }

  if (sampled.length > 0 && sampledWithFrontmatter < sampled.length) {
    warnings.push(
      `Frontmatter check: ${sampledWithFrontmatter}/${sampled.length} sampled markdown files start with frontmatter.`
    );
  }

  console.log('kb test summary');
  console.log(`- mode: ${context.mode}`);
  console.log(`- state file: ${context.statePath}`);
  console.log(`- sampled markdown files: ${sampled.length}`);
  console.log(`- sampled files with frontmatter: ${sampledWithFrontmatter}`);

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