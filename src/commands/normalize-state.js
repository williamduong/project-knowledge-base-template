const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { buildDocumentIndex } = require('../lib/kb-analysis');

function parseArgs(args) {
  const options = {
    dryRun: false,
  };

  for (const arg of args || []) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    throw new Error(`Unknown normalize-state option "${arg}". Supported: --dry-run`);
  }

  return options;
}

function inferStateFromContent(text) {
  const placeholderMarkers = [
    '[Enter ',
    '[Describe ',
    '(placeholder)',
    'TODO:',
  ];

  if (placeholderMarkers.some((marker) => text.includes(marker))) {
    return 'template';
  }

  if (text.includes('bootstrapped stub')) {
    return 'autofilled';
  }

  return 'needs-review';
}

function upsertKbState(text, state) {
  if (!(text.startsWith('---\n') || text.startsWith('---\r\n'))) {
    return null;
  }

  if (/^kb_state:\s*.+$/m.test(text)) {
    return text.replace(/^kb_state:\s*.+$/m, `kb_state: ${state}`);
  }

  const lines = text.split(/\r?\n/);
  const verificationLine = lines.findIndex((line) => /^verification:\s*/.test(line));
  if (verificationLine !== -1) {
    lines.splice(verificationLine + 1, 0, `kb_state: ${state}`);
    return lines.join('\n');
  }

  const endFm = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (endFm === -1) {
    return null;
  }

  lines.splice(endFm, 0, `kb_state: ${state}`);
  return lines.join('\n');
}

async function runNormalizeState({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });
  const docs = buildDocumentIndex({ contentRoot: context.contentRoot, workspaceRoot });

  const changed = [];
  const skipped = [];

  for (const doc of docs) {
    if (doc.kbState) {
      skipped.push({ file: doc.relativePath, reason: `already ${doc.kbState}` });
      continue;
    }

    const text = fs.readFileSync(doc.filePath, 'utf8');
    const inferred = inferStateFromContent(text);
    const updated = upsertKbState(text, inferred);

    if (!updated) {
      skipped.push({ file: doc.relativePath, reason: 'no valid frontmatter' });
      continue;
    }

    if (!options.dryRun) {
      fs.writeFileSync(doc.filePath, updated, 'utf8');
    }

    changed.push({ file: doc.relativePath, state: inferred });
  }

  console.log(`kbx normalize-state: ${options.dryRun ? 'DRY-RUN' : 'PASS'}`);
  console.log(`Updated: ${changed.length}`);
  console.log(`Skipped: ${skipped.length}`);

  const breakdown = changed.reduce((acc, item) => {
    acc[item.state] = (acc[item.state] || 0) + 1;
    return acc;
  }, {});
  console.log(`State assignments: ${JSON.stringify(breakdown)}`);

  const preview = changed.slice(0, 20);
  if (preview.length > 0) {
    console.log('\nPreview updates:');
    for (const entry of preview) {
      console.log(`  ${entry.file} -> ${entry.state}`);
    }
  }
}

module.exports = {
  runNormalizeState,
};
