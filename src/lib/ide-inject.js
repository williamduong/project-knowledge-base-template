const fs = require('fs');
const path = require('path');

const BLOCK_START = '<!-- KB-MANAGED:START -->';
const BLOCK_END = '<!-- KB-MANAGED:END -->';
const BLOCK_RE = /[\r\n]?<!--\s*KB-MANAGED:START\s*-->[\s\S]*?<!--\s*KB-MANAGED:END\s*-->[\r\n]?/g;

function buildBlock({ refPath }) {
  return [
    BLOCK_START,
    `> KB integration: this workspace defers to the @kb agent. See [${refPath}](${refPath}) for the full master agent contract (read order, governance, Q&A pipeline).`,
    BLOCK_END,
  ].join('\n');
}

/**
 * Idempotently inject (or replace) the KB-MANAGED block in a file.
 * Creates the file (and parent directories) if missing.
 *
 * @param {Object} opts
 * @param {string} opts.workspaceRoot
 * @param {string} opts.relFile      Workspace-relative file path
 * @param {string} opts.refPath      Workspace-relative path to kb.agent.md
 * @returns {{ action: 'created'|'replaced'|'appended'|'unchanged', file: string }}
 */
function injectBlock({ workspaceRoot, relFile, refPath }) {
  const filePath = path.join(workspaceRoot, relFile);
  const block = buildBlock({ refPath });

  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, block + '\n', 'utf8');
    return { action: 'created', file: relFile };
  }

  const original = fs.readFileSync(filePath, 'utf8');

  if (BLOCK_RE.test(original)) {
    BLOCK_RE.lastIndex = 0;
    const next = original.replace(BLOCK_RE, '\n' + block + '\n');
    if (next === original) {
      return { action: 'unchanged', file: relFile };
    }
    fs.writeFileSync(filePath, next, 'utf8');
    return { action: 'replaced', file: relFile };
  }

  const sep = original.endsWith('\n') ? '\n' : '\n\n';
  fs.writeFileSync(filePath, original + sep + block + '\n', 'utf8');
  return { action: 'appended', file: relFile };
}

/**
 * Strip the KB-MANAGED block from a file. Leaves the file in place.
 *
 * @returns {{ action: 'removed'|'absent'|'missing', file: string }}
 */
function removeBlock({ workspaceRoot, relFile }) {
  const filePath = path.join(workspaceRoot, relFile);
  if (!fs.existsSync(filePath)) {
    return { action: 'missing', file: relFile };
  }
  const original = fs.readFileSync(filePath, 'utf8');
  if (!BLOCK_RE.test(original)) {
    BLOCK_RE.lastIndex = 0;
    return { action: 'absent', file: relFile };
  }
  BLOCK_RE.lastIndex = 0;
  const cleaned = original.replace(BLOCK_RE, '\n').replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '') + '\n';
  fs.writeFileSync(filePath, cleaned, 'utf8');
  return { action: 'removed', file: relFile };
}

module.exports = {
  injectBlock,
  removeBlock,
  buildBlock,
  BLOCK_START,
  BLOCK_END,
  BLOCK_RE,
};
