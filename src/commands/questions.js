const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { buildDocumentIndex } = require('../lib/kb-analysis');

function parseArgs(args) {
  const options = {
    print: false,
    includeAllStates: false,
  };

  for (const arg of args || []) {
    if (arg === '--print') {
      options.print = true;
      continue;
    }

    if (arg === '--all-states') {
      options.includeAllStates = true;
      continue;
    }

    throw new Error(`Unknown questions option "${arg}". Supported: --print, --all-states`);
  }

  return options;
}

function priorityForPath(relativePath) {
  if (relativePath.startsWith('00-start-here/')) return 1;
  if (relativePath.startsWith('03-architecture/')) return 2;
  if (relativePath.startsWith('05-backend/')) return 2;
  if (relativePath.startsWith('06-api/')) return 2;
  if (relativePath.startsWith('07-database/')) return 2;
  return 3;
}

function priorityForState(state) {
  if (state === 'needs-review') return 1;
  if (state === 'autofilled') return 2;
  if (state === 'template') return 3;
  return 4;
}

function collectQuestions(docs, { includeAllStates }) {
  const markers = [
    { pattern: '[Enter the purpose of this document here]', section: 'Purpose' },
    { pattern: '[Enter instructions or placeholders for required information]', section: 'What To Fill' },
    { pattern: '[Describe the current implementation or situation]', section: 'Current State' },
    { pattern: '[Describe the desired future state]', section: 'Target State' },
    { pattern: '[Link to code, logs, or other proof]', section: 'Evidence' },
    { pattern: '[List any unresolved issues or questions]', section: 'Open Questions' },
    { pattern: '(placeholder)', section: 'Placeholder Table' },
  ];

  const output = [];

  for (const doc of docs) {
    const state = doc.kbState || 'template';
    if (!includeAllStates && !(state === 'needs-review' || state === 'autofilled' || state === 'template')) {
      continue;
    }

    const text = fs.readFileSync(doc.filePath, 'utf8');
    const missingSections = [];
    for (const marker of markers) {
      if (text.includes(marker.pattern)) {
        missingSections.push(marker.section);
      }
    }

    if (missingSections.length > 0) {
      const deduped = [...new Set(missingSections)];
      output.push({
        relativePath: doc.relativePath,
        state,
        statePriority: priorityForState(state),
        priority: priorityForPath(doc.relativePath),
        section: deduped.join(', '),
        question: `Please fill ${deduped.join(', ')} for ${doc.relativePath}.`,
      });
    }
  }

  output.sort((a, b) => {
    if (a.statePriority !== b.statePriority) return a.statePriority - b.statePriority;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.relativePath.localeCompare(b.relativePath);
  });

  return output;
}

function renderQuestionsMarkdown(items) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = items.map((item, index) =>
    `| Q-${String(index + 1).padStart(3, '0')} | ${item.state} | P${item.priority} | ${item.relativePath} | ${item.section} | ${item.question} |`
  );

  return `---
title: KB Intake Questions
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: unverified
last_updated: ${today}
last_verified: ${today}
---

# KB Intake Questions

Generated from unresolved placeholders and TODO markers in current KB.
Use this list in AI chat to ask product/engineering owners for missing facts.

One row equals one actionable question per file.

| ID | State | Priority | File | Section | Question |
|---|---|---|---|---|---|
${rows.join('\n')}
`;
}

async function runQuestions({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });
  const docs = buildDocumentIndex({ contentRoot: context.contentRoot, workspaceRoot });
  const items = collectQuestions(docs, { includeAllStates: options.includeAllStates });

  const outputPath = path.join(context.contentRoot, '00-start-here', 'intake-questions.md');
  fs.writeFileSync(outputPath, renderQuestionsMarkdown(items), 'utf8');

  console.log(`kb questions: generated ${items.length} question(s).`);
  console.log(`Output: ${outputPath}`);

  if (options.print) {
    const preview = items.slice(0, 10);
    console.log('\nTop 10 questions:');
    for (let i = 0; i < preview.length; i += 1) {
      const q = preview[i];
      console.log(`${i + 1}. [${q.state}] [P${q.priority}] ${q.relativePath} :: ${q.section}`);
      console.log(`   ${q.question}`);
    }
  }
}

module.exports = {
  runQuestions,
};
