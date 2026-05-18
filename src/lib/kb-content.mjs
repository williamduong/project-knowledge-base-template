// Deterministic helpers for KB content: YAML frontmatter parsing, markdown
// rendering, heading extraction, and recursive tree walk.
//
// L4 lib per svfactory/runtime-control-plane-architecture.md: pure, UI-agnostic,
// HTTP-agnostic. Called from the snapshot collector (L3); never from a route
// handler directly.
//
// Ported from scripts/gen-kb-mock.mjs (slice-3 mock generator) so the live
// runtime emits the same shapes the UI was already built against.

import { readdirSync, readFileSync, statSync, existsSync, realpathSync } from 'node:fs';
import { join, posix, resolve as resolvePath, relative as relativePath, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';

// SHA-1 of file bytes. Slice C-2 uses this to detect drift between the
// DB row (intent) and the on-disk file (observed). SHA-1 is fine here —
// not a security hash, just collision-resistant enough for "did the bytes
// change". ~1 ms per file for typical KB docs.
export function computeFileHashFromBuffer(buf) {
  return createHash('sha1').update(buf).digest('hex');
}
export function computeFileHash(absPath) {
  try { return computeFileHashFromBuffer(readFileSync(absPath)); }
  catch { return null; }
}

export const ALLOWED_EXT = new Set(['.md', '.html']);
export const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', '.cache', '_cacache', '_logs',
]);

const ALLOWED_TYPES = new Set([
  'orientation', 'concept', 'architecture', 'reference', 'implementation',
  'decision', 'guide', 'operations', 'test-strategy', 'governance',
]);
const ALLOWED_STATUS = new Set(['active', 'draft', 'deprecated', 'archived']);
const ALLOWED_VERIF = new Set(['code-verified', 'design-only', 'unverified', 'self-referential']);
const ALLOWED_TIME = new Set(['current', 'to_be', 'mixed', 'historical', 'timeless']);

function normType(v)   { return ALLOWED_TYPES.has(v) ? v : 'unknown'; }
function normStatus(v) { return ALLOWED_STATUS.has(v) ? v : 'unknown'; }
function normVerif(v)  { return ALLOWED_VERIF.has(v)  ? v : 'unknown'; }
function normTime(v)   { return ALLOWED_TIME.has(v)   ? v : 'unknown'; }
function asStringArray(v) { return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; }
function toPosix(p) { return p.split('\\').join('/'); }
function daysBetween(a, b) { return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000)); }

export function parseFrontmatter(text) {
  if (!text.startsWith('---')) return { fm: {}, body: text };
  const end = text.indexOf('\n---', 3);
  if (end < 0) return { fm: {}, body: text };
  const raw = text.slice(3, end).trim();
  const body = text.slice(end + 4).replace(/^\r?\n/, '');
  try { return { fm: yaml.load(raw) || {}, body }; } catch { return { fm: {}, body }; }
}

function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function slug(s) { return s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'); }

function inline(s) {
  let out = escapeHtml(s);
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return out;
}

export function renderMd(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;
  const isTableRow = (s) => /^\s*\|.*\|\s*$/.test(s);
  const isTableSep = (s) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(s);

  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || '';
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      out.push(`<pre><code${langClass}>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr/>'); i++; continue; }

    const h = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (h) {
      const lv = h[1].length, text = h[2].trim();
      out.push(`<h${lv} id="${slug(text)}">${inline(text)}</h${lv}>`);
      i++; continue;
    }

    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`);
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
        i++;
      }
      const thead = '<thead><tr>' + header.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead>';
      const tbody = '<tbody>' + rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody>';
      out.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
      out.push('<ol>' + items.map((t) => `<li>${inline(t)}</li>`).join('') + '</ol>');
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*+]\s+/, '')); i++; }
      out.push('<ul>' + items.map((t) => `<li>${inline(t)}</li>`).join('') + '</ul>');
      continue;
    }

    if (line.trim() === '') { i++; continue; }

    const buf = [line]; i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !isTableRow(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i])
    ) { buf.push(lines[i]); i++; }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

