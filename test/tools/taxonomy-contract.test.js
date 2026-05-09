'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = path.resolve(__dirname, '..', '..');

function read(fileRelativePath) {
  const absolute = path.join(workspaceRoot, fileRelativePath);
  return fs.readFileSync(absolute, 'utf8');
}

function hasAll(text, requiredSnippets) {
  return requiredSnippets.every((snippet) => text.includes(snippet));
}

const canonicalBoundarySnippets = [
  'defines governance contracts',
  'KBAgent is a downstream agent family instantiated from that contract',
  'kbx CLI is the deterministic enforcement bridge',
];

const taxonomySnippets = [
  'kbx CLI',
  'KBAgent',
  'KBX',
  'SVFactory',
  'sfact',
];

test('canonical boundary statement is present in required anchor docs', () => {
  const anchorFiles = [
    'AGENTS.md',
    'svfactory/foundation.md',
    'knowledge-base/12-ai-skills/agent-operating-manual.md',
    'template/12-ai-skills/agent-operating-manual.md',
  ];

  for (const file of anchorFiles) {
    const text = read(file);
    assert.equal(
      hasAll(text, canonicalBoundarySnippets),
      true,
      `Missing canonical boundary wording in ${file}`
    );
  }
});

test('4-term taxonomy exists in protected governance docs', () => {
  const governanceFiles = [
    'knowledge-base/15-governance/metadata-schema.md',
    'knowledge-base/15-governance/document-taxonomy.md',
    'knowledge-base/15-governance/verification-policy.md',
    'knowledge-base/15-governance/review-cadence.md',
    'knowledge-base/15-governance/release-policy.md',
    'knowledge-base/15-governance/template-versioning-policy.md',
  ];

  for (const file of governanceFiles) {
    const text = read(file);
    assert.equal(
      hasAll(text, taxonomySnippets),
      true,
      `Missing taxonomy term(s) in ${file}`
    );
  }
});

test('scope guard wording is present in anchor docs', () => {
  const scopeGuardFiles = [
    'svfactory/foundation.md',
    'knowledge-base/12-ai-skills/agent-operating-manual.md',
    'template/12-ai-skills/agent-operating-manual.md',
    'knowledge-base/00-start-here/terminology-guard.md',
  ];

  const required = [
    'governed KB/agent software instances',
    'all software instances',
  ];

  for (const file of scopeGuardFiles) {
    const text = read(file);
    assert.equal(
      hasAll(text, required),
      true,
      `Missing scope-guard wording in ${file}`
    );
  }
});
