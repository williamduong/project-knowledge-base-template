#!/usr/bin/env node
/**
 * Manual Test Suite v2.7 — Phase 1: Rules + CLI Deep Testing
 * 
 * Purpose: Deep testing of all 9 kbx rules + CLI commands with edge cases
 * Output: JSON results + optional HTML report
 * Target: Lòi bug, chaos input, boundary violations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// TEST FRAMEWORK
// ============================================================================

class TestRunner {
  constructor(name) {
    this.name = name;
    this.testCases = [];
    this.results = [];
    this.startTime = Date.now();
  }

  addTest(testCase) {
    this.testCases.push(testCase);
  }

  async run() {
    console.log(`\n📋 Running test suite: ${this.name}`);
    console.log('='.repeat(70));

    for (const testCase of this.testCases) {
      const startMs = Date.now();
      try {
        const result = await testCase.run();
        const durationMs = Date.now() - startMs;
        
        this.results.push({
          id: testCase.id,
          name: testCase.name,
          category: testCase.category,
          status: result ? 'PASS' : 'FAIL',
          duration_ms: durationMs,
          message: result.message || '',
          expected: result.expected,
          actual: result.actual,
          severity: testCase.severity || 'info',
        });
        
        const icon = result ? '✓' : '✗';
        console.log(`${icon} [${testCase.category}] ${testCase.name}`);
        if (!result) {
          console.log(`  Expected: ${result.expected}`);
          console.log(`  Actual: ${result.actual}`);
        }
      } catch (error) {
        const durationMs = Date.now() - startMs;
        this.results.push({
          id: testCase.id,
          name: testCase.name,
          category: testCase.category,
          status: 'ERROR',
          duration_ms: durationMs,
          message: error.message,
          error_stack: error.stack,
          severity: testCase.severity || 'critical',
        });
        console.log(`✗ [${testCase.category}] ${testCase.name}`);
        console.log(`  Error: ${error.message}`);
      }
    }

    const totalDurationMs = Date.now() - this.startTime;
    return {
      suite: this.name,
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      errors: this.results.filter(r => r.status === 'ERROR').length,
      duration_ms: totalDurationMs,
      results: this.results,
    };
  }
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

class TestFixture {
  constructor(tempDir = null) {
    this.tempDir = tempDir || path.join(__dirname, '.test-fixtures');
    this.cleanupPaths = [];
  }

  /**
   * Create temporary directory for test
   */
  createTempDir(name) {
    const dir = path.join(this.tempDir, name, Date.now().toString());
    fs.mkdirSync(dir, { recursive: true });
    this.cleanupPaths.push(dir);
    return dir;
  }

  /**
   * Create test KB structure
   */
  createKB(kbPath) {
    fs.mkdirSync(kbPath, { recursive: true });
    
    const dirs = [
      'knowledge-base/00-start-here',
      'knowledge-base/01-product',
      'knowledge-base/02-domain-model',
      'knowledge-base/03-architecture',
      'knowledge-base/intents/_active',
      'knowledge-base/intents/_closed',
    ];
    
    dirs.forEach(dir => {
      fs.mkdirSync(path.join(kbPath, dir), { recursive: true });
    });
    
    return kbPath;
  }

  /**
   * Create document with frontmatter
   */
  createDoc(filePath, frontmatter, content = '') {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    
    let fm = '';
    if (frontmatter) {
      fm = '---\n';
      if (typeof frontmatter === 'string') {
        fm += frontmatter;
      } else {
        // Convert object to YAML-like format
        for (const [key, value] of Object.entries(frontmatter)) {
          if (value === null) {
            fm += `${key}:\n`;
          } else if (typeof value === 'object') {
            fm += `${key}:\n`;
            for (const [k, v] of Object.entries(value)) {
              fm += `  ${k}: ${JSON.stringify(v)}\n`;
            }
          } else {
            fm += `${key}: ${JSON.stringify(value)}\n`;
          }
        }
      }
      fm += '---\n';
    }
    
    fs.writeFileSync(filePath, fm + content);
    return filePath;
  }

  /**
   * Create intent
   */
  createIntent(kbPath, intents) {
    const intentPath = path.join(kbPath, 'knowledge-base/intents/_active', intents.id);
    fs.mkdirSync(intentPath, { recursive: true });
    
    const intentMd = `---
id: ${intents.id}
status: ${intents.status || 'active'}
type: ${intents.type || 'feature'}
${intents.focus ? `focus:\n  current: "${intents.focus.current || ''}"\n  next_action: "${intents.focus.next_action || ''}"` : ''}
${intents.change_scope ? `change_scope: "${intents.change_scope}"` : ''}
---

# ${intents.id}

Test intent for ${intents.id}
`;
    
    fs.writeFileSync(path.join(intentPath, 'intent.md'), intentMd);
    return intentPath;
  }

  /**
   * Clean up all temp files
   */
  cleanup() {
    for (const dir of this.cleanupPaths) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (e) {
        console.warn(`Warning: Could not cleanup ${dir}`);
      }
    }
  }
}

