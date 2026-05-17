import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.mjs'), 'utf8');

function expectRouteUsesSnapshot(pathLiteral, expectedSnippet) {
  const start = serverSource.indexOf(`app.get('${pathLiteral}'`);
  assert.notEqual(start, -1, `route ${pathLiteral} should exist`);
  const nextRoute = serverSource.indexOf("\n  app.", start + 1);
  const routeBlock = serverSource.slice(start, nextRoute === -1 ? undefined : nextRoute);
  assert.match(routeBlock, expectedSnippet, `${pathLiteral} should use snapshot-backed response`);
  return routeBlock;
}

test('read routes are snapshot-backed', () => {
  expectRouteUsesSnapshot('/api/status', /systemSnapshotStore\.read\(\)\.status/);
  expectRouteUsesSnapshot('/api/rules', /systemSnapshotStore\.read\(\)\.rulesCatalog/);
  expectRouteUsesSnapshot('/api/workspace', /systemSnapshotStore\.read\(\)\.workspace/);
  expectRouteUsesSnapshot('/api/session-context', /systemSnapshotStore\.read\(\)\.sessionContext/);
  expectRouteUsesSnapshot('/api/system', /systemSnapshotStore\.read\(\)\.system/);
  expectRouteUsesSnapshot('/api/home-summary', /systemSnapshotStore\.read\(\)\.homeSummary/);
  expectRouteUsesSnapshot('/api/system-snapshot', /systemSnapshotStore\.read\(\)/);
  expectRouteUsesSnapshot('/api/phase2-bridge', /systemSnapshotStore\.read\(\)\.diagnostics\.phase2Bridge/);
});

test('intent detail route is pure and evidence route owns git enrichment', () => {
  const detailRoute = expectRouteUsesSnapshot('/api/intents/:id/detail', /includeGit:\s*false/);
  assert.doesNotMatch(detailRoute, /includeGit:\s*true/, 'detail route must stay git-free');
  const evidenceRoute = expectRouteUsesSnapshot('/api/intents/:id/evidence', /includeGit:\s*true/);
  assert.match(evidenceRoute, /summarizeIntentDetail/, 'evidence route should own git enrichment');
});

test('server wires dedicated snapshot store module', () => {
  assert.match(serverSource, /import\s+\{\s*createSystemSnapshotStore\s*\}\s+from '\.\/system-snapshot-store\.mjs'/);
  assert.match(serverSource, /const systemSnapshotStore = createSystemSnapshotStore\(/);
  assert.match(serverSource, /systemSnapshotStore\.start\(\{ warm: true, intervalMs: SYSTEM_SNAPSHOT_TTL_MS \}\)/);
});
