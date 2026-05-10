'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const LIMIT_BYTES = 8 * 1024;
const ROOT = path.resolve(__dirname, '..', '..');
const NATURAL_RULE_FILES = [
  'svfactory/agent.md',
  'svfactory/rules-extensions.md',
];

describe('natural rules size gate (Phase C.1)', () => {
  it('keeps exactly two natural-rules files under SVFactory contract', () => {
    assert.equal(NATURAL_RULE_FILES.length, 2);
  });

  for (const relPath of NATURAL_RULE_FILES) {
    it(`${relPath} must be <= 8KB`, () => {
      const abs = path.join(ROOT, relPath);
      assert.ok(fs.existsSync(abs), `Missing natural-rules file: ${relPath}`);
      const size = fs.statSync(abs).size;
      assert.ok(
        size <= LIMIT_BYTES,
        `${relPath} exceeded limit: ${size} bytes > ${LIMIT_BYTES}`
      );
    });
  }
});