// ============================================================================
// LOAD RULE ENGINE
// ============================================================================

const ruleEngine = require(path.join(__dirname, '../../src/lib/rule-engine'));
const { SEVERITY } = require(path.join(__dirname, '../../src/lib/rules/registry'));

// ============================================================================
// TEST CATEGORIES
// ============================================================================

/**
 * CATEGORY 1: YAML Parsing Edge Cases
 */
function createYAMLParsingTests() {
  const tests = [];
  const fixture = new TestFixture();
  const kbPath = fixture.createKB(fixture.createTempDir('yaml-parsing'));

  // Test 1.a: Valid frontmatter (baseline)
  tests.push({
    id: 'yaml-1a',
    name: 'Valid frontmatter baseline',
    category: 'YAML Parsing',
    severity: 'critical',
    run: async function() {
      const docPath = fixture.createDoc(
        path.join(kbPath, 'knowledge-base/01-product/test.md'),
        {
          verification: 'code-verified',
          time_state: 'current',
          status: 'current',
          kb_state: 'verified'
        },
        'Test content'
      );
      
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      return {
        success: violations.length === 0,
        message: 'No violations found',
        expected: '0 violations',
        actual: `${violations.length} violations`
      };
    }
  });

  // Test 1.b: Nested YAML (focus field)
  tests.push({
    id: 'yaml-1b',
    name: 'Nested YAML with focus object',
    category: 'YAML Parsing',
    severity: 'high',
    run: async function() {
      const docPath = fixture.createDoc(
        path.join(kbPath, 'knowledge-base/intents/_active/v2-7-test/intent.md'),
        `id: v2-7-test
status: active
type: feature
focus:
  current: v2.7
  next_action: implement rules
change_scope: rule engine`,
        'Test intent'
      );
      
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      // Should detect this as active intent with next_action, no I001 violation
      const i001Violations = violations.filter(v => v.rule_id === 'KBX-I001');
      return {
        success: i001Violations.length === 0,
        message: 'Nested YAML parsed correctly',
        expected: 'No I001 violations',
        actual: `${i001Violations.length} I001 violations`
      };
    }
  });

  // Test 1.c: Unicode & special chars
  tests.push({
    id: 'yaml-1c',
    name: 'Unicode characters in frontmatter',
    category: 'YAML Parsing',
    severity: 'medium',
    run: async function() {
      const docPath = fixture.createDoc(
        path.join(kbPath, 'knowledge-base/02-domain-model/unicode.md'),
        {
          verification: 'code-verified',
          time_state: 'current',
          status: 'current',
          kb_state: 'verified',
          description: 'Тест с кириллицей 中文 日本語 العربية'
        },
        'Content with unicode'
      );
      
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      return {
        success: violations.length === 0,
        message: 'Unicode handled correctly',
        expected: '0 violations',
        actual: `${violations.length} violations`
      };
    }
  });

  // Test 1.d: Windows CRLF line endings
  tests.push({
    id: 'yaml-1d',
    name: 'Windows CRLF line endings',
    category: 'YAML Parsing',
    severity: 'high',
    run: async function() {
      const crlfContent = '---\r\nverification: code-verified\r\ntime_state: current\r\nstatus: current\r\nkb_state: verified\r\n---\r\nContent';
      const docPath = path.join(kbPath, 'knowledge-base/03-architecture/crlf.md');
      fs.mkdirSync(path.dirname(docPath), { recursive: true });
      fs.writeFileSync(docPath, crlfContent);
      
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      return {
        success: violations.length === 0,
        message: 'CRLF line endings handled',
        expected: '0 violations',
        actual: `${violations.length} violations`
      };
    }
  });

  // Test 1.e: Missing closing ---
  tests.push({
    id: 'yaml-1e',
    name: 'Missing closing frontmatter marker',
    category: 'YAML Parsing',
    severity: 'high',
    run: async function() {
      const badContent = '---\nverification: code-verified\ntime_state: current\nContent without closing ---';
      const docPath = path.join(kbPath, 'knowledge-base/intents/_active/v2-7-incomplete/intent.md');
      fs.mkdirSync(path.dirname(docPath), { recursive: true });
      fs.writeFileSync(docPath, badContent);
      
      // Should not crash, should handle gracefully
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      return {
        success: true,
        message: 'Incomplete frontmatter handled without crash',
        expected: 'No crash',
        actual: 'Executed successfully'
      };
    }
  });

  // Test 1.f: Empty frontmatter
  tests.push({
    id: 'yaml-1f',
    name: 'Empty frontmatter block',
    category: 'YAML Parsing',
    severity: 'medium',
    run: async function() {
      const emptyContent = '---\n---\nJust content, no fields';
      const docPath = path.join(kbPath, 'knowledge-base/01-product/empty-fm.md');
      fs.mkdirSync(path.dirname(docPath), { recursive: true });
      fs.writeFileSync(docPath, emptyContent);
      
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      // Should detect missing required fields (M001)
      const m001 = violations.filter(v => v.rule_id === 'KBX-M001');
      return {
        success: m001.length > 0,
        message: 'Empty frontmatter detected as missing fields',
        expected: 'M001 violations detected',
        actual: `${m001.length} M001 violations`
      };
    }
  });

  return { tests, cleanup: () => fixture.cleanup() };
}

