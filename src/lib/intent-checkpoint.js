'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FOCUS_CANDIDATES = [
  ['svfactory', 'focus.md'],
  ['kb-root', 'focus.md'],
];

function resolveFocusFile(workspaceRoot) {
  for (const parts of FOCUS_CANDIDATES) {
    const candidate = path.join(workspaceRoot, ...parts);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function sanitizeNote(note) {
  if (!note || typeof note !== 'string') return '';
  return note.replace(/\r?\n/g, ' ').trim();
}

function ensureCheckpointSection(content) {
  const heading = '## Intent Checkpoints';
  if (content.includes(heading)) return content;

  const trimmed = content.replace(/\s*$/, '');
  return `${trimmed}\n\n${heading}\n\n`;
}

function prependCheckpointLine(content, line) {
  const headingRe = /(^|\n)## Intent Checkpoints\n/;
  const match = headingRe.exec(content);
  if (!match) {
    return `${content}\n${line}\n`;
  }

  const insertAt = match.index + match[0].length;
  return `${content.slice(0, insertAt)}${line}\n${content.slice(insertAt)}`;
}

function runGit(workspaceRoot, args) {
  const result = spawnSync('git', args, {
    cwd: workspaceRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: false,
  });

  return {
    ok: result.status === 0,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    status: result.status,
  };
}

function recordIntentCheckpoint({ workspaceRoot, eventName, intentId = null, note = '' }) {
  const focusPath = resolveFocusFile(workspaceRoot);
  if (!focusPath) {
    return { skipped: true, reason: 'focus-file-not-found' };
  }

  const relFocus = path.relative(workspaceRoot, focusPath).replace(/\\/g, '/');
  const gitBranch = runGit(workspaceRoot, ['branch', '--show-current']).stdout || 'detached';

  const nowIso = new Date().toISOString();
  const parts = [
    `- ${nowIso}`,
    `event=${eventName}`,
    `branch=${gitBranch}`,
  ];
  if (intentId) parts.push(`intent=${intentId}`);
  const cleanedNote = sanitizeNote(note);
  if (cleanedNote) parts.push(`note=${cleanedNote}`);
  const checkpointLine = parts.join(' | ');

  const original = fs.readFileSync(focusPath, 'utf8');
  const withSection = ensureCheckpointSection(original);
  const updated = prependCheckpointLine(withSection, checkpointLine);
  fs.writeFileSync(focusPath, updated, 'utf8');

  const addResult = runGit(workspaceRoot, ['add', relFocus]);
  if (!addResult.ok) {
    throw new Error(`Failed to stage checkpoint file (${relFocus}): ${addResult.stderr || addResult.stdout}`);
  }

  const message = `chore(checkpoint): ${eventName}${intentId ? ` ${intentId}` : ''}`;
  const commitResult = runGit(workspaceRoot, ['commit', '-m', message, '--', relFocus]);
  if (!commitResult.ok) {
    throw new Error(`Failed to commit checkpoint update: ${commitResult.stderr || commitResult.stdout}`);
  }

  return {
    skipped: false,
    focusPath,
    relFocus,
    commitMessage: message,
    checkpointLine,
  };
}

module.exports = {
  recordIntentCheckpoint,
  resolveFocusFile,
};
