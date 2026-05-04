// Prototype Phase 0 v1.4 — build adhoc graph from `related:` frontmatter, BFS depth=2.
// Run: node notes/v1.4-phase0-prototype.js [target-doc-path]

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'template');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.isFile() && p.endsWith('.md')) out.push(p);
  }
  return out;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  return m[1];
}

function parseRelated(fmText) {
  // Match `related:` block followed by `  - <value>` lines until next top-level key or end.
  const m = fmText.match(/^related:\s*\n((?:[ \t]+-[^\n]*\n?)*)/m);
  if (!m) {
    // inline `related: []` or `related: [a, b]`
    const inline = fmText.match(/^related:\s*\[(.*?)\]/m);
    if (inline) {
      return inline[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }
    return [];
  }
  return m[1]
    .split(/\r?\n/)
    .map((l) => l.replace(/^[ \t]+-\s*/, '').trim())
    .filter(Boolean)
    .map((s) => s.replace(/^["']|["']$/g, ''));
}

function normalize(docAbsPath, refRel) {
  // refRel may be a relative md path. Resolve against doc dir, then make repo-relative.
  if (!refRel) return null;
  const docDir = path.dirname(docAbsPath);
  const resolved = path.resolve(docDir, refRel);
  const rel = path.relative(ROOT, resolved).replace(/\\/g, '/');
  if (rel.startsWith('..')) return null;
  return rel;
}

function repoRel(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, '/');
}

// 1. Build graph
const files = walk(ROOT);
const graph = new Map(); // key: repo-rel path, value: Set of repo-rel related paths
const allKeys = new Set();

for (const abs of files) {
  const raw = fs.readFileSync(abs, 'utf8');
  const fm = parseFrontmatter(raw);
  const key = repoRel(abs);
  allKeys.add(key);
  if (!graph.has(key)) graph.set(key, new Set());
  if (!fm) continue;
  const related = parseRelated(fm);
  for (const r of related) {
    const norm = normalize(abs, r);
    if (norm && norm !== key) graph.get(key).add(norm);
  }
}

// 2. Add reverse edges (related is intended bidirectional per metadata-schema discussion)
for (const [k, neighbors] of graph) {
  for (const n of neighbors) {
    if (!graph.has(n)) graph.set(n, new Set());
    graph.get(n).add(k);
  }
}

// 3. BFS from a target
function bfs(target, maxDepth = 2) {
  const visited = new Map(); // key -> depth
  visited.set(target, 0);
  const queue = [[target, 0]];
  while (queue.length) {
    const [node, d] = queue.shift();
    if (d >= maxDepth) continue;
    const neighbors = graph.get(node) || new Set();
    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.set(n, d + 1);
        queue.push([n, d + 1]);
      }
    }
  }
  return visited;
}

// 4. Pick test targets: docs with related[] non-empty
const candidates = [...graph.entries()]
  .filter(([k, v]) => v.size > 0 && fs.existsSync(path.join(ROOT, k)))
  .map(([k]) => k);

console.log(`# Total docs scanned: ${allKeys.size}`);
console.log(`# Docs with related[] edges (in or out): ${candidates.length}`);
console.log(`# Top docs by edge count:`);
const ranked = candidates
  .map((k) => [k, graph.get(k).size])
  .sort((a, b) => b[1] - a[1]);
for (const [k, c] of ranked.slice(0, 15)) {
  console.log(`  ${c}\t${k}`);
}

// 5. Dump depth-2 expansion for top N targets (or one passed via argv)
const argTarget = process.argv[2];
const targets = argTarget ? [argTarget] : ranked.slice(0, 8).map(([k]) => k);

for (const t of targets) {
  console.log(`\n## Target: ${t}`);
  const visited = bfs(t, 2);
  const byDepth = { 1: [], 2: [] };
  for (const [k, d] of visited) {
    if (d === 1 || d === 2) byDepth[d].push(k);
  }
  console.log(`  depth=1 (${byDepth[1].length}):`);
  for (const k of byDepth[1].sort()) console.log(`    - ${k}`);
  console.log(`  depth=2 (${byDepth[2].length}):`);
  for (const k of byDepth[2].sort()) console.log(`    - ${k}`);
}
