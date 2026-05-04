'use strict';

function findFrontmatterBounds(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return null;
  const lines = text.split(/\r?\n/);
  if (lines[0].trim() !== '---') return null;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      return { startLine: 0, endLine: i, lines };
    }
  }
  return null;
}

function updateFrontmatterFields(text, updates) {
  const bounds = findFrontmatterBounds(text);
  if (!bounds) {
    throw new Error('No frontmatter block (--- ... ---) found in document.');
  }
  const { lines, endLine } = bounds;
  const newLines = lines.slice();
  const remainingUpdates = new Map(Object.entries(updates));

  for (let i = 1; i < endLine; i += 1) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(newLines[i]);
    if (!m) continue;
    const key = m[1];
    if (remainingUpdates.has(key)) {
      newLines[i] = `${key}: ${remainingUpdates.get(key)}`;
      remainingUpdates.delete(key);
    }
  }

  if (remainingUpdates.size > 0) {
    const inserts = [];
    for (const [key, value] of remainingUpdates.entries()) {
      inserts.push(`${key}: ${value}`);
    }
    newLines.splice(endLine, 0, ...inserts);
  }

  return newLines.join('\n');
}

function removeFrontmatterFields(text, keys) {
  const bounds = findFrontmatterBounds(text);
  if (!bounds) {
    throw new Error('No frontmatter block (--- ... ---) found in document.');
  }
  const removeSet = new Set(Array.isArray(keys) ? keys : [keys]);
  const { lines, endLine } = bounds;
  const kept = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (i > 0 && i < endLine) {
      const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i]);
      if (m && removeSet.has(m[1])) {
        continue;
      }
    }
    kept.push(lines[i]);
  }
  return kept.join('\n');
}

module.exports = {
  findFrontmatterBounds,
  removeFrontmatterFields,
  updateFrontmatterFields,
};