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

function loadFixture(name) {
  const fixturePath = path.join(__dirname, '..', 'fixtures', 'ontology', name);
  return fs.readFileSync(fixturePath, 'utf8');
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

test('command: ontology validate - invalid governed glossary hard-fail', () => {
  const fixture = {
    id: '550e8400-e29b-41d4-a716-446655441111',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Validate glossary',
    riskLevel: 'Low',
  };

  const inputPath = createTempFile(JSON.stringify(fixture));
  const glossaryPath = createTempFile(loadFixture('glossary.invalid-duplicate.json'));

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['validate', '--input', inputPath, '--glossary', glossaryPath],
  });

  assert.strictEqual(result.exitCode, 1, 'Invalid governed glossary should fail validation');
});

test('command: ontology validate --type contract - valid contract fixture passes', () => {
  const contractPath = createTempFile(loadFixture('contract.valid.json'));

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['validate', '--type', 'contract', '--input', contractPath],
  });

  assert.strictEqual(result.exitCode, 0, 'Valid ontology contract should pass in contract mode');
});

test('command: ontology validate --type contract - unknown keys fail', () => {
  const contractPath = createTempFile(loadFixture('contract.invalid-unknown-node-key.json'));

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['validate', '--type', 'contract', '--input', contractPath],
  });

  assert.strictEqual(result.exitCode, 1, 'Strict contract should reject unknown keys');
});

test('command: ontology validate - unknown option rejected', () => {
  const fixture = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Create Tenant',
    riskLevel: 'Low',
  };

  const filePath = createTempFile(JSON.stringify(fixture));
  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['validate', '--input', filePath, '--unknown-flag'],
  });

  assert.strictEqual(result.exitCode, 1, 'Unknown flags should fail fast');
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

test('command: ontology audit - valid payload passes', () => {
  const payloadPath = createTempFile(loadFixture('nl-audit.valid.json'));
  const glossaryPath = createTempFile(loadFixture('glossary.valid.json'));

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['audit', '--input', payloadPath, '--glossary', glossaryPath],
  });

  assert.strictEqual(result.exitCode, 0, 'Valid NL audit should pass');
});

test('command: ontology audit - unresolved payload fails', () => {
  const payloadPath = createTempFile(loadFixture('nl-audit.unresolved.json'));
  const glossaryPath = createTempFile(loadFixture('glossary.valid.json'));

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['audit', '--input', payloadPath, '--glossary', glossaryPath],
  });

  assert.strictEqual(result.exitCode, 1, 'Unresolved NL audit should fail');
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
    evidenceLinks: ['doc://evidence-1'],
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

  assert.strictEqual(result.exitCode, 1, 'Should deny cross-repo mutation without graph grant evidence');
});

test('command: ontology validate - cross-repo intent allowed with graph-state grant', () => {
  const fixture = {
    id: '550e8400-e29b-41d4-a716-446655440101',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Modify Auth Service',
    riskLevel: 'High',
    evidenceLinks: ['doc://evidence-allowed'],
    targetEntity: { canonical_name: 'ServicePrincipal', repo_origin: 'auth' },
  };

  const graphState = {
    crossRepoGrants: [{ from: 'billing', to: 'auth' }],
    evidencePaths: [
      {
        intentId: '550e8400-e29b-41d4-a716-446655440101',
        targetCanonicalName: 'ServicePrincipal',
        targetRepoOrigin: 'auth',
        evidenceLink: 'doc://evidence-allowed',
      },
    ],
  };

  const fixturePath = createTempFile(JSON.stringify(fixture));
  const graphStatePath = createTempFile(JSON.stringify(graphState));

  let output = '';
  const originalLog = console.log;
  console.log = (...args) => {
    output += args.join('\n') + '\n';
  };

  const result = runOntology({
    packageJson: { name: 'test' },
    args: ['validate', '--input', fixturePath, '--graph-state', graphStatePath],
  });

  console.log = originalLog;

  assert.strictEqual(result.exitCode, 0, 'Should allow cross-repo mutation with grant + evidence path');
  assert.ok(output.includes('Validation passed'), 'Should confirm validation passed');
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
  assert.ok(output.includes('--type auto|intent|contract'), 'Should expose contract mode in help');
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
