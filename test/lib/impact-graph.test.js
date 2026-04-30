'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildGraph,
  bfsLimited,
  traverseFrom,
  coerceListField,
  resolveRelatedPath,
  EDGE_KIND_STRONG,
  EDGE_KIND_WEAK,
  NODE_KIND_DOC,
} = require('../../src/lib/impact-graph');

function tmpKb() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-graph-'));
  fs.mkdirSync(path.join(root, 'a'), { recursive: true });
  fs.mkdirSync(path.join(root, 'b'), { recursive: true });
  return root;
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

test('coerceListField: handles array, inline list, single string, empty', () => {
  assert.deepEqual(coerceListField(['a', 'b']), ['a', 'b']);
  assert.deepEqual(coerceListField('[a, b, c]'), ['a', 'b', 'c']);
  assert.deepEqual(coerceListField('["x", "y"]'), ['x', 'y']);
  assert.deepEqual(coerceListField('foo'), ['foo']);
  assert.deepEqual(coerceListField(''), []);
  assert.deepEqual(coerceListField(null), []);
  assert.deepEqual(coerceListField(undefined), []);
});

test('resolveRelatedPath: relative resolution + escape rejection', () => {
  const root = '/r';
  // Note: path.resolve is platform-dependent; on Windows /r becomes C:/r — use existing tmp.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-rrp-'));
  fs.mkdirSync(path.join(tmp, 'a'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'a', 'src.md'), '');
  fs.writeFileSync(path.join(tmp, 'b.md'), '');
  const fromAbs = path.join(tmp, 'a', 'src.md');
  assert.equal(resolveRelatedPath({ contentRoot: tmp, fromDocAbsolute: fromAbs, target: '../b.md' }), 'b.md');
  assert.equal(resolveRelatedPath({ contentRoot: tmp, fromDocAbsolute: fromAbs, target: '../../escape.md' }), null);
});

test('buildGraph: legacy related from one side + related_strong from other → strong wins (undirected)', () => {
  const root = tmpKb();
  writeDoc(root, 'a/x.md', { title: 'X', related: ['../b/y.md'] });
  writeDoc(root, 'b/y.md', { title: 'Y', related_strong: ['../a/x.md'] });

  const { graph, stats } = buildGraph({ contentRoot: root });
  assert.equal(stats.docs, 2);
  // Edges are undirected; same pair declared weak (legacy) on x and strong on y.
  // Strong wins on conflict; one edge total with kind=strong.
  assert.equal(stats.edgesStrong, 1);
  assert.equal(stats.edgesWeak, 0);
  assert.equal(stats.conflictPairs, 1);
  assert.equal(stats.legacyRelatedDocs, 1);
  assert.ok(graph.hasNode('a/x.md'));
  assert.ok(graph.hasNode('b/y.md'));
});

test('buildGraph: pure legacy related (no overlap) → weak edge', () => {
  const root = tmpKb();
  writeDoc(root, 'a/x.md', { title: 'X', related: ['../b/y.md'] });
  writeDoc(root, 'b/y.md', { title: 'Y' });

  const { stats } = buildGraph({ contentRoot: root });
  assert.equal(stats.edgesStrong, 0);
  assert.equal(stats.edgesWeak, 1);
  assert.equal(stats.legacyRelatedDocs, 1);
});

test('buildGraph: explicit strong+weak conflict on same path → conflict counted', () => {
  const root = tmpKb();
  writeDoc(root, 'a/x.md', {
    title: 'X',
    related_strong: ['../b/y.md'],
    related_weak: ['../b/y.md'],
  });
  writeDoc(root, 'b/y.md', { title: 'Y' });

  const { stats } = buildGraph({ contentRoot: root });
  assert.equal(stats.edgesStrong, 1);
  assert.equal(stats.edgesWeak, 0);
  assert.equal(stats.conflictPairs, 1);
});

test('bfsLimited: respects depth and edge kind filter', () => {
  const root = tmpKb();
  writeDoc(root, 'a/1.md', { title: '1', related_strong: ['2.md'] });
  writeDoc(root, 'a/2.md', { title: '2', related_strong: ['3.md'], related_weak: ['../b/x.md'] });
  writeDoc(root, 'a/3.md', { title: '3' });
  writeDoc(root, 'b/x.md', { title: 'X' });

  const { graph } = buildGraph({ contentRoot: root });
  const r = bfsLimited(graph, 'a/1.md', 2, [EDGE_KIND_STRONG]);
  assert.deepEqual(Array.from(r.depthMap.get(0)), ['a/1.md']);
  assert.deepEqual(Array.from(r.depthMap.get(1)), ['a/2.md']);
  assert.deepEqual(Array.from(r.depthMap.get(2)), ['a/3.md']);
  // Weak neighbor b/x.md should NOT appear (depth 2 via weak skipped).
  assert.equal(r.depthMap.has(3), false);
  // Total = 3 nodes (depths 0,1,2)
  assert.equal(r.totalNodes, 3);
});

test('bfsLimited: depth=0 returns only root', () => {
  const root = tmpKb();
  writeDoc(root, 'a/1.md', { title: '1', related_strong: ['2.md'] });
  writeDoc(root, 'a/2.md', { title: '2' });
  const { graph } = buildGraph({ contentRoot: root });
  const r = bfsLimited(graph, 'a/1.md', 0, [EDGE_KIND_STRONG]);
  assert.equal(r.totalNodes, 1);
});

test('bfsLimited: missing node returns empty', () => {
  const root = tmpKb();
  writeDoc(root, 'a/1.md', { title: '1' });
  const { graph } = buildGraph({ contentRoot: root });
  const r = bfsLimited(graph, 'nonexistent.md', 5, [EDGE_KIND_STRONG]);
  assert.equal(r.totalNodes, 0);
});

test('traverseFrom: doc target collects weak neighbors separately', () => {
  const root = tmpKb();
  writeDoc(root, 'a/1.md', {
    title: '1',
    related_strong: ['2.md'],
    related_weak: ['../b/w.md'],
  });
  writeDoc(root, 'a/2.md', { title: '2' });
  writeDoc(root, 'b/w.md', { title: 'W' });
  const { graph } = buildGraph({ contentRoot: root });
  const r = traverseFrom({ graph, target: 'a/1.md', depth: 2 });
  assert.deepEqual(r.weakNeighbors, ['b/w.md']);
  assert.deepEqual(Array.from(r.depthMap.get(1)), ['a/2.md']);
});

test('traverseFrom: depth=5 hard cap behavior on long chain', () => {
  const root = tmpKb();
  // Chain 1 → 2 → 3 → 4 → 5 → 6 (5 hops)
  for (let i = 1; i <= 5; i += 1) {
    writeDoc(root, `a/${i}.md`, { title: `${i}`, related_strong: [`${i + 1}.md`] });
  }
  writeDoc(root, 'a/6.md', { title: '6' });

  const { graph } = buildGraph({ contentRoot: root });
  const r = bfsLimited(graph, 'a/1.md', 5, [EDGE_KIND_STRONG]);
  // depths 0..5 all populated
  for (let d = 0; d <= 5; d += 1) {
    assert.equal(r.depthMap.get(d).size, 1, `depth ${d} should have 1 node`);
  }
});
