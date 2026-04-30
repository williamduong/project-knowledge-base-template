'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildGraph,
  findRecursiveImpact,
  findStrongCycles,
} = require('../../src/lib/impact-graph');

function tmpKb() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-recursive-'));
}

function writeDoc(root, rel, frontmatter) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const lines = ['---'];
  for (const [k, v] of Object.entries(frontmatter)) {
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      for (const item of v) lines.push(`  - ${item}`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push('---', '', '# ' + rel, '');
  fs.writeFileSync(abs, lines.join('\n'), 'utf8');
}

test('findRecursiveImpact: empty roots returns empty map', () => {
  const root = tmpKb();
  writeDoc(root, 'a.md', { title: 'A' });
  const { graph } = buildGraph({ contentRoot: root });
  const r = findRecursiveImpact({ graph, roots: [], depth: 2 });
  assert.equal(r.size, 0);
});

test('findRecursiveImpact: depth 0 returns empty (no traversal)', () => {
  const root = tmpKb();
  writeDoc(root, 'a.md', { title: 'A', related_strong: ['b.md'] });
  writeDoc(root, 'b.md', { title: 'B' });
  const { graph } = buildGraph({ contentRoot: root });
  const r = findRecursiveImpact({ graph, roots: ['a.md'], depth: 0 });
  assert.equal(r.size, 0);
});

test('findRecursiveImpact: traverses related_strong only, not weak', () => {
  const root = tmpKb();
  writeDoc(root, 'a.md', { title: 'A', related_strong: ['b.md'], related_weak: ['w.md'] });
  writeDoc(root, 'b.md', { title: 'B', related_strong: ['c.md'] });
  writeDoc(root, 'c.md', { title: 'C' });
  writeDoc(root, 'w.md', { title: 'W' });

  const { graph } = buildGraph({ contentRoot: root });
  const r = findRecursiveImpact({ graph, roots: ['a.md'], depth: 2 });
  assert.equal(r.size, 2);
  assert.deepEqual(r.get('b.md'), { depth: 1, from: ['a.md'] });
  assert.deepEqual(r.get('c.md'), { depth: 2, from: ['b.md'] });
  assert.equal(r.has('w.md'), false);
});

test('findRecursiveImpact: depth 1 stops at one hop', () => {
  const root = tmpKb();
  writeDoc(root, 'a.md', { title: 'A', related_strong: ['b.md'] });
  writeDoc(root, 'b.md', { title: 'B', related_strong: ['c.md'] });
  writeDoc(root, 'c.md', { title: 'C' });
  const { graph } = buildGraph({ contentRoot: root });
  const r = findRecursiveImpact({ graph, roots: ['a.md'], depth: 1 });
  assert.equal(r.size, 1);
  assert.ok(r.has('b.md'));
  assert.equal(r.has('c.md'), false);
});

test('findRecursiveImpact: roots themselves excluded from result', () => {
  const root = tmpKb();
  writeDoc(root, 'a.md', { title: 'A', related_strong: ['b.md'] });
  writeDoc(root, 'b.md', { title: 'B' });
  const { graph } = buildGraph({ contentRoot: root });
  const r = findRecursiveImpact({ graph, roots: ['a.md', 'b.md'], depth: 2 });
  // a → b is hit but b is also a root, so excluded.
  assert.equal(r.has('a.md'), false);
  assert.equal(r.has('b.md'), false);
});

test('findRecursiveImpact: multi-source merges parents at same shortest depth', () => {
  const root = tmpKb();
  // a → c, b → c, both depth 1 from their own root.
  writeDoc(root, 'a.md', { title: 'A', related_strong: ['c.md'] });
  writeDoc(root, 'b.md', { title: 'B', related_strong: ['c.md'] });
  writeDoc(root, 'c.md', { title: 'C' });
  const { graph } = buildGraph({ contentRoot: root });
  const r = findRecursiveImpact({ graph, roots: ['a.md', 'b.md'], depth: 2 });
  const c = r.get('c.md');
  assert.equal(c.depth, 1);
  assert.deepEqual(c.from, ['a.md', 'b.md']);
});

test('findRecursiveImpact: cycle does not loop infinitely', () => {
  const root = tmpKb();
  writeDoc(root, 'a.md', { title: 'A', related_strong: ['b.md'] });
  writeDoc(root, 'b.md', { title: 'B', related_strong: ['c.md'] });
  writeDoc(root, 'c.md', { title: 'C', related_strong: ['a.md'] });
  const { graph } = buildGraph({ contentRoot: root });
  const r = findRecursiveImpact({ graph, roots: ['a.md'], depth: 5 });
  // Undirected triangle: from a, both b (a↔b) and c (a↔c via c.related_strong) are 1 hop.
  // Root excluded; cycle prevents infinite loop (each visited at shortest depth only).
  assert.equal(r.size, 2);
  assert.equal(r.get('b.md').depth, 1);
  assert.equal(r.get('c.md').depth, 1);
});

test('findRecursiveImpact: ignores roots not in graph', () => {
  const root = tmpKb();
  writeDoc(root, 'a.md', { title: 'A' });
  const { graph } = buildGraph({ contentRoot: root });
  const r = findRecursiveImpact({ graph, roots: ['nonexistent.md'], depth: 2 });
  assert.equal(r.size, 0);
});

test('findStrongCycles: no cycles in a tree', () => {
  const root = tmpKb();
  writeDoc(root, 'a.md', { title: 'A', related_strong: ['b.md'] });
  writeDoc(root, 'b.md', { title: 'B', related_strong: ['c.md'] });
  writeDoc(root, 'c.md', { title: 'C' });
  const { graph } = buildGraph({ contentRoot: root });
  assert.deepEqual(findStrongCycles(graph), []);
});

test('findStrongCycles: detects 3-cycle', () => {
  const root = tmpKb();
  writeDoc(root, 'a.md', { title: 'A', related_strong: ['b.md'] });
  writeDoc(root, 'b.md', { title: 'B', related_strong: ['c.md'] });
  writeDoc(root, 'c.md', { title: 'C', related_strong: ['a.md'] });
  const { graph } = buildGraph({ contentRoot: root });
  const cycles = findStrongCycles(graph);
  assert.equal(cycles.length, 1);
  const set = new Set(cycles[0]);
  assert.equal(set.size, 3);
  assert.ok(set.has('a.md'));
  assert.ok(set.has('b.md'));
  assert.ok(set.has('c.md'));
});

test('findStrongCycles: 2-node back-and-forth is NOT a cycle (undirected dedup)', () => {
  const root = tmpKb();
  writeDoc(root, 'a.md', { title: 'A', related_strong: ['b.md'] });
  writeDoc(root, 'b.md', { title: 'B', related_strong: ['a.md'] });
  const { graph } = buildGraph({ contentRoot: root });
  assert.deepEqual(findStrongCycles(graph), []);
});

test('findStrongCycles: ignores weak edges in cycle', () => {
  const root = tmpKb();
  writeDoc(root, 'a.md', { title: 'A', related_strong: ['b.md'] });
  writeDoc(root, 'b.md', { title: 'B', related_weak: ['c.md'] });
  writeDoc(root, 'c.md', { title: 'C', related_strong: ['a.md'] });
  const { graph } = buildGraph({ contentRoot: root });
  // Strong subgraph: a-b, c-a. b and c connected only via weak → no strong cycle.
  assert.deepEqual(findStrongCycles(graph), []);
});
