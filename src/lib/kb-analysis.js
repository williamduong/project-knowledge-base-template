const fs = require('fs');
const path = require('path');

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

function parseFrontmatter(rawText) {
  if (!rawText.startsWith('---\n') && !rawText.startsWith('---\r\n')) {
    return null;
  }

  const lines = rawText.split(/\r?\n/);
  if (lines[0].trim() !== '---') {
    return null;
  }

  const result = {};
  let index = 1;
  let currentListKey = null;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed === '---') {
      return result;
    }

    if (!trimmed) {
      index += 1;
      continue;
    }

    const listMatch = /^-\s+(.*)$/.exec(trimmed);
    if (listMatch && currentListKey) {
      result[currentListKey].push(listMatch[1].trim());
      index += 1;
      continue;
    }

    const keyValueMatch = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (keyValueMatch) {
      const key = keyValueMatch[1].trim();
      const value = keyValueMatch[2].trim();

      if (value) {
        result[key] = value;
        currentListKey = null;
      } else {
        result[key] = [];
        currentListKey = key;
      }

      index += 1;
      continue;
    }

    currentListKey = null;
    index += 1;
  }

  return result;
}

function normalizeSourceOfTruthValues(frontmatter) {
  if (!frontmatter || !Object.prototype.hasOwnProperty.call(frontmatter, 'source_of_truth')) {
    return [];
  }

  const raw = frontmatter.source_of_truth;
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }

  if (raw === null || raw === undefined) {
    return [];
  }

  const value = String(raw).trim();
  if (!value || value.toLowerCase() === 'null') {
    return [];
  }

  return [value];
}

function buildDocumentIndex({ contentRoot, workspaceRoot }) {
  const markdownFiles = collectMarkdownFiles(contentRoot, []);
  const documents = [];

  for (const filePath of markdownFiles) {
    const text = fs.readFileSync(filePath, 'utf8');
    const frontmatter = parseFrontmatter(text);
    const sourceOfTruth = normalizeSourceOfTruthValues(frontmatter);

    const sourceChecks = sourceOfTruth.map((entry) => {
      const resolved = path.resolve(workspaceRoot, entry);
      return {
        entry,
        resolved,
        exists: fs.existsSync(resolved),
      };
    });

    documents.push({
      filePath,
      relativePath: path.relative(contentRoot, filePath).replace(/\\/g, '/'),
      frontmatter,
      verification: frontmatter && frontmatter.verification ? String(frontmatter.verification) : null,
      kbState: frontmatter && frontmatter.kb_state ? String(frontmatter.kb_state) : null,
      owner: frontmatter && frontmatter.owner ? String(frontmatter.owner) : 'unknown',
      sourceOfTruth,
      sourceChecks,
    });
  }

  return documents;
}

function parseDiffNameStatus(diffText) {
  if (!diffText) {
    return [];
  }

  const rows = [];
  for (const line of diffText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      continue;
    }

    const status = parts[0];
    const filePath = parts.slice(1).join(' ');
    rows.push({ status, filePath: filePath.replace(/\\/g, '/') });
  }

  return rows;
}

function mapDiffToDocuments({ diffRows, documents }) {
  const mapped = [];

  for (const doc of documents) {
    if (!doc.sourceOfTruth || doc.sourceOfTruth.length === 0) {
      continue;
    }

    const sourcePrefixes = doc.sourceOfTruth
      .map((entry) => entry.replace(/\\/g, '/').replace(/\/+$/, ''))
      .filter(Boolean);

    const matches = diffRows.filter((row) => {
      const rowPath = row.filePath;
      return sourcePrefixes.some((prefix) => rowPath === prefix || rowPath.startsWith(`${prefix}/`));
    });

    if (matches.length > 0) {
      mapped.push({
        document: doc,
        matches,
      });
    }
  }

  return mapped;
}

function updateFinalizationQueue({ contentRoot, mappedDocs, baseline, head, date }) {
  const strategicPath = path.join(contentRoot, '00-start-here', 'strategic-backlog.md');
  const legacyPath = path.join(contentRoot, '00-start-here', 'finalization-plan.md');
  const queuePath = fs.existsSync(strategicPath) ? strategicPath : legacyPath;
  if (!fs.existsSync(queuePath)) {
    return { queuePath: strategicPath, updated: false, reason: 'strategic-backlog.md (or legacy finalization-plan.md) not found in content root' };
  }

  const startMarker = '<!-- KB_SYNC_AUTO_QUEUE_START -->';
  const endMarker = '<!-- KB_SYNC_AUTO_QUEUE_END -->';
  let block = `${startMarker}\n\n## Auto Drift Queue (Generated)\n\n`;

  if (mappedDocs.length === 0) {
    block += `No source_of_truth mappings matched changed files for drift range ${baseline}..${head} on ${date}.\n\n`;
  } else {
    block += '| ID | Work Item | Owner | Priority | Due Date | Status | Notes |\n';
    block += '|---|---|---|---|---|---|---|\n';

    mappedDocs.forEach((item, index) => {
      const id = `KB-DRIFT-${String(index + 1).padStart(3, '0')}`;
      const docPath = item.document.relativePath;
      const owner = item.document.owner || 'unknown';
      const count = item.matches.length;
      const notes = `source drift ${baseline}..${head}, matched files: ${count}`;
      block += `| ${id} | Re-verify ${docPath} | ${owner} | P1 | ${date} | todo | ${notes} |\n`;
    });

    block += '\n';
  }

  block += `${endMarker}`;

  const current = fs.readFileSync(queuePath, 'utf8');
  let updatedText = current;

  if (current.includes(startMarker) && current.includes(endMarker)) {
    const pattern = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'm');
    updatedText = current.replace(pattern, block);
  } else {
    updatedText = `${current.trimEnd()}\n\n${block}\n`;
  }

  fs.writeFileSync(queuePath, updatedText, 'utf8');
  return { queuePath, updated: true };
}

module.exports = {
  buildDocumentIndex,
  collectMarkdownFiles,
  mapDiffToDocuments,
  parseDiffNameStatus,
  parseFrontmatter,
  updateFinalizationQueue,
};