const fs = require('fs');
const path = require('path');

const { parseFrontmatter } = require('./kb-analysis');

const BINDINGS_FILE_VERSION = 1;
const BINDINGS_RELATIVE_PATH = path.join('.kb', 'bindings.json');

function bindingsFilePath(contentRoot) {
  return path.join(contentRoot, BINDINGS_RELATIVE_PATH);
}

function emptyBindingsData() {
  return { version: BINDINGS_FILE_VERSION, bindings: [] };
}

function readBindingsFile(contentRoot) {
  const filePath = bindingsFilePath(contentRoot);
  if (!fs.existsSync(filePath)) {
    return emptyBindingsData();
  }

  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return emptyBindingsData();
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyBindingsData();
  }

  if (!parsed || typeof parsed !== 'object') {
    return emptyBindingsData();
  }

  const version = typeof parsed.version === 'number' ? parsed.version : BINDINGS_FILE_VERSION;
  const bindings = Array.isArray(parsed.bindings) ? parsed.bindings.filter(isValidBindingEntry) : [];
  return { version, bindings };
}

function writeBindingsFile(contentRoot, data) {
  const filePath = bindingsFilePath(contentRoot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const payload = {
    version: BINDINGS_FILE_VERSION,
    bindings: Array.isArray(data && data.bindings) ? data.bindings.filter(isValidBindingEntry) : [],
  };
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return filePath;
}

function isValidBindingEntry(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    typeof entry.doc === 'string' &&
    entry.doc.trim().length > 0 &&
    Array.isArray(entry.paths) &&
    entry.paths.every((p) => typeof p === 'string' && p.trim().length > 0)
  );
}

function normalizeDocPath(docRelPath) {
  if (typeof docRelPath !== 'string') {
    return '';
  }
  return docRelPath
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\//, '')
    .trim();
}

function dedupeStrings(values) {
  const seen = new Set();
  const out = [];
  for (const v of values) {
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function addBinding(data, doc, paths, source = 'user') {
  const normalizedDoc = normalizeDocPath(doc);
  if (!normalizedDoc) {
    throw new Error('addBinding: doc path is required.');
  }
  const newPaths = dedupeStrings(Array.isArray(paths) ? paths : [paths]);
  if (newPaths.length === 0) {
    throw new Error('addBinding: at least one path is required.');
  }

  const next = {
    version: BINDINGS_FILE_VERSION,
    bindings: Array.isArray(data && data.bindings) ? [...data.bindings] : [],
  };

  const existingIndex = next.bindings.findIndex((b) => normalizeDocPath(b.doc) === normalizedDoc);
  if (existingIndex >= 0) {
    const existing = next.bindings[existingIndex];
    next.bindings[existingIndex] = {
      doc: normalizedDoc,
      paths: dedupeStrings([...(existing.paths || []), ...newPaths]),
      source: existing.source || source,
    };
  } else {
    next.bindings.push({ doc: normalizedDoc, paths: newPaths, source });
  }

  return next;
}

function readFrontmatterBindsTo(absoluteDocPath) {
  if (!fs.existsSync(absoluteDocPath)) {
    return [];
  }
  let raw;
  try {
    raw = fs.readFileSync(absoluteDocPath, 'utf8');
  } catch {
    return [];
  }
  const fm = parseFrontmatter(raw);
  if (!fm || !Object.prototype.hasOwnProperty.call(fm, 'binds_to')) {
    return [];
  }
  const value = fm.binds_to;
  if (Array.isArray(value)) {
    return dedupeStrings(value);
  }
  if (typeof value === 'string' && value.trim()) {
    return dedupeStrings([value]);
  }
  return [];
}

/**
 * Resolve binding paths cho 1 doc.
 * Ưu tiên frontmatter `binds_to`. Fallback `bindings.json`. Không có cả hai → [].
 */
function getDocBindings(contentRoot, docRelPath, indexData = null) {
  const normalizedDoc = normalizeDocPath(docRelPath);
  if (!normalizedDoc) {
    return { paths: [], source: null };
  }

  const absDocPath = path.join(contentRoot, normalizedDoc);
  const frontmatterPaths = readFrontmatterBindsTo(absDocPath);
  if (frontmatterPaths.length > 0) {
    return { paths: frontmatterPaths, source: 'frontmatter' };
  }

  const data = indexData || readBindingsFile(contentRoot);
  const entry = (data.bindings || []).find((b) => normalizeDocPath(b.doc) === normalizedDoc);
  if (entry && entry.paths && entry.paths.length > 0) {
    return { paths: dedupeStrings(entry.paths), source: entry.source || 'index' };
  }

  return { paths: [], source: null };
}

/**
 * List binding cho mọi .md doc dưới contentRoot.
 * Trả array `{ doc, paths, source }`. Doc không có binding → bỏ qua.
 */
function listAllDocBindings(contentRoot) {
  const indexData = readBindingsFile(contentRoot);
  const seenDocs = new Set();
  const result = [];

  // 1. Scan .md files for frontmatter `binds_to`
  const mdFiles = collectMarkdownFiles(contentRoot);
  for (const abs of mdFiles) {
    const rel = normalizeDocPath(path.relative(contentRoot, abs));
    if (!rel || rel.startsWith('.kb/')) continue;
    const resolved = getDocBindings(contentRoot, rel, indexData);
    if (resolved.paths.length > 0) {
      seenDocs.add(rel);
      result.push({ doc: rel, paths: resolved.paths, source: resolved.source });
    }
  }

  // 2. Add bindings.json entries cho doc không có file (vd doc bị xóa hoặc rename ngoài KB)
  for (const entry of indexData.bindings || []) {
    const docRel = normalizeDocPath(entry.doc);
    if (!docRel || seenDocs.has(docRel)) continue;
    if (entry.paths && entry.paths.length > 0) {
      result.push({ doc: docRel, paths: dedupeStrings(entry.paths), source: entry.source || 'index' });
    }
  }

  return result;
}

function collectMarkdownFiles(root, output = []) {
  if (!fs.existsSync(root)) return output;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.kb') continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(full, output);
      continue;
    }
    if (entry.name.toLowerCase().endsWith('.md')) {
      output.push(full);
    }
  }
  return output;
}

module.exports = {
  BINDINGS_FILE_VERSION,
  addBinding,
  bindingsFilePath,
  emptyBindingsData,
  getDocBindings,
  listAllDocBindings,
  normalizeDocPath,
  readBindingsFile,
  readFrontmatterBindsTo,
  writeBindingsFile,
};
