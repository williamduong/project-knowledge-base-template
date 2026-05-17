#!/usr/bin/env node
// Generates site/uiv2/src/app/mock/kb-data.generated.ts from real project
// folders. Slice-1/2 mock data: replace with /api/kb/tree + /api/kb/doc when
// the runtime contract in notes/kbx-ui-kb-page-runtime-contract.md ships.
//
// Run: node scripts/gen-kb-mock.mjs
//
// Multi-root: scans CANDIDATE_ROOTS and emits each as a separate root in the
// tree response. Files outside the allowlist (.md / .html) are skipped — this
// matches the UI rule that any folder can be mounted but only doc-like files
// render.

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, relative, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const repoRoot = join(fileURLToPath(import.meta.url), '..', '..')
const outFile = join(repoRoot, 'site/uiv2/src/app/mock/kb-data.generated.ts')

// Folders considered as "mountable" roots in slice 1 mock. The UI lets the
// user toggle which subset to show. knowledge-base/ is the default.
const CANDIDATE_ROOTS = [
  { path: 'knowledge-base', label: 'knowledge-base', defaultActive: true },
  { path: 'notes',          label: 'notes',          defaultActive: false },
  { path: 'svfactory',      label: 'svfactory',      defaultActive: false },
  { path: 'test',           label: 'test',           defaultActive: false },
  { path: '.github',        label: '.github',        defaultActive: false },
]

// Only emit these extensions in the tree. js/ts/etc are skipped on purpose.
const ALLOWED_EXT = new Set(['.md', '.html'])

// Folder names to skip everywhere.
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.cache', '_cacache', '_logs'])

const today = new Date()
const todayStr = today.toISOString().slice(0, 10)

function toPosix(p) { return p.split('\\').join('/') }
function daysBetween(a, b) { return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000)) }

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return { fm: {}, body: text }
  const end = text.indexOf('\n---', 3)
  if (end < 0) return { fm: {}, body: text }
  const raw = text.slice(3, end).trim()
  const body = text.slice(end + 4).replace(/^\r?\n/, '')
  try { return { fm: yaml.load(raw) || {}, body } } catch { return { fm: {}, body } }
}

const ALLOWED_TYPES = new Set(['orientation', 'concept', 'architecture', 'reference', 'implementation', 'decision', 'guide', 'operations', 'test-strategy', 'governance'])
const ALLOWED_STATUS = new Set(['active', 'draft', 'deprecated', 'archived'])
const ALLOWED_VERIF = new Set(['code-verified', 'design-only', 'unverified', 'self-referential'])
const ALLOWED_TIME = new Set(['current', 'to_be', 'mixed', 'historical', 'timeless'])

function normType(v)  { return ALLOWED_TYPES.has(v) ? v : 'unknown' }
function normStatus(v){ return ALLOWED_STATUS.has(v) ? v : 'unknown' }
function normVerif(v) { return ALLOWED_VERIF.has(v)  ? v : 'unknown' }
function normTime(v)  { return ALLOWED_TIME.has(v)   ? v : 'unknown' }
function asStringArray(v) { return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [] }

function titleFromBody(body, fallback) {
  const m = body.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : fallback
}

// -----------------------------------------------------------------------------
// Markdown renderer — supports: headings, paragraphs, fenced code (with lang),
// unordered + ordered lists, blockquotes, horizontal rules, GFM-style tables,
// inline code, bold, italic, links, images.
// Not a CommonMark validator; it's "good enough" for KB doc rendering until
// the real /api/kb/doc owns server-side rendering.
// -----------------------------------------------------------------------------

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function slug(s) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
}
function inline(s) {
  let out = escapeHtml(s)
  // images first to avoid clashing with links
  out = out.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
  // links
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  // inline code
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  // bold
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // italic
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  // strikethrough
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  return out
}

