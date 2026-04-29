const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { buildDocumentIndex } = require('../lib/kb-analysis');

function parseArgs(args) {
  const options = {
    print: false,
    includeAllStates: false,
    chat: false,
    batch: 1,
    batchSize: 5,
  };

  for (let index = 0; index < (args || []).length; index += 1) {
    const arg = args[index];

    if (arg === '--print') {
      options.print = true;
      continue;
    }

    if (arg === '--all-states') {
      options.includeAllStates = true;
      continue;
    }

    if (arg === '--chat') {
      options.chat = true;
      continue;
    }

    if (arg === '--batch') {
      const value = Number((args || [])[index + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error('questions --batch requires a positive number.');
      }

      options.batch = Math.floor(value);
      index += 1;
      continue;
    }

    if (arg === '--batch-size') {
      const value = Number((args || [])[index + 1]);
      if (!Number.isFinite(value) || value <= 0 || value > 20) {
        throw new Error('questions --batch-size requires a number between 1 and 20.');
      }

      options.batchSize = Math.floor(value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown questions option "${arg}". Supported: --print, --all-states, --chat, --batch <n>, --batch-size <n>`);
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

function defaultOptionsForSections(sectionText) {
  const sections = sectionText.toLowerCase();

  if (sections.includes('purpose')) {
    return ['Keep aligned with current implementation', 'Define business intent explicitly', 'Mark as TBD pending product input'];
  }

  if (sections.includes('current state')) {
    return ['Implemented', 'Partially implemented', 'Not implemented yet'];
  }

  if (sections.includes('target state')) {
    return ['No planned change', 'Planned in next milestone', 'Under discussion'];
  }

  if (sections.includes('evidence')) {
    return ['Source file path(s)', 'Tests/log output', 'Issue/PR reference'];
  }

  if (sections.includes('open questions')) {
    return ['No open questions', 'Needs architecture decision', 'Needs product decision'];
  }

  return ['Accept suggested draft', 'Edit suggested draft', 'Provide custom answer'];
}

function suggestHint(item) {
  if (item.relativePath.startsWith('06-api/')) {
    return 'Suggest using route/controller annotations and auth middleware behavior as evidence.';
  }

  if (item.relativePath.startsWith('07-database/')) {
    return 'Suggest extracting from schema/migration files and relation definitions.';
  }

  if (item.relativePath.startsWith('05-backend/')) {
    return 'Suggest mapping service responsibilities from route -> controller -> data access flow.';
  }

  if (item.relativePath.startsWith('03-architecture/')) {
    return 'Suggest summarizing current container/component structure before future-state intent.';
  }

  return 'Suggest starting from current code evidence, then refine with business intent from user.';
}

function renderChatBatchMarkdown({ items, batch, batchSize, total }) {
  const totalBatches = Math.max(1, Math.ceil(total / batchSize));
  const startIndex = (batch - 1) * batchSize;
  const endIndex = Math.min(startIndex + batchSize, total);
  const batchItems = items.slice(startIndex, endIndex);

  let output = '';
  output += `# KB Intake Chat Batch ${batch}/${totalBatches}\n\n`;
  output += `Questions ${startIndex + 1}-${endIndex} of ${total}.\n\n`;
  output += 'Answer each question using 4-step format: **General -> Default -> Suggest -> Custom**.\n\n';

  batchItems.forEach((item, index) => {
    const number = startIndex + index + 1;
    const defaults = defaultOptionsForSections(item.section)
      .map((opt, optIndex) => `${optIndex + 1}. ${opt}`)
      .join('\n');

    output += `## Q${number} [${item.state}] [P${item.priority}] ${item.relativePath}\n\n`;
    output += `- General: What should be documented for **${item.section}** in this file?\n`;
    output += '- Default options:\n';
    output += `${defaults}\n`;
    output += `- Suggest: ${suggestHint(item)}\n`;
    output += `- Custom: Provide your own wording for ${item.section} in this file.\n\n`;
  });

  if (batch < totalBatches) {
    output += `Next batch command: \`kb questions --chat --batch ${batch + 1} --batch-size ${batchSize}\`\n`;
  } else {
    output += 'All batches completed for current question set.\n';
  }

  return output;
}

function printChatBatch({ items, batch, batchSize }) {
  const total = items.length;
  const totalBatches = Math.max(1, Math.ceil(total / batchSize));
  const safeBatch = Math.min(Math.max(batch, 1), totalBatches);
  const startIndex = (safeBatch - 1) * batchSize;
  const endIndex = Math.min(startIndex + batchSize, total);
  const batchItems = items.slice(startIndex, endIndex);

  console.log(`\nKB intake chat batch ${safeBatch}/${totalBatches} (items ${startIndex + 1}-${endIndex} of ${total})`);
  console.log('Format: General -> Default -> Suggest -> Custom\n');

  for (let index = 0; index < batchItems.length; index += 1) {
    const item = batchItems[index];
    const number = startIndex + index + 1;
    const defaults = defaultOptionsForSections(item.section);

    console.log(`${number}. [${item.state}] [P${item.priority}] ${item.relativePath}`);
    console.log(`   General: What should be documented for ${item.section}?`);
    console.log('   Default:');
    for (let optIndex = 0; optIndex < defaults.length; optIndex += 1) {
      console.log(`     ${optIndex + 1}. ${defaults[optIndex]}`);
    }
    console.log(`   Suggest: ${suggestHint(item)}`);
    console.log(`   Custom : Provide your own wording for ${item.section}.`);
  }

  if (safeBatch < totalBatches) {
    console.log(`\nNext: kb questions --chat --batch ${safeBatch + 1} --batch-size ${batchSize}`);
  } else {
    console.log('\nAll chat batches completed.');
  }
}

async function runQuestions({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });
  const docs = buildDocumentIndex({ contentRoot: context.contentRoot, workspaceRoot });
  const items = collectQuestions(docs, { includeAllStates: options.includeAllStates });

  const outputPath = path.join(context.contentRoot, '00-start-here', 'intake-questions.md');
  fs.writeFileSync(outputPath, renderQuestionsMarkdown(items), 'utf8');

  const chatOutputPath = path.join(context.contentRoot, '00-start-here', 'intake-questions-chat.md');
  fs.writeFileSync(
    chatOutputPath,
    renderChatBatchMarkdown({
      items,
      batch: options.batch,
      batchSize: options.batchSize,
      total: items.length,
    }),
    'utf8'
  );

  console.log(`kb questions: generated ${items.length} question(s).`);
  console.log(`Output: ${outputPath}`);
  console.log(`Chat batch output: ${chatOutputPath}`);

  if (options.chat) {
    printChatBatch({ items, batch: options.batch, batchSize: options.batchSize });
    return;
  }

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
