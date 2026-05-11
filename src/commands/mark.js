const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');

const ALLOWED_STATES = new Set(['template', 'autofilled', 'needs-review', 'verified', 'blocked']);

function parseArgs(args) {
  const options = {
    state: null,
    file: null,
  };

  for (let i = 0; i < (args || []).length; i += 1) {
    const current = args[i];
    if (current === '--state') {
      options.state = args[i + 1];
      i += 1;
      continue;
    }

    if (current === '--file') {
      options.file = args[i + 1];
      i += 1;
      continue;
    }

    throw new Error(`Unknown mark option "${current}". Usage: kbx mark --file <relative-md-path> --state <template|autofilled|needs-review|verified|blocked>`);
  }

  if (!options.file || !options.state) {
    throw new Error('Usage: kbx mark --file <relative-md-path> --state <template|autofilled|needs-review|verified|blocked>');
  }

  if (!ALLOWED_STATES.has(options.state)) {
    throw new Error(`Invalid kb_state "${options.state}". Allowed: ${Array.from(ALLOWED_STATES).join(', ')}`);
  }

  return options;
}

function upsertKbState(text, state) {
  if (!(text.startsWith('---\n') || text.startsWith('---\r\n'))) {
    throw new Error('Target file has no frontmatter. Cannot set kb_state safely.');
  }

  if (/^kb_state:\s*.+$/m.test(text)) {
    return text.replace(/^kb_state:\s*.+$/m, `kb_state: ${state}`);
  }

  const lines = text.split(/\r?\n/);
  const insertAt = lines.findIndex((line) => /^verification:\s*/.test(line));
  if (insertAt === -1) {
    const endFm = lines.findIndex((line, idx) => idx > 0 && line.trim() === '---');
    if (endFm === -1) {
      throw new Error('Malformed frontmatter.');
    }

    lines.splice(endFm, 0, `kb_state: ${state}`);
    return lines.join('\n');
  }

  lines.splice(insertAt + 1, 0, `kb_state: ${state}`);
  return lines.join('\n');
}

async function runMark({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });
  const targetPath = path.join(context.contentRoot, options.file);

  if (!fs.existsSync(targetPath)) {
    throw new Error(`File not found in KB content root: ${options.file}`);
  }

  const text = fs.readFileSync(targetPath, 'utf8');
  const updated = upsertKbState(text, options.state);
  fs.writeFileSync(targetPath, updated, 'utf8');

  console.log(`kbx mark: updated ${options.file}`);
  console.log(`kb_state: ${options.state}`);
}

module.exports = {
  runMark,
};