export function extractHeadings(md) {
  const headings = [];
  let inCode = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^```/.test(line)) { inCode = !inCode; continue; }
    if (inCode) continue;
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (m) {
      const text = m[2].trim();
      headings.push({ id: slug(text), level: m[1].length, text });
    }
  }
  return headings;
}

function titleFromBody(body, fallback) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : fallback;
}

// -----------------------------------------------------------------------------
// Tree walk + per-doc parse
// -----------------------------------------------------------------------------

function readDirSorted(dir) { return readdirSync(dir).sort((a, b) => a.localeCompare(b)); }

// Lightweight summary parser used by walkRoot — reads frontmatter only, skips
// markdown rendering. ~10x cheaper than parseDocFromDisk for tree walks.
export function parseDocSummary(absPath, relPath, today = new Date()) {
  const text = readFileSync(absPath, 'utf8');
  const isMd = relPath.endsWith('.md');
  const isHtml = relPath.endsWith('.html');
  const { fm } = isMd ? parseFrontmatter(text) : { fm: {} };
  const todayStr = today.toISOString().slice(0, 10);
  const last_updated = typeof fm.last_updated === 'string' ? fm.last_updated : todayStr;
  const last_verified = typeof fm.last_verified === 'string' ? fm.last_verified : last_updated;
  let daysSinceVerified = 0;
  try {
    const v = new Date(last_verified);
    if (!Number.isNaN(v.getTime())) daysSinceVerified = daysBetween(v, today);
  } catch {}
  return {
    path: toPosix(relPath),
    title: typeof fm.title === 'string' ? fm.title : titleFromBody(text, relPath.split(/[\\/]/).pop()),
    type: normType(fm.type),
    status: normStatus(fm.status),
    verification: normVerif(fm.verification),
    time_state: normTime(fm.time_state),
    owner: typeof fm.owner === 'string' ? fm.owner : '',
    last_updated,
    last_verified,
    daysSinceVerified,
    stale: daysSinceVerified >= 60,
    tags: asStringArray(fm.tags),
    fileKind: isMd ? 'md' : (isHtml ? 'html' : 'other'),
  };
}

// Parse a doc from raw text (no fs read). Slice C-4 calls this when the
// UI POSTs new body content — we need to re-derive frontmatter / html /
// hash before persisting.
export function parseDocFromText(rawText, relPath, today = new Date()) {
  const contentHash = computeFileHashFromBuffer(Buffer.from(rawText, 'utf8'));
  return _parseInner(rawText, relPath, contentHash, today);
}

export function parseDocFromDisk(absPath, relPath, today = new Date()) {
  const raw = readFileSync(absPath);
  const contentHash = computeFileHashFromBuffer(raw);
  const text = raw.toString('utf8');
  return _parseInner(text, relPath, contentHash, today);
}

function _parseInner(text, relPath, contentHash, today) {
  const isMd = relPath.endsWith('.md');
  const isHtml = relPath.endsWith('.html');
  const { fm, body } = isMd ? parseFrontmatter(text) : { fm: {}, body: text };
  const todayStr = today.toISOString().slice(0, 10);
  const last_updated = typeof fm.last_updated === 'string' ? fm.last_updated : todayStr;
  const last_verified = typeof fm.last_verified === 'string' ? fm.last_verified : last_updated;
  let daysSinceVerified = 0;
  try {
    const v = new Date(last_verified);
    if (!Number.isNaN(v.getTime())) daysSinceVerified = daysBetween(v, today);
  } catch {}

  let html = '';
  let headings = [];
  if (isMd) { html = renderMd(body); headings = extractHeadings(body); }
  else if (isHtml) { html = `<div class="kb-html-embed">${body}</div>`; }

  const frontmatter = {
    title: typeof fm.title === 'string' ? fm.title : '',
    type: normType(fm.type),
    status: normStatus(fm.status),
    owner: typeof fm.owner === 'string' ? fm.owner : '',
    time_state: normTime(fm.time_state),
    verification: normVerif(fm.verification),
    last_updated,
    last_verified,
    last_verified_commit: typeof fm.last_verified_commit === 'string' ? fm.last_verified_commit : null,
    source_of_truth: typeof fm.source_of_truth === 'string' ? fm.source_of_truth : null,
    related_strong: asStringArray(fm.related_strong),
    related_weak: [...asStringArray(fm.related_weak), ...asStringArray(fm.related)],
    released_in: typeof fm.released_in === 'string' ? fm.released_in : null,
    tags: asStringArray(fm.tags),
  };

  return {
    summary: {
      path: toPosix(relPath),
      title: typeof fm.title === 'string' ? fm.title : titleFromBody(body, relPath.split(/[\\/]/).pop()),
      type: normType(fm.type),
      status: normStatus(fm.status),
      verification: normVerif(fm.verification),
      time_state: normTime(fm.time_state),
      owner: typeof fm.owner === 'string' ? fm.owner : '',
      last_updated,
      last_verified,
      daysSinceVerified,
      stale: daysSinceVerified >= 60,
      tags: asStringArray(fm.tags),
      fileKind: isMd ? 'md' : (isHtml ? 'html' : 'other'),
    },
    doc: {
      path: toPosix(relPath),
      frontmatter,
      headings,
      html,
    },
    contentHash,
    rawText: text,   // full file contents (frontmatter + body), used by DB for restore
  };
}

// Walks a directory and returns { node, docCount, stalest }. Only counts files
// matching ALLOWED_EXT. Returns null node if the directory does not exist or
// contains no allowed files at any depth.
export function walkRoot(absDir, relDir, today = new Date()) {
  if (!existsSync(absDir)) return { node: null, docCount: 0, stalest: null };
  const st = statSync(absDir);
  if (!st.isDirectory()) return { node: null, docCount: 0, stalest: null };

  const entries = readDirSorted(absDir);
  const children = [];
  let docCount = 0;
  let stalest = null;

  for (const name of entries) {
    if (name.startsWith('.') && name !== '.github') continue;
    if (SKIP_DIRS.has(name)) continue;
    const abs = join(absDir, name);
    const rel = posix.join(relDir, name);
    let s;
    try { s = statSync(abs); } catch { continue; }
    if (s.isDirectory()) {
      const folder = walkRoot(abs, rel, today);
      if (!folder.node || folder.docCount === 0) continue;
      docCount += folder.docCount;
      if (folder.stalest && (!stalest || folder.stalest.daysSinceVerified > stalest.daysSinceVerified)) {
        stalest = folder.stalest;
      }
      children.push(folder.node);
    } else {
      const dot = name.lastIndexOf('.');
      const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
      if (!ALLOWED_EXT.has(ext)) continue;
      const summary = parseDocSummary(abs, rel, today);
      docCount += 1;
      if (summary.daysSinceVerified >= 60 && (!stalest || summary.daysSinceVerified > stalest.daysSinceVerified)) {
        stalest = { path: summary.path, daysSinceVerified: summary.daysSinceVerified };
      }
      children.push({ kind: 'doc', ...summary });
    }
  }

  const node = {
    kind: 'folder',
    path: relDir,
    title: relDir.split('/').pop() || relDir,
    docCount,
    stalest,
    children,
  };
  return { node, docCount, stalest };
}

// Default candidate roots — folders likely to be mounted. The L3 collector
// seeds kb.rootCandidates with this list, then merges in any auto-discovered
// top-level folders that contain allowed files.
export const DEFAULT_CANDIDATE_ROOTS = [
  { path: 'knowledge-base', label: 'knowledge-base', defaultActive: true },
  { path: 'notes',          label: 'notes',          defaultActive: false },
  { path: 'svfactory',      label: 'svfactory',      defaultActive: false },
  { path: 'test',           label: 'test',           defaultActive: false },
  { path: '.github',        label: '.github',        defaultActive: false },
];

// -----------------------------------------------------------------------------
// Slice B helpers: candidate discovery + root validation
// -----------------------------------------------------------------------------

// Returns true if `dir` (absolute path) contains at least one .md or .html at
// any depth. Bounded scan: stops on first hit. Skips SKIP_DIRS.
export function hasAllowedFiles(absDir) {
  let stack = [absDir];
  let scanned = 0;
  while (stack.length > 0 && scanned < 5000) {
    const current = stack.pop();
    scanned += 1;
    let entries;
    try { entries = readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.name.startsWith('.') && e.name !== '.github') continue;
      if (SKIP_DIRS.has(e.name)) continue;
      if (e.isDirectory()) {
        stack.push(join(current, e.name));
      } else if (e.isFile()) {
        const dot = e.name.lastIndexOf('.');
        const ext = dot >= 0 ? e.name.slice(dot).toLowerCase() : '';
        if (ALLOWED_EXT.has(ext)) return true;
      }
    }
  }
  return false;
}

// Validates a path relative to `repoRoot`. Returns { ok, reason, normalized }.
// - rejects empty/non-string
// - rejects paths that resolve outside repoRoot (..-traversal, symlinks-out)
// - rejects non-existent paths
// - rejects non-directories
// - rejects directories with no allowed files at any depth
export function validateCandidateRoot(repoRoot, requestedPath) {
  if (typeof requestedPath !== 'string' || requestedPath.trim() === '') {
    return { ok: false, reason: 'path must be a non-empty string' };
  }
  const trimmed = requestedPath.trim().replace(/^[/\\]+/, '');
  const abs = resolvePath(repoRoot, trimmed);
  let realAbs;
  try { realAbs = realpathSync(abs); } catch {
    return { ok: false, reason: 'path does not exist' };
  }
  const realRepo = realpathSync(repoRoot);
  const rel = relativePath(realRepo, realAbs);
  if (rel.startsWith('..') || isAbsolute(rel) || rel === '') {
    return { ok: false, reason: 'path resolves outside the workspace' };
  }
  let s;
  try { s = statSync(realAbs); } catch {
    return { ok: false, reason: 'path is not accessible' };
  }
  if (!s.isDirectory()) {
    return { ok: false, reason: 'path is not a directory' };
  }
  if (!hasAllowedFiles(realAbs)) {
    return { ok: false, reason: 'directory contains no .md or .html files' };
  }
  return { ok: true, normalized: rel.split(/[\\/]+/).join('/') };
}

// Auto-discover candidate roots: top-level entries in repoRoot that pass
// hasAllowedFiles. Does not recurse below one level — discovery is just for
// the workspace-folders dialog; deeper mounting is via explicit POST.
export function discoverCandidateRoots(repoRoot, defaults = DEFAULT_CANDIDATE_ROOTS) {
  const seen = new Set();
  const out = [];
  for (const d of defaults) {
    seen.add(d.path);
    const abs = join(repoRoot, d.path);
    if (existsSync(abs) && hasAllowedFiles(abs)) {
      out.push({ path: d.path, label: d.label, defaultActive: !!d.defaultActive, source: 'default' });
    }
  }
  let entries;
  try { entries = readdirSync(repoRoot, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('.') && e.name !== '.github') continue;
    if (SKIP_DIRS.has(e.name)) continue;
    if (seen.has(e.name)) continue;
    const abs = join(repoRoot, e.name);
    if (hasAllowedFiles(abs)) {
      out.push({ path: e.name, label: e.name, defaultActive: false, source: 'discovered' });
    }
  }
  return out;
}
