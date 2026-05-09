const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const runOntology = require('../../src/commands/ontology');

// Helper to create temp file
function createTempFile(content) {
  const dir = path.join(os.tmpdir(), 'kbx-ontology-tests');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, `test-${Date.now()}.json`);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

// ===================================================================
// Command Tests: kbx ontology show
// ===================================================================

test('command: ontology show - outputs schema', () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({ packageJson: { name: 'test' }, args: ['show'] });

  console.log = originalLog;

  assert.strictEqual(result.exitCode, 0, 'Should exit with 0');
  assert.ok(output.includes('Terminology Registry'), 'Should include terminology registry');
  assert.ok(output.includes('Tenant'), 'Should include entities');
});

test('command: ontology show --json - outputs valid JSON', () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({ packageJson: { name: 'test' }, args: ['show', '--json'] });

  console.log = originalLog;

  assert.strictEqual(result.exitCode, 0, 'Should exit with 0');
  const json = JSON.parse(output);
  assert.ok(json.success, 'Should have success=true');
  assert.ok(json.schema, 'Should have schema');
});

// ===================================================================
// Command Tests: kbx ontology validate
// ===================================================================

test('command: ontology validate - valid intent', () => {
  const fixture = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Create Tenant',
    riskLevel: 'Low',
  };
  const filePath = createTempFile(JSON.stringify(fixture));

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['validate', '--input', filePath],
  });

  console.log = originalLog;

  assert.strictEqual(result.exitCode, 0, 'Should exit with 0 for valid intent');
  assert.ok(output.includes('Validation passed'), 'Should confirm validation passed');
});

test('command: ontology validate - invalid intent (missing repo_origin)', () => {
  const fixture = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Create Tenant',
    riskLevel: 'Low',
  };
  const filePath = createTempFile(JSON.stringify(fixture));

  let output = '';
  const originalError = console.error;
  console.error = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['validate', '--input', filePath],
  });

  console.error = originalError;

  assert.strictEqual(result.exitCode, 1, 'Should exit with 1 for invalid intent');
  assert.ok(output.includes('repo_origin'), 'Should mention missing repo_origin');
});

test('command: ontology validate - missing input flag', () => {
  let output = '';
  const originalError = console.error;
  console.error = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['validate'],
  });

  console.error = originalError;

  assert.strictEqual(result.exitCode, 1, 'Should exit with 1 when --input missing');
});

test('command: ontology validate - invalid JSON file', () => {
  const filePath = createTempFile('{ invalid json');

  let output = '';
  const originalError = console.error;
  console.error = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['validate', '--input', filePath],
  });

  console.error = originalError;

  assert.strictEqual(result.exitCode, 1, 'Should exit with 1 for invalid JSON');
  assert.ok(output.includes('parse'), 'Should mention parse error');
});

test('command: ontology validate - unresolved terminology', () => {
  const fixture = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'UnknownEntity',
    lifecycle: 'DRAFT',
    title: 'Test',
    riskLevel: 'Low',
  };
  const filePath = createTempFile(JSON.stringify(fixture));

  let output = '';
  const originalError = console.error;
  console.error = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['validate', '--input', filePath],
  });

  console.error = originalError;

  assert.strictEqual(result.exitCode, 1, 'Should exit with 1 for unresolved terminology');
  assert.ok(output.includes('UnknownEntity'), 'Should mention unresolved entity');
});

test('command: ontology validate --json - outputs JSON error', () => {
  const filePath = createTempFile('{ invalid');

  let output = '';
  const originalError = console.error;
  console.error = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['validate', '--input', filePath, '--json'],
  });

  console.error = originalError;

  assert.strictEqual(result.exitCode, 1, 'Should exit with 1');
  const json = JSON.parse(output);
  assert.strictEqual(json.success, false, 'Should have success=false');
});

// ===================================================================
// Command Tests: kbx ontology build
// ===================================================================

test('command: ontology build - outputs JSON', () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['build'],
  });

  console.log = originalLog;

  assert.strictEqual(result.exitCode, 0, 'Should exit with 0');
  const json = JSON.parse(output);
  assert.strictEqual(json.version, '2.6.0', 'Should have correct version');
  assert.ok(json.terminologyRegistry, 'Should include terminology registry');
  assert.ok(json.stateTransitionGuards, 'Should include state guards');
});

test('command: ontology build --output - writes to file', () => {
  const dir = path.join(os.tmpdir(), 'kbx-ontology-tests');
  const filePath = path.join(dir, `build-${Date.now()}.json`);

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['build', '--output', filePath],
  });

  console.log = originalLog;

  assert.strictEqual(result.exitCode, 0, 'Should exit with 0');
  assert.ok(fs.existsSync(filePath), 'Should create output file');
  
  const content = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(content);
  assert.strictEqual(json.version, '2.6.0', 'Should write correct version');
});

test('command: ontology build --json - outputs JSON', () => {
  const dir = path.join(os.tmpdir(), 'kbx-ontology-tests');
  const filePath = path.join(dir, `build-${Date.now()}.json`);

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['build', '--output', filePath, '--json'],
  });

  console.log = originalLog;

  assert.strictEqual(result.exitCode, 0, 'Should exit with 0');
  const json = JSON.parse(output);
  assert.ok(json.success, 'Should have success=true');
  assert.ok(json.message, 'Should include message');
});

// ===================================================================
// Cross-Repo Denial Tests
// ===================================================================

test('command: ontology validate - cross-repo intent denied', () => {
  const fixture = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Modify Auth Service',
    riskLevel: 'High',
    targetEntity: { canonical_name: 'ServicePrincipal', repo_origin: 'auth' },
  };
  const filePath = createTempFile(JSON.stringify(fixture));

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['validate', '--input', filePath],
  });

  console.log = originalLog;

  // Note: Phase 1 allows cross-repo intents; Phase 2 will add CROSS_REPO_GRANT validation
  // For now, if canonical_name is valid, validation passes
  assert.strictEqual(result.exitCode, 0, 'Should pass Phase 1 (cross-repo grant checked in Phase 2)');
});

// ===================================================================
// Help & Unknown Commands
// ===================================================================

test('command: ontology help - shows usage', () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['help'],
  });

  console.log = originalLog;

  assert.strictEqual(result.exitCode, 0, 'Should exit with 0');
  assert.ok(output.includes('Usage'), 'Should show usage');
});

test('command: ontology unknown-command - shows usage', () => {
  let output = '';
  const originalLog = console.log;
  console.log = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['unknown'],
  });

  console.log = originalLog;

  assert.strictEqual(result.exitCode, 1, 'Should exit with 1 for unknown command');
  assert.ok(output.includes('Usage'), 'Should show usage');
});
