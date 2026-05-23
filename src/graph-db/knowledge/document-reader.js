'use strict';

// ---------------------------------------------------------------------------
// Knowledge Graph — Document reader
//
// Scans knowledge-base/ for markdown files and returns document metadata.
// Handles YAML frontmatter extraction.
// ---------------------------------------------------------------------------

const fs = require('fs').promises;
const path = require('path');
const { existsSync } = require('fs');

// Parse YAML frontmatter from markdown
// Returns { frontmatter: {}, content: string } or { frontmatter: {}, content: string }
function parseMarkdown(text) {
  const lines = text.split('\n');
  if (!lines[0]?.startsWith('---')) {
    return { frontmatter: {}, content: text };
  }

  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].startsWith('---')) {
      endIdx = i;
      break;
    }
  }

  if (endIdx === -1) {
    return { frontmatter: {}, content: text };
  }

  const fmText = lines.slice(1, endIdx).join('\n');
  const content = lines.slice(endIdx + 1).join('\n');

  // Simple YAML parsing (key: value only, no complex nesting)
  const frontmatter = {};
  for (const line of fmText.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      let val = m[2].trim();
      // Remove quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      frontmatter[m[1]] = val;
    }
  }

  return { frontmatter, content };
}

// Recursively find all markdown files in a directory
async function collectMarkdownFiles(dirPath) {
  const files = [];

  async function walk(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        // Skip hidden dirs
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      // Directory doesn't exist or no read permission — skip
      if (err.code !== 'ENOENT' && err.code !== 'EACCES') throw err;
    }
  }

  await walk(dirPath);
  return files;
}

// Read and parse a markdown document
async function readDocument(filePath, workspaceRoot) {
  const text = await fs.readFile(filePath, 'utf8');
  const { frontmatter, content } = parseMarkdown(text);
  const relPath = path.relative(workspaceRoot, filePath);

  return {
    id: relPath.replace(/[^a-zA-Z0-9]/g, '_'), // safe key
    path: relPath,
    absolutePath: filePath,
    title: frontmatter.title || path.basename(filePath),
    type: frontmatter.type || 'document',
    frontmatter,
    content,
  };
}

module.exports = {
  collectMarkdownFiles,
  readDocument,
  parseMarkdown,
};