/**
 * CATEGORY 2: Regex Validation - Intent IDs
 */
function createIntentIDTests() {
  const tests = [];
  const fixture = new TestFixture();
  const kbPath = fixture.createKB(fixture.createTempDir('intent-ids'));

  const validIDs = ['v2-7-rules', 'v2-7-rules-engine', 'v2-7-nl-to-cli-logic', 'v10-20-feature', 'v1-1-a'];
  const invalidIDs = [
    '2-7-rules',      // missing v
    'v2.7-rules',     // dot instead of dash
    'v2_7_rules',     // underscore
    'v2-7',           // no slug
    'v2-7-RULES',     // caps
    'v2-7-_rules',    // underscore in slug
    'v2-7-rules-',    // trailing dash
    'v2-7-ru--les',   // double dash
    'V2-7-rules',     // uppercase V
  ];

  for (const id of validIDs) {
    tests.push({
      id: `intent-valid-${id.replace(/-/g, '_')}`,
      name: `Valid intent ID: ${id}`,
      category: 'Regex Validation',
      severity: 'critical',
      run: async function() {
        fixture.createIntent(kbPath, {
          id,
          status: 'active',
          type: 'feature',
          focus: { current: 'v2.7', next_action: 'test' },
          change_scope: 'test'
        });
        
        const result = ruleEngine.runRules(kbPath); const violations = result.violations;
        const gb001 = violations.filter(v => v.rule_id === 'KBX-GB001');
        return {
          success: gb001.length === 0,
          message: `Intent ID ${id} is valid`,
          expected: 'No KBX-GB001 violations',
          actual: `${gb001.length} violations`
        };
      }
    });
  }

  for (const id of invalidIDs) {
    tests.push({
      id: `intent-invalid-${id.replace(/[._-]/g, '_')}`,
      name: `Invalid intent ID: ${id}`,
      category: 'Regex Validation',
      severity: 'critical',
      run: async function() {
        fixture.createIntent(kbPath, {
          id,
          status: 'active',
          type: 'feature',
          focus: { current: 'v2.7', next_action: 'test' },
          change_scope: 'test'
        });
        
        const result = ruleEngine.runRules(kbPath); const violations = result.violations;
        const gb001 = violations.filter(v => v.rule_id === 'KBX-GB001');
        return {
          success: gb001.length > 0,
          message: `Intent ID ${id} correctly rejected`,
          expected: 'KBX-GB001 violation detected',
          actual: `${gb001.length} violations`
        };
      }
    });
  }

  return { tests, cleanup: () => fixture.cleanup() };
}

