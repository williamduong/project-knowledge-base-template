#!/usr/bin/env node
// Generates site/uiv2/src/app/mock/kb-data.generated.ts from the real
// knowledge-base/ folder. This is slice-1 mock data: replace this generator
// with the real /api/kb/tree + /api/kb/doc endpoints when the runtime
// contract in notes/kbx-ui-kb-page-runtime-contract.md ships.
//
// Run: node scripts/gen-kb-mock.mjs
//
// What it does:
// - Walks knowledge-base/ recursively (only .md files, skips .kb cache).
// - Parses YAML frontmatter when present.
// - Emits a TS module with a typed tree + per-doc content (html = raw markdown
//   wrapped in <pre>, good enough for slice 1; a real renderer comes later).

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const repoRoot = join(fileURLToPath(import.meta.url), '..', '..')
const kbRoot = join(repoRoot, 'knowledge-base')
const outFile = join(repoRoot, 'site/uiv2/src/app/mock/kb-data.generated.ts')

const today = new Date()
const todayStr = today.toISOString().slice(0, 10)

function toPosix(p) {
  return p.split('\\').join('/')
}

function daysBetween(a, b) {
  const ms = b.getTime() - a.getTime()
  return Math.max(0, Math.round(ms / 86400000))
}

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return { fm: {}, body: text }
  const end = text.indexOf('\n---', 3)
  if (end < 0) return { fm: {}, body: text }
  const raw = text.slice(3, end).trim()
  const body = text.slice(end + 4).replace(/^\r?\n/, '')
  try {
    const fm = yaml.load(raw) || {}
    return { fm, body }
  } catch {
    return { fm: {}, body }
  }
}

const ALLOWED_TYPES = new Set([
  'orientation', 'concept', 'architecture', 'reference', 'implementation',
  'decision', 'guide', 'operations', 'test-strategy', 'governance',
])
const ALLOWED_STATUS = new Set(['active', 'draft', 'deprecated', 'archived'])
const ALLOWED_VERIF = new Set(['code-verified', 'design-only', 'unverified', 'self-referential'])
const ALLOWED_TIME = new Set(['current', 'to_be', 'mixed', 'historical', 'timeless'])

function normalizeType(v)   { return ALLOWED_TYPES.has(v) ? v : 'unknown' }
function normalizeStatus(v) { return ALLOWED_STATUS.has(v) ? v : 'unknown' }
function normalizeVerif(v)  { return ALLOWED_VERIF.has(v)  ? v : 'unknown' }
function normalizeTime(v)   { return ALLOWED_TIME.has(v)   ? v : 'unknown' }

function asStringArray(v) {
  if (!Array.isArray(v)) return []
  return v.filter((x) => typeof x === 'string')
}

function readDirSorted(dir) {
  return readdirSync(dir).sort((a, b) => a.localeCompare(b))
}

function titleFromBody(body, fallback) {
  const m = body.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : fallback
}