function renderMd(md) {
  const lines = md.split(/\r?\n/)
  const out = []
  let i = 0

  function isTableRow(s) { return /^\s*\|.*\|\s*$/.test(s) }
  function isTableSep(s) { return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(s) }

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      const lang = fence[1] || ''
      const buf = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++ }
      i++ // consume closing fence
      const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : ''
      out.push(`<pre><code${langClass}>${escapeHtml(buf.join('\n'))}</code></pre>`)
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out.push('<hr/>'); i++; continue }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (h) {
      const lv = h[1].length, text = h[2].trim()
      out.push(`<h${lv} id="${slug(text)}">${inline(text)}</h${lv}>`)
      i++; continue
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`)
      continue
    }

    // Table (GFM)
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      i += 2
      const rows = []
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
        i++
      }
      const thead = '<thead><tr>' + header.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead>'
      const tbody = '<tbody>' + rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody>'
      out.push(`<table>${thead}${tbody}</table>`)
      continue
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      out.push('<ol>' + items.map((t) => `<li>${inline(t)}</li>`).join('') + '</ol>')
      continue
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''))
        i++
      }
      out.push('<ul>' + items.map((t) => `<li>${inline(t)}</li>`).join('') + '</ul>')
      continue
    }

    // Blank line — paragraph separator
    if (line.trim() === '') { i++; continue }

    // Paragraph (collects until blank line or block boundary)
    const buf = [line]; i++
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
    ) { buf.push(lines[i]); i++ }
    out.push(`<p>${inline(buf.join(' '))}</p>`)
  }

  return out.join('\n')
}

function extractHeadings(md) {
  const headings = []
  let inCode = false
  for (const line of md.split(/\r?\n/)) {
    if (/^```/.test(line)) { inCode = !inCode; continue }
    if (inCode) continue
    const m = line.match(/^(#{2,3})\s+(.+)$/)
    if (m) {
      const text = m[2].trim()
      headings.push({ id: slug(text), level: m[1].length, text })
    }
  }
  return headings
}

// -----------------------------------------------------------------------------
// Walk
// -----------------------------------------------------------------------------

function readDirSorted(dir) { return readdirSync(dir).sort((a, b) => a.localeCompare(b)) }

function buildDocNode(absPath, relPath) {
  const text = readFileSync(absPath, 'utf8')
  const isMd = relPath.endsWith('.md')
  const isHtml = relPath.endsWith('.html')
  const { fm, body } = isMd ? parseFrontmatter(text) : { fm: {}, body: text }
  const last_updated = typeof fm.last_updated === 'string' ? fm.last_updated : todayStr
  const last_verified = typeof fm.last_verified === 'string' ? fm.last_verified : last_updated
  let daysSinceVerified = 0
  try {
    const v = new Date(last_verified)
    if (!Number.isNaN(v.getTime())) daysSinceVerified = daysBetween(v, today)
  } catch {}

  let html = ''
  let headings = []
  if (isMd) {
    html = renderMd(body)
    headings = extractHeadings(body)
  } else if (isHtml) {
    // Embed raw HTML inside a sandbox container; trust local files.
    html = `<div class="kb-html-embed">${body}</div>`
  }

  return {
    rel: toPosix(relPath),
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
    frontmatter: {
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
    },
    headings,
    html,
  }
}