/**
 * CATEGORY 3: Verification Rules - time_state
 */
function createTimeStateTests() {
  const tests = [];
  const fixture = new TestFixture();
  const kbPath = fixture.createKB(fixture.createTempDir('time-state'));

  const validTimeStates = ['current', 'point-in-time', 'evergreen', 'historical', '2026-current', 'future'];
  
  for (const ts of validTimeStates) {
    tests.push({
      id: `time-state-valid-${ts.replace(/-/g, '_')}`,
      name: `Valid time_state: ${ts}`,
      category: 'Verification Rules',
      severity: 'high',
      run: async function() {
        fixture.createDoc(
          path.join(kbPath, 'knowledge-base/01-product/doc.md'),
          {
            verification: 'code-verified',
            time_state: ts,
            status: 'current',
            kb_state: 'verified'
          }
        );
        
        const result = ruleEngine.runRules(kbPath); const violations = result.violations;
        const v002 = violations.filter(v => v.rule_id === 'KBX-V002');
        return {
          success: v002.length === 0,
          message: `time_state '${ts}' is valid`,
          expected: 'No V002 violations',
          actual: `${v002.length} violations`
        };
      }
    });
  }

  const invalidTimeStates = ['CURRENT', 'Current', 'curr3nt', '2024-current', '2027-current', 'point_in_time', ''];

  for (const ts of invalidTimeStates) {
    tests.push({
      id: `time-state-invalid-${ts.replace(/-/g, '_').substring(0, 15)}`,
      name: `Invalid time_state: '${ts}'`,
      category: 'Verification Rules',
      severity: 'high',
      run: async function() {
        fixture.createDoc(
          path.join(kbPath, 'knowledge-base/01-product/bad-ts.md'),
          {
            verification: 'code-verified',
            time_state: ts,
            status: 'current',
            kb_state: 'verified'
          }
        );
        
        const result = ruleEngine.runRules(kbPath); const violations = result.violations;
        const v002 = violations.filter(v => v.rule_id === 'KBX-V002');
        return {
          success: v002.length > 0,
          message: `time_state '${ts}' correctly rejected`,
          expected: 'V002 violation detected',
          actual: `${v002.length} violations`
        };
      }
    });
  }

  return { tests, cleanup: () => fixture.cleanup() };
}

/**
 * CATEGORY 4: Verification Rules - code-verified requires time_state
 */
function createCodeVerifiedTests() {
  const tests = [];
  const fixture = new TestFixture();
  const kbPath = fixture.createKB(fixture.createTempDir('code-verified'));

  tests.push({
    id: 'verified-with-time-state',
    name: 'code-verified with time_state - PASS',
    category: 'Verification Rules',
    severity: 'critical',
    run: async function() {
      fixture.createDoc(
        path.join(kbPath, 'knowledge-base/01-product/verified-good.md'),
        {
          verification: 'code-verified',
          time_state: 'current',
          status: 'current',
          kb_state: 'verified'
        }
      );
      
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      const v001 = violations.filter(v => v.rule_id === 'KBX-V001');
      return {
        success: v001.length === 0,
        message: 'code-verified with time_state passes',
        expected: 'No V001 violations',
        actual: `${v001.length} violations`
      };
    }
  });

  tests.push({
    id: 'verified-without-time-state',
    name: 'code-verified without time_state - FAIL',
    category: 'Verification Rules',
    severity: 'critical',
    run: async function() {
      fixture.createDoc(
        path.join(kbPath, 'knowledge-base/01-product/verified-bad.md'),
        {
          verification: 'code-verified',
          status: 'current',
          kb_state: 'verified'
        },
        'No time_state field'
      );
      
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      const v001 = violations.filter(v => v.rule_id === 'KBX-V001');
      return {
        success: v001.length > 0,
        message: 'code-verified without time_state correctly rejected',
        expected: 'V001 violation detected',
        actual: `${v001.length} violations`
      };
    }
  });

  tests.push({
    id: 'unverified-no-time-state-required',
    name: 'unverified without time_state - PASS',
    category: 'Verification Rules',
    severity: 'high',
    run: async function() {
      fixture.createDoc(
        path.join(kbPath, 'knowledge-base/01-product/unverified.md'),
        {
          verification: 'unverified',
          status: 'current',
          kb_state: 'template'
        },
        'time_state optional for unverified'
      );
      
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      const v001 = violations.filter(v => v.rule_id === 'KBX-V001');
      return {
        success: v001.length === 0,
        message: 'unverified without time_state passes',
        expected: 'No V001 violations',
        actual: `${v001.length} violations`
      };
    }
  });

  return { tests, cleanup: () => fixture.cleanup() };
}

