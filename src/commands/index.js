const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { buildDocumentIndex } = require('../lib/kb-analysis');

function parseArgs(args) {
  const options = {
    watch: false,
  };

  for (const arg of args || []) {
    if (arg === '--watch') {
      options.watch = true;
      continue;
    }

    throw new Error(`Unknown index option "${arg}". Supported: --watch`);
  }

  return options;
}

function collectModelsFromPrisma(workspaceRoot) {
  const prismaPath = path.join(workspaceRoot, 'src', 'prisma', 'schema.prisma');
  if (!fs.existsSync(prismaPath)) {
    return [];
  }

  const text = fs.readFileSync(prismaPath, 'utf8');
  const matches = [...text.matchAll(/^model\s+(\w+)\s*\{/gm)];
  return matches.map((m) => m[1]);
}

function collectRouteFiles(workspaceRoot) {
  const root = path.join(workspaceRoot, 'src');
  if (!fs.existsSync(root)) {
    return [];
  }

  const output = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }

      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.js')) {
        continue;
      }

      const rel = path.relative(workspaceRoot, full).replace(/\\/g, '/');
      if (rel.includes('/routes/') || rel.endsWith('.controller.ts') || rel.endsWith('.controller.js')) {
        output.push(rel);
      }
    }
  }

  return output.sort();
}

function countPlaceholderDocs(docs) {
  const markers = [
    '[Enter ',
    '[Describe ',
    '(placeholder)',
    'TODO:',
  ];

  let count = 0;
  for (const doc of docs) {
    const text = fs.readFileSync(doc.filePath, 'utf8');
    if (markers.some((m) => text.includes(m))) {
      count += 1;
    }
  }

  return count;
}

function buildIndexSummary({ workspaceRoot, context }) {
  const docs = buildDocumentIndex({ contentRoot: context.contentRoot, workspaceRoot });
  const verificationCounts = docs.reduce((acc, doc) => {
    const key = doc.verification || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const kbStateCounts = docs.reduce((acc, doc) => {
    const key = doc.kbState || 'unset';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    workspaceRoot,
    kb: {
      mode: context.mode,
      contentRoot: context.contentRoot,
      documentCount: docs.length,
      placeholderDocumentCount: countPlaceholderDocs(docs),
      verificationCounts,
      kbStateCounts,
    },
    source: {
      routeFiles: collectRouteFiles(workspaceRoot),
      prismaModels: collectModelsFromPrisma(workspaceRoot),
    },
  };
}

function writeSummary(context, summary) {
  const reportsDir = path.join(path.dirname(context.statePath), 'reports');
  const summaryPath = path.join(reportsDir, 'index-summary.json');
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  return summaryPath;
}

function runOnce({ cwd }) {
  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });
  const summary = buildIndexSummary({ workspaceRoot, context });
  const summaryPath = writeSummary(context, summary);

  const isSilent = process.env.KB_INIT_SILENT === 'true';

  if (!isSilent) {
    console.log('kb index: PASS');
    console.log(`Summary: ${summaryPath}`);
    console.log(`Docs: ${summary.kb.documentCount}`);
    console.log(`Placeholder docs: ${summary.kb.placeholderDocumentCount}`);
    console.log(`KB states: ${JSON.stringify(summary.kb.kbStateCounts)}`);
    console.log(`Route files: ${summary.source.routeFiles.length}`);
    console.log(`Prisma models: ${summary.source.prismaModels.join(', ') || 'none'}`);
  }
}

async function runIndex({ args, cwd }) {
  const options = parseArgs(args);
  runOnce({ cwd });

  if (!options.watch) {
    return;
  }

  console.log('kb index watch: running every 10 seconds. Press Ctrl+C to stop.');
  setInterval(() => {
    try {
      runOnce({ cwd });
    } catch (error) {
      console.error(`kb index watch: ${error.message}`);
    }
  }, 10000);
}

module.exports = {
  runIndex,
};
