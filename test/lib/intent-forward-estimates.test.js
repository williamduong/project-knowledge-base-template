'use strict';

const nodeTest = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('node:fs');
const os = require('os');

const {
  loadForwardEstimatesFromBacklog,
  createBacklogIntent,
  writeIntentFrontmatter,
} = require('../../src/lib/intent');

function test(name, fn) {
  return nodeTest(name, async () => {
    const t = {
      is(actual, expected, message) {
        assert.equal(actual, expected, message);
      },
      deepEqual(actual, expected, message) {
        assert.deepEqual(actual, expected, message);
      },
    };
    await fn(t);
  });
}

function ensureDirSync(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDirSync(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function contentRootOf(tmpDir) {
  return path.join(tmpDir, 'knowledge-base');
}

test('loadForwardEstimatesFromBacklog: returns empty array when no backlog intents exist', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-test-'));
  try {
    const estimates = loadForwardEstimatesFromBacklog(contentRootOf(tmpDir));
    t.deepEqual(estimates, []);
  } finally {
    removeDirSync(tmpDir);
  }
});

test('loadForwardEstimatesFromBacklog: skips intents without estimate_factors', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-test-'));
  try {
    const backlogDir = path.join(tmpDir, 'knowledge-base', 'intents', '_backlog');
    ensureDirSync(backlogDir);

    // Create backlog intent WITHOUT estimate_factors
    const intentPath = path.join(backlogDir, 'test-intent-1.md');
    const frontmatter = `---
slug: test-intent-1
title: Test Intent 1
lifecycle: backlog
---
# Test Intent`;
    fs.writeFileSync(intentPath, frontmatter);

    const estimates = loadForwardEstimatesFromBacklog(contentRootOf(tmpDir));
    t.deepEqual(estimates, []);
  } finally {
    removeDirSync(tmpDir);
  }
});

test('loadForwardEstimatesFromBacklog: loads intent with valid estimate_factors', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-test-'));
  try {
    const backlogDir = path.join(tmpDir, 'knowledge-base', 'intents', '_backlog');
    ensureDirSync(backlogDir);

    // Create backlog intent WITH estimate_factors
    const intentPath = path.join(backlogDir, 'test-intent-1.md');
    const frontmatter = `---
slug: test-intent-1
title: Test Intent 1
lifecycle: backlog
estimate_factors:
  addedUncoveredLOC: 500
  newUncoveredModules: 2
---
# Test Intent`;
    fs.writeFileSync(intentPath, frontmatter);

    const estimates = loadForwardEstimatesFromBacklog(contentRootOf(tmpDir));
    t.is(estimates.length, 1);
    t.is(estimates[0].plan, 'test-intent-1: Test Intent 1');
    t.is(estimates[0].source, 'backlog');
    t.deepEqual(estimates[0].factors, {
      addedUncoveredLOC: '500',
      newUncoveredModules: '2',
    });
  } finally {
    removeDirSync(tmpDir);
  }
});

test('loadForwardEstimatesFromBacklog: skips intent with unsupported factor', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-test-'));
  try {
    const backlogDir = path.join(tmpDir, 'knowledge-base', 'intents', '_backlog');
    ensureDirSync(backlogDir);

    // Create backlog intent WITH INVALID factor
    const intentPath = path.join(backlogDir, 'test-intent-1.md');
    const frontmatter = `---
slug: test-intent-1
title: Test Intent 1
lifecycle: backlog
estimate_factors:
  invalidFactorName: 99
---
# Test Intent`;
    fs.writeFileSync(intentPath, frontmatter);

    const estimates = loadForwardEstimatesFromBacklog(contentRootOf(tmpDir));
    t.deepEqual(estimates, []);
  } finally {
    removeDirSync(tmpDir);
  }
});

test('loadForwardEstimatesFromBacklog: loads multiple intents with valid factors', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-test-'));
  try {
    const backlogDir = path.join(tmpDir, 'knowledge-base', 'intents', '_backlog');
    ensureDirSync(backlogDir);

    // Create first intent
    const intent1Path = path.join(backlogDir, 'intent-1.md');
    fs.writeFileSync(intent1Path, `---
slug: intent-1
title: First Intent
lifecycle: backlog
estimate_factors:
  addedUncoveredLOC: 500
---
# Intent 1`);

    // Create second intent
    const intent2Path = path.join(backlogDir, 'intent-2.md');
    fs.writeFileSync(intent2Path, `---
slug: intent-2
title: Second Intent
lifecycle: backlog
estimate_factors:
  newUncoveredModules: 3
  addedTests: 15
---
# Intent 2`);

    // Create third intent WITHOUT factors (should be skipped)
    const intent3Path = path.join(backlogDir, 'intent-3.md');
    fs.writeFileSync(intent3Path, `---
slug: intent-3
title: Third Intent
lifecycle: backlog
---
# Intent 3`);

    const estimates = loadForwardEstimatesFromBacklog(contentRootOf(tmpDir));
    t.is(estimates.length, 2);

    // Verify order and content
    t.deepEqual(estimates.map(e => e.plan), [
      'intent-1: First Intent',
      'intent-2: Second Intent',
    ]);
  } finally {
    removeDirSync(tmpDir);
  }
});

test('loadForwardEstimatesFromBacklog: validates all supported factors', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-test-'));
  try {
    const backlogDir = path.join(tmpDir, 'knowledge-base', 'intents', '_backlog');
    ensureDirSync(backlogDir);

    // Create intent with ALL supported factors
    const intentPath = path.join(backlogDir, 'comprehensive-intent.md');
    fs.writeFileSync(intentPath, `---
slug: comprehensive-intent
title: Comprehensive Intent
lifecycle: backlog
estimate_factors:
  addedUncoveredLOC: 1000
  newUncoveredModules: 2
  addedHighCoupling: 3
  resolvedHighEntropy: 1
  resolvedHighDebt: 1
  addedTests: 25
  resolvedCoverageDebt: 2
---
# Intent`);

    const estimates = loadForwardEstimatesFromBacklog(contentRootOf(tmpDir));
    t.is(estimates.length, 1);
    t.deepEqual(estimates[0].factors, {
      addedUncoveredLOC: '1000',
      newUncoveredModules: '2',
      addedHighCoupling: '3',
      resolvedHighEntropy: '1',
      resolvedHighDebt: '1',
      addedTests: '25',
      resolvedCoverageDebt: '2',
    });
  } finally {
    removeDirSync(tmpDir);
  }
});

test('loadForwardEstimatesFromBacklog: silently skips malformed intent metadata', (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-test-'));
  try {
    const backlogDir = path.join(tmpDir, 'knowledge-base', 'intents', '_backlog');
    ensureDirSync(backlogDir);

    // Create valid intent
    const validPath = path.join(backlogDir, 'valid-intent.md');
    fs.writeFileSync(validPath, `---
slug: valid-intent
title: Valid Intent
lifecycle: backlog
estimate_factors:
  addedTests: 10
---
# Valid`);

    // Create malformed intent (missing frontmatter end)
    const malformedPath = path.join(backlogDir, 'malformed-intent.md');
    fs.writeFileSync(malformedPath, `---
slug: malformed
title: Malformed
lifecycle: backlog
# Missing closing ---
# Content`);

    const estimates = loadForwardEstimatesFromBacklog(contentRootOf(tmpDir));
    // Should only load the valid one
    t.is(estimates.length, 1);
    t.is(estimates[0].plan, 'valid-intent: Valid Intent');
  } finally {
    removeDirSync(tmpDir);
  }
});