/**
 * CATEGORY 5: Intent Rules - active without next_action
 */
function createIntentActionTests() {
  const tests = [];
  const fixture = new TestFixture();
  const kbPath = fixture.createKB(fixture.createTempDir('intent-actions'));

  tests.push({
    id: 'active-with-next-action',
    name: 'Active intent with next_action - PASS',
    category: 'Intent Rules',
    severity: 'critical',
    run: async function() {
      fixture.createIntent(kbPath, {
        id: 'v2-7-with-action',
        status: 'active',
        type: 'feature',
        focus: { current: 'v2.7', next_action: 'implement feature' },
        change_scope: 'feature implementation'
      });
      
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      const i001 = violations.filter(v => v.rule_id === 'KBX-I001');
      return {
        success: i001.length === 0,
        message: 'Active intent with next_action passes',
        expected: 'No I001 violations',
        actual: `${i001.length} violations`
      };
    }
  });

  tests.push({
    id: 'active-without-next-action',
    name: 'Active intent without next_action - FAIL',
    category: 'Intent Rules',
    severity: 'critical',
    run: async function() {
      // Create intent with empty next_action
      fixture.createIntent(kbPath, {
        id: 'v2-7-no-action',
        status: 'active',
        type: 'feature',
        focus: { current: 'v2.7', next_action: '' },
        change_scope: 'something'
      });
      
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      const i001 = violations.filter(v => v.rule_id === 'KBX-I001');
      return {
        success: i001.length > 0,
        message: 'Active intent without next_action correctly rejected',
        expected: 'I001 violation detected',
        actual: `${i001.length} violations`
      };
    }
  });

  tests.push({
    id: 'closed-intent-no-action-required',
    name: 'Closed intent without next_action - PASS',
    category: 'Intent Rules',
    severity: 'high',
    run: async function() {
      const closedPath = path.join(kbPath, 'knowledge-base/intents/_closed/v2-6-old');
      fs.mkdirSync(closedPath, { recursive: true });
      fixture.createDoc(
        path.join(closedPath, 'intent.md'),
        `id: v2-6-old
status: closed
type: feature
focus:
  current: v2.6`,
        'Closed intent'
      );
      
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      const i001 = violations.filter(v => v.rule_id === 'KBX-I001');
      return {
        success: i001.length === 0,
        message: 'Closed intent does not trigger I001',
        expected: 'No I001 violations',
        actual: `${i001.length} violations`
      };
    }
  });

  return { tests, cleanup: () => fixture.cleanup() };
}

/**
 * CATEGORY 6: Metadata Rules - Required Fields
 */