// Minimal markdown-to-html for slice 1 (headings, paragraphs, code fences,
// bullets, inline code, bold/italic, links). Not a full renderer; the real
// /api/kb/doc owns server-side rendering later.
function tinyMd(md) {
  const lines = md.split(/\r?\n/)
  const out = []
  let i = 0
  let inCode = false
  let codeBuf = []
  let inList = false
  let para = []

  function flushPara() {
    if (para.length) {
      out.push('<p>' + inline(para.join(' ')) + '</p>')
      para = []
    }
  }
  function closeList() {
    if (inList) { out.push('</ul>'); inList = false }
  }
  function inline(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  }
  function slug(s) {
    return s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
  }

  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('```')) {
      flushPara(); closeList()
      if (inCode) {
        out.push('<pre><code>' + codeBuf.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</code></pre>')
        codeBuf = []; inCode = false
      } else { inCode = true }
      i++; continue
    }
    if (inCode) { codeBuf.push(line); i++; continue }
    const h = line.match(/^(#{1,6})\s+(.+)$/)
    if (h) {
      flushPara(); closeList()
      const lv = h[1].length
      const text = h[2].trim()
      out.push(`<h${lv} id="${slug(text)}">${inline(text)}</h${lv}>`)
      i++; continue
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara()
      if (!inList) { out.push('<ul>'); inList = true }
      out.push('<li>' + inline(line.replace(/^[-*]\s+/, '')) + '</li>')
      i++; continue
    }
    if (line.trim() === '') {
      flushPara(); closeList()
      i++; continue
    }
    para.push(line)
    i++
  }
  flushPara(); closeList()
  return out.join('\n')
}

function extractHeadings(md) {
  const headings = []
  let inCode = false
  for (const line of md.split(/\r?\n/)) {
    if (line.startsWith('```')) { inCode = !inCode; continue }
    if (inCode) continue
    const m = line.match(/^(#{2,3})\s+(.+)$/)
    if (m) {
      const text = m[2].trim()
      headings.push({
        id: text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
        level: m[1].length,
        text,
      })
    }
  }
  return headings
}

function buildDocNode(absPath, relPath) {
  const text = readFileSync(absPath, 'utf8')
  const { fm, body } = parseFrontmatter(text)
  const last_updated = typeof fm.last_updated === 'string' ? fm.last_updated : todayStr
  const last_verified = typeof fm.last_verified === 'string' ? fm.last_verified : last_updated
  let daysSinceVerified = 0
  try {
    const v = new Date(last_verified)
    if (!Number.isNaN(v.getTime())) daysSinceVerified = daysBetween(v, today)
  } catch {}

  return {
    rel: toPosix(relPath),
    title: typeof fm.title === 'string' ? fm.title : titleFromBody(body, relPath.split(/[\\/]/).pop()),
    type: normalizeType(fm.type),
    status: normalizeStatus(fm.status),
    verification: normalizeVerif(fm.verification),
    time_state: normalizeTime(fm.time_state),
    owner: typeof fm.owner === 'string' ? fm.owner : '',
    last_updated,
    last_verified,
    daysSinceVerified,
    stale: daysSinceVerified >= 60,
    tags: asStringArray(fm.tags),
    frontmatter: {
      title: typeof fm.title === 'string' ? fm.title : '',
      type: normalizeType(fm.type),
      status: normalizeStatus(fm.status),
      owner: typeof fm.owner === 'string' ? fm.owner : '',
      time_state: normalizeTime(fm.time_state),
      verification: normalizeVerif(fm.verification),
      last_updated,
      last_verified,
      last_verified_commit: typeof fm.last_verified_commit === 'string' ? fm.last_verified_commit : null,
      source_of_truth: typeof fm.source_of_truth === 'string' ? fm.source_of_truth : null,
      related_strong: asStringArray(fm.related_strong),
      related_weak: [...asStringArray(fm.related_weak), ...asStringArray(fm.related)],
      released_in: typeof fm.released_in === 'string' ? fm.released_in : null,
      tags: asStringArray(fm.tags),
    },
    headings: extractHeadings(body),
    html: tinyMd(body),
  }
}

function walk(absDir, relDir) {
  const entries = readDirSorted(absDir)
  const children = []
  let docCount = 0
  let stalest = null
  for (const name of entries) {
    if (name.startsWith('.')) continue
    const abs = join(absDir, name)
    const rel = posix.join(relDir, name)
    const st = statSync(abs)
    if (st.isDirectory()) {
      const folder = walk(abs, rel)
      docCount += folder.docCount
      if (folder.stalest && (!stalest || folder.stalest.daysSinceVerified > stalest.daysSinceVerified)) {
        stalest = folder.stalest
      }
      children.push(folder.node)
    } else if (name.endsWith('.md')) {
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
    title: relDir.split('/').pop() || 'Knowledge Base',
    docCount,
    stalest,
    children: children.map((c) => c.kind === 'folder'
      ? { kind: 'folder', path: c.path, title: c.title, docCount: c.docCount, stalest: c.stalest, children: c.children }
      : c
    ),
  }
  return { node, docCount, stalest }
}

const result = walk(kbRoot, 'knowledge-base')

// Split into tree (lean) + docs (heavy bodies).
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
  // doc node — drop html, frontmatter, headings; keep summary fields used by tree.
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
  }
}

function collectDocs(node, out) {
  if (node.kind === 'folder') {
    for (const c of node.children) collectDocs(c, out)
  } else {
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

const tree = stripDocBodies(result.node)
const docs = collectDocs(result.node, {})

const generatedAt = new Date().toISOString()
const banner = `// AUTO-GENERATED by scripts/gen-kb-mock.mjs at ${generatedAt}
// Do not edit by hand. Regenerate with: node scripts/gen-kb-mock.mjs
// This mock will be replaced by /api/kb/tree + /api/kb/doc once the runtime
// contract in notes/kbx-ui-kb-page-runtime-contract.md ships.
`

const tsBody = `${banner}
import type { KbDocResponse, KbTreeFolderNode, KbTreeResponse } from './kb-mock'

export const kbTreeGenerated: KbTreeResponse = {
  generatedAt: ${JSON.stringify(generatedAt)},
  contentRoot: 'knowledge-base',
  root: ${JSON.stringify(tree, null, 2)} as KbTreeFolderNode,
}

export const kbDocsGenerated: Record<string, KbDocResponse> = ${JSON.stringify(docs, null, 2)}
`

mkdirSync(join(outFile, '..'), { recursive: true })
writeFileSync(outFile, tsBody, 'utf8')
const docCount = Object.keys(docs).length
console.log(`Wrote ${relative(repoRoot, outFile)} — ${docCount} docs, ${tree.docCount} total leaves.`)