function walk(absDir, relDir) {
  if (!existsSync(absDir)) return { node: null, docCount: 0, stalest: null }
  const st = statSync(absDir)
  if (!st.isDirectory()) return { node: null, docCount: 0, stalest: null }

  const entries = readDirSorted(absDir)
  const children = []
  let docCount = 0
  let stalest = null

  for (const name of entries) {
    if (name.startsWith('.') && name !== '.github') continue
    if (SKIP_DIRS.has(name)) continue
    const abs = join(absDir, name)
    const rel = posix.join(relDir, name)
    let s
    try { s = statSync(abs) } catch { continue }
    if (s.isDirectory()) {
      const folder = walk(abs, rel)
      if (!folder.node) continue
      if (folder.docCount === 0) continue // skip empty branches (no allowed files anywhere)
      docCount += folder.docCount
      if (folder.stalest && (!stalest || folder.stalest.daysSinceVerified > stalest.daysSinceVerified)) {
        stalest = folder.stalest
      }
      children.push(folder.node)
    } else {
      const dot = name.lastIndexOf('.')
      const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ''
      if (!ALLOWED_EXT.has(ext)) continue
      const doc = buildDocNode(abs, rel)
      docCount += 1
      if (doc.daysSinceVerified >= 60 && (!stalest || doc.daysSinceVerified > stalest.daysSinceVerified)) {
        stalest = { path: doc.rel, daysSinceVerified: doc.daysSinceVerified }
      }
      children.push({ kind: 'doc', ...doc })
    }
  }

  const node = {
    kind: 'folder',
    path: relDir,
    title: relDir.split('/').pop() || relDir,
    docCount,
    stalest,
    children,
  }
  return { node, docCount, stalest }
}

function stripDocBodies(node) {
  if (node.kind === 'folder') {
    return {
      kind: 'folder',
      path: node.path,
      title: node.title,
      docCount: node.docCount,
      stalest: node.stalest,
      children: node.children.map(stripDocBodies),
    }
  }
  return {
    kind: 'doc',
    path: node.rel,
    title: node.title,
    type: node.type,
    status: node.status,
    verification: node.verification,
    time_state: node.time_state,
    owner: node.owner,
    last_updated: node.last_updated,
    last_verified: node.last_verified,
    daysSinceVerified: node.daysSinceVerified,
    stale: node.stale,
    tags: node.tags,
    fileKind: node.fileKind,
  }
}

function collectDocs(node, out) {
  if (node.kind === 'folder') for (const c of node.children) collectDocs(c, out)
  else {
    out[node.rel] = {
      path: node.rel,
      frontmatter: node.frontmatter,
      headings: node.headings,
      html: node.html,
      fromCache: true,
      snapshotAt: new Date().toISOString(),
    }
  }
  return out
}

// Build all roots.
const rootsOut = []
const docs = {}
let totalDocs = 0
for (const r of CANDIDATE_ROOTS) {
  const abs = join(repoRoot, r.path)
  const result = walk(abs, r.path)
  if (!result.node) continue
  const stripped = stripDocBodies(result.node)
  rootsOut.push({ ...stripped, label: r.label, defaultActive: r.defaultActive })
  collectDocs(result.node, docs)
  totalDocs += result.docCount
}

const generatedAt = new Date().toISOString()
const banner = `// AUTO-GENERATED by scripts/gen-kb-mock.mjs at ${generatedAt}
// Do not edit by hand. Regenerate with: node scripts/gen-kb-mock.mjs
// Replaced by /api/kb/tree + /api/kb/doc when the runtime contract in
// notes/kbx-ui-kb-page-runtime-contract.md ships.
`

const tsBody = `${banner}
import type { KbDocResponse, KbRootDescriptor, KbTreeResponse } from './kb-mock'

export const kbTreeGenerated: KbTreeResponse = {
  generatedAt: ${JSON.stringify(generatedAt)},
  roots: ${JSON.stringify(rootsOut, null, 2)} as unknown as KbTreeResponse['roots'],
}

export const kbRootCandidates: KbRootDescriptor[] = ${JSON.stringify(
  rootsOut.map((r) => ({ path: r.path, label: r.label, defaultActive: r.defaultActive, docCount: r.docCount })),
  null, 2,
)}

export const kbDocsGenerated: Record<string, KbDocResponse> = ${JSON.stringify(docs, null, 2)}
`

mkdirSync(join(outFile, '..'), { recursive: true })
writeFileSync(outFile, tsBody, 'utf8')
console.log(`Wrote ${relative(repoRoot, outFile)} — ${rootsOut.length} roots, ${totalDocs} docs total.`)