function createMetadataTests() {
  const tests = [];
  const fixture = new TestFixture();
  const kbPath = fixture.createKB(fixture.createTempDir('metadata'));

  tests.push({
    id: 'all-required-fields',
    name: 'Document with all required fields - PASS',
    category: 'Metadata Rules',
    severity: 'critical',
    run: async function() {
      fixture.createDoc(
        path.join(kbPath, 'knowledge-base/01-product/complete.md'),
        {
          verification: 'code-verified',
          time_state: 'current',
          status: 'current',
          kb_state: 'verified'
        }
      );
      
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      const m001 = violations.filter(v => v.rule_id === 'KBX-M001');
      return {
        success: m001.length === 0,
        message: 'All required fields present',
        expected: 'No M001 violations',
        actual: `${m001.length} violations`
      };
    }
  });

  tests.push({
    id: 'missing-verification',
    name: 'Missing verification field - FAIL',
    category: 'Metadata Rules',
    severity: 'critical',
    run: async function() {
      fixture.createDoc(
        path.join(kbPath, 'knowledge-base/01-product/missing-ver.md'),
        {
          status: 'current',
          kb_state: 'template'
        }
      );
      
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      const m001 = violations.filter(v => v.rule_id === 'KBX-M001');
      return {
        success: m001.length > 0,
        message: 'Missing verification detected',
        expected: 'M001 violation',
        actual: `${m001.length} violations`
      };
    }
  });

  tests.push({
    id: 'invalid-status-value',
    name: 'Invalid status value - FAIL',
    category: 'Metadata Rules',
    severity: 'high',
    run: async function() {
      fixture.createDoc(
        path.join(kbPath, 'knowledge-base/01-product/bad-status.md'),
        {
          verification: 'unverified',
          status: 'invalid-status',
          kb_state: 'template'
        }
      );
      
      const result = ruleEngine.runRules(kbPath); const violations = result.violations;
      const m002 = violations.filter(v => v.rule_id === 'KBX-M002');
      return {
        success: m002.length > 0,
        message: 'Invalid status value detected',
        expected: 'M002 violation',
        actual: `${m002.length} violations`
      };
    }
  });

  const validStatuses = ['current', 'archived', 'draft', 'deprecated', 'planned'];
  for (const status of validStatuses) {
    tests.push({
      id: `valid-status-${status}`,
      name: `Valid status: ${status}`,
      category: 'Metadata Rules',
      severity: 'medium',
      run: async function() {
        fixture.createDoc(
          path.join(kbPath, `knowledge-base/01-product/status-${status}.md`),
          {
            verification: 'unverified',
            status,
            kb_state: 'template'
          }
        );
        
        const result = ruleEngine.runRules(kbPath); const violations = result.violations;
        const m002 = violations.filter(v => v.rule_id === 'KBX-M002');
        return {
          success: m002.length === 0,
          message: `Status '${status}' is valid`,
          expected: 'No M002 violations',
          actual: `${m002.length} violations`
        };
      }
    });
  }

  return { tests, cleanup: () => fixture.cleanup() };
}

/**
 * CATEGORY 7: CLI Commands Robustness
 */
function createCLITests() {
  const tests = [];

  tests.push({
    id: 'cli-rules-list',
    name: 'kbx rules list - returns all 9 rules',
    category: 'CLI Commands',
    severity: 'critical',
    run: async function() {
      try {
        const output = execSync('node bin/kbx.js rules list', {
          cwd: path.join(__dirname, '../../'),
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        const hasAllRules = [
          'KBX-M001', 'KBX-M002', 'KBX-M003', 'KBX-M004',
          'KBX-V001', 'KBX-V002',
          'KBX-I001', 'KBX-I002',
          'KBX-GB001'
        ].every(ruleId => output.includes(ruleId));
        
        return {
          success: hasAllRules,
          message: 'All 9 rules listed',
          expected: 'KBX-M001..M004, V001..V002, I001..I002, GB001',
          actual: hasAllRules ? 'All present' : 'Some missing'
        };
      } catch (error) {
        return {
          success: false,
          message: `CLI error: ${error.message}`,
          expected: 'Command succeeds',
          actual: `Error: ${error.message}`
        };
      }
    }
  });

  tests.push({
    id: 'cli-rules-help',
    name: 'kbx rules help - displays usage',
    category: 'CLI Commands',
    severity: 'medium',
    run: async function() {
      try {
        const output = execSync('node bin/kbx.js rules help', {
          cwd: path.join(__dirname, '../../'),
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        const hasCommands = ['list', 'lint', 'check', 'help'].every(cmd => output.toLowerCase().includes(cmd));
        return {
          success: hasCommands,
          message: 'Help displays all commands',
          expected: 'Commands: list, lint, check, help',
          actual: hasCommands ? 'All displayed' : 'Some missing'
        };
      } catch (error) {
        return {
          success: false,
          message: `CLI error: ${error.message}`,
          expected: 'Command succeeds',
          actual: `Error: ${error.message}`
        };
      }
    }
  });

  tests.push({
    id: 'cli-invalid-rule-id',
    name: 'kbx rules check with invalid ID - error handling',
    category: 'CLI Commands',
    severity: 'high',
    run: async function() {
      try {
        execSync('node bin/kbx.js rules check KBX-INVALID', {
          cwd: path.join(__dirname, '../../'),
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          throwOnError: true
        });
        return {
          success: false,
          message: 'Should have thrown error',
          expected: 'Error with invalid rule ID',
          actual: 'Command succeeded unexpectedly'
        };
      } catch (error) {
        // Error expected
        const errorMsg = error.message || error.stderr || '';
        return {
          success: true,
          message: 'Invalid rule ID correctly rejected',
          expected: 'Error thrown',
          actual: 'Error thrown as expected'
        };
      }
    }
  });

  return { tests, cleanup: () => {} };  // No cleanup needed for CLI tests
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runAllTests() {
  const startTime = Date.now();
  const allResults = [];

  // Create test suites
  const suites = [
    { name: 'YAML Parsing Edge Cases', ...createYAMLParsingTests() },
    { name: 'Regex Validation - Intent IDs', ...createIntentIDTests() },
    { name: 'Time State Validation', ...createTimeStateTests() },
    { name: 'Code-Verified Requirements', ...createCodeVerifiedTests() },
    { name: 'Intent Action Validation', ...createIntentActionTests() },
    { name: 'Metadata Field Validation', ...createMetadataTests() },
    { name: 'CLI Commands', ...createCLITests() },
  ];

  // Run each suite
  for (const suite of suites) {
    const runner = new TestRunner(suite.name);
    suite.tests.forEach(t => runner.addTest(t));
    const result = await runner.run();
    allResults.push(result);
    
    // Cleanup
    if (suite.cleanup) suite.cleanup();
  }

  const totalDurationMs = Date.now() - startTime;

  // Generate summary
  const summary = {
    timestamp: new Date().toISOString(),
    version: '2.7.0-beta.1',
    phase: 'Manual Test v2.7 — Phase 1',
    total_suites: allResults.length,
    total_tests: allResults.reduce((s, r) => s + r.total, 0),
    total_passed: allResults.reduce((s, r) => s + r.passed, 0),
    total_failed: allResults.reduce((s, r) => s + r.failed, 0),
    total_errors: allResults.reduce((s, r) => s + r.errors, 0),
    total_duration_ms: totalDurationMs,
    suites: allResults,
  };

  return summary;
}

// ============================================================================
// OUTPUT GENERATION
// ============================================================================

if (require.main === module) {
  runAllTests().then(summary => {
    // Output JSON
    const outputFile = path.join(__dirname, 'test-results-v2.7-phase1.json');
    fs.writeFileSync(outputFile, JSON.stringify(summary, null, 2));
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Suites: ${summary.total_suites}`);
    console.log(`Total Tests: ${summary.total_tests}`);
    console.log(`Passed: ${summary.total_passed} ✓`);
    console.log(`Failed: ${summary.total_failed} ✗`);
    console.log(`Errors: ${summary.total_errors} ⚠`);
    console.log(`Pass Rate: ${((summary.total_passed / summary.total_tests) * 100).toFixed(1)}%`);
    console.log(`Duration: ${summary.total_duration_ms}ms`);
    console.log(`\nResults saved: ${outputFile}`);
    console.log('='.repeat(70) + '\n');
    
    process.exit(summary.total_failed > 0 || summary.total_errors > 0 ? 1 : 0);
  }).catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = { TestRunner, TestFixture, runAllTests };
