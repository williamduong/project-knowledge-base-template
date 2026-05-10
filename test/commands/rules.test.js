'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const { runRules } = require('../../src/commands/rules');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpKb(files = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbx-rules-cmd-test-'));
  for (const [relPath, content] of Object.entries(files)) {
    const abs = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
  }
  return tmpDir;
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

function captureOutput(fn) {
  const stdout = [];
  const stderr = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...a) => stdout.push(a.join(' '));
  console.error = (...a) => stderr.push(a.join(' '));
  const origExit = process.exitCode;
  process.exitCode = 0;
  let err = null;
  try {
    const result = fn();
    if (result && typeof result.then === 'function') return result.then(() => {
      console.log = origLog;
      console.error = origErr;
      const exitCode = process.exitCode;
      process.exitCode = origExit;
      return { stdout: stdout.join('\n'), stderr: stderr.join('\n'), exitCode };
    });
  } catch (e) {
    err = e;
  } finally {
    if (!err) {
      console.log = origLog;
      console.error = origErr;
    }
  }
  console.log = origLog;
  console.error = origErr;
  const exitCode = process.exitCode;
  process.exitCode = origExit;
  if (err) throw err;
  return { stdout: stdout.join('\n'), stderr: stderr.join('\n'), exitCode };
}

async function captureAsync(fn) {
  const stdout = [];
  const stderr = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (...a) => stdout.push(a.join(' '));
  console.error = (...a) => stderr.push(a.join(' '));
  const origExit = process.exitCode;
  process.exitCode = 0;
  try {
    await fn();
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
  const exitCode = process.exitCode;
  process.exitCode = origExit;
  return { stdout: stdout.join('\n'), stderr: stderr.join('\n'), exitCode };
}

function withMockedRegistryConfig(tempModuleRelPath, fn) {
  const rulesCommandPath = require.resolve('../../src/commands/rules');
  const registryPath = require.resolve('../../src/lib/rules/registry');
  const originalRegistry = require.cache[registryPath];
  const originalRules = require.cache[rulesCommandPath];
  delete require.cache[registryPath];
  delete require.cache[rulesCommandPath];

  const registry = require('../../src/lib/rules/registry');
  const patchedRegistry = {
    ...registry,
    RULE_DOMAIN_CONFIG: {
      ...registry.RULE_DOMAIN_CONFIG,
      M: { ...registry.RULE_DOMAIN_CONFIG.M, module_path: tempModuleRelPath },
    },
    getRuleDomainConfig(domain) {
      if (String(domain || '').trim().toUpperCase() === 'M') {
        return { ...registry.RULE_DOMAIN_CONFIG.M, module_path: tempModuleRelPath };
      }
      return registry.getRuleDomainConfig(domain);
    },
  };
  require.cache[registryPath] = {
    id: registryPath,
    filename: registryPath,
    loaded: true,
    exports: patchedRegistry,
    children: [],
    paths: Module._nodeModulePaths(path.dirname(registryPath)),
  };

  const { runRules: mockedRunRules } = require('../../src/commands/rules');
  return Promise.resolve()
    .then(() => fn(mockedRunRules))
    .finally(() => {
      delete require.cache[rulesCommandPath];
      delete require.cache[registryPath];
      if (originalRegistry) require.cache[registryPath] = originalRegistry;
      if (originalRules) require.cache[rulesCommandPath] = originalRules;
    });
}

function makeRepoTempRuleModule(fileName, content) {
  const repoRoot = path.resolve(__dirname, '../..');
  const relPath = `test/.tmp-${fileName}`;
  const absPath = path.join(repoRoot, relPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, 'utf8');
  return { repoRoot, relPath, absPath };
}

// ─── kbx rules list ──────────────────────────────────────────────────────────

describe('kbx rules list', () => {
  it('outputs registered rules count and metadata', async () => {
    const { stdout, exitCode } = await captureAsync(() => runRules({ args: ['list'] }));
    assert.ok(stdout.includes('Registered rules'), `Expected rule count line, got: ${stdout}`);
    assert.ok(stdout.includes('KBX-M001'), `Expected KBX-M001 in output, got: ${stdout}`);
    assert.equal(exitCode, 0);
  });

  it('--json outputs valid JSON with rules array', async () => {
    const { stdout, exitCode } = await captureAsync(() => runRules({ args: ['list', '--json'] }));
    const data = JSON.parse(stdout);
    assert.ok(data.rules);
    assert.ok(Array.isArray(data.rules));
    assert.ok(data.rules.length >= 4);
    assert.equal(exitCode, 0);
  });

  it('each rule in --json has id, severity, description', async () => {
    const { stdout } = await captureAsync(() => runRules({ args: ['list', '--json'] }));
    const data = JSON.parse(stdout);
    for (const r of data.rules) {
      assert.ok(r.id, `Missing id in rule: ${JSON.stringify(r)}`);
      assert.ok(r.severity, `Missing severity: ${r.id}`);
      assert.ok(r.description, `Missing description: ${r.id}`);
    }
  });
});

// ─── kbx rules next-id / scaffold ───────────────────────────────────────────

describe('kbx rules authoring helpers', () => {
  it('next-id suggests the next deterministic rule id for a domain', async () => {
    const { stdout, exitCode } = await captureAsync(() => runRules({ args: ['next-id', 'M', '--json'] }));
    const data = JSON.parse(stdout);
    assert.equal(data.domain, 'M');
    assert.equal(data.next_rule_id, 'KBX-M005');
    assert.equal(data.module_path, 'src/lib/rules/metadata.js');
    assert.equal(exitCode, 0);
  });

  it('scaffold emits canonical snippet and target module', async () => {
    const { stdout, exitCode } = await captureAsync(() => runRules({
      args: [
        'scaffold',
        'GB',
        '--title=Checkpoint Trigger Coverage',
        '--description=Ensure every checkpoint-triggered command is wired deterministically.',
        '--source-doc=template/15-governance/git-binding-policy.md',
        '--since-version=v2.8.0',
        '--json',
      ],
    }));
    const data = JSON.parse(stdout);
    assert.equal(data.rule_id, 'KBX-GB003');
    assert.equal(data.module_path, 'src/lib/rules/git-binding.js');
    assert.match(data.snippet, /id: 'KBX-GB003'/);
    assert.match(data.snippet, /check\(context\)/);
    assert.equal(exitCode, 0);
  });

  it('scaffold can write snippet to output file', async () => {
    const dir = makeTmpKb({});
    const outFile = path.join(dir, 'rule-snippet.js');
    const { exitCode } = await captureAsync(() => runRules({
      args: [
        'scaffold',
        'PR',
        '--title=Focus Sync Rule',
        '--description=Ensure focus state stays aligned with deterministic runtime output.',
        '--source-doc=template/15-governance/rule-catalog-contract.md',
        '--since-version=v2.8.0',
        `--out=${outFile}`,
      ],
    }));
    const written = fs.readFileSync(outFile, 'utf8');
    cleanup(dir);
    assert.match(written, /KBX-PR027/);
    assert.equal(exitCode, 0);
  });

  it('scaffold --append appends to canonical module when shape is supported', async () => {
    const tempModule = makeRepoTempRuleModule('rules-append-supported.js', [
      "'use strict';",
      '',
      'const { registerRules } = require(\'../src/lib/rule-engine\');',
      'const { SEVERITY, OWNER_LAYER, ENFORCEABILITY, RUNTIME_STATUS } = require(\'../src/lib/rules/registry\');',
      '',
      'registerRules([',
      '  {',
      "    id: 'KBX-M001',",
      "    title: 'Existing',",
      "    description: 'Existing rule',",
      "    severity: 'warn',",
      "    owner_layer: OWNER_LAYER.SVFACTORY,",
      "    enforceability: ENFORCEABILITY.AUTO,",
      "    runtime_status: RUNTIME_STATUS.IMPLEMENTED,",
      "    since_version: '2.7.0',",
      "    source_doc: 'template/15-governance/metadata-schema.md',",
      '    check() { return []; },',
      '  }',
      ']);',
      '',
    ].join('\n'));

    await withMockedRegistryConfig(tempModule.relPath, async (mockedRunRules) => {
      const { stdout, exitCode } = await captureAsync(() => mockedRunRules({
        args: [
          'scaffold',
          'M',
          '--title=Appended Rule',
          '--description=Append into supported shape.',
          '--source-doc=template/15-governance/metadata-schema.md',
          '--since-version=v2.8.0',
          '--append',
          '--json',
        ],
      }));
      const data = JSON.parse(stdout);
      assert.equal(data.appended, true);
      assert.equal(exitCode, 0);
    });

    const written = fs.readFileSync(tempModule.absPath, 'utf8');
    cleanup(tempModule.absPath);
    assert.match(written, /KBX-M005/);
    assert.match(written, /Appended Rule/);
  });

  it('scaffold --append exits 1 when module shape is unsupported', async () => {
    const tempModule = makeRepoTempRuleModule('rules-append-unsupported.js', [
      "'use strict';",
      'module.exports = [];',
    ].join('\n'));

    await withMockedRegistryConfig(tempModule.relPath, async (mockedRunRules) => {
      const { exitCode } = await captureAsync(() => mockedRunRules({
        args: [
          'scaffold',
          'M',
          '--title=Bad Append',
          '--description=Unsupported append shape.',
          '--source-doc=template/15-governance/metadata-schema.md',
          '--since-version=v2.8.0',
          '--append',
        ],
      }));
      assert.equal(exitCode, 1);
    });

    cleanup(tempModule.absPath);
  });

  it('scaffold exits 1 when source doc path does not exist', async () => {
    const { exitCode, stderr } = await captureAsync(() => runRules({
      args: [
        'scaffold',
        'M',
        '--title=Bad Source',
        '--description=Invalid test.',
        '--source-doc=template/15-governance/does-not-exist.md',
        '--since-version=v2.8.0',
      ],
    }));
    assert.equal(exitCode, 1);
    assert.match(stderr, /source_doc path not found/);
  });
});

// ─── kbx rules lint ──────────────────────────────────────────────────────────

describe('kbx rules lint', () => {
  let emptyDir;
  before(() => { emptyDir = makeTmpKb({}); });
  after(() => cleanup(emptyDir));

  it('exits 0 on clean KB (no governed docs)', async () => {
    const { exitCode } = await captureAsync(() => runRules({ args: ['lint'], cwd: emptyDir }));
    assert.equal(exitCode, 0);
  });

  it('stdout includes "Rules run" summary', async () => {
    const { stdout } = await captureAsync(() => runRules({ args: ['lint'], cwd: emptyDir }));
    assert.ok(stdout.includes('Rules run'), `Expected summary line, got: ${stdout}`);
  });

  it('exits 1 when error violations found', async () => {
    const dir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'title: T', 'type: doc', '---', '# T',
      ].join('\n'),
    });
    const { exitCode } = await captureAsync(() => runRules({ args: ['lint'], cwd: dir }));
    cleanup(dir);
    assert.equal(exitCode, 1, 'Should exit 1 when error violations exist');
  });

  it('--json outputs valid JSON shape', async () => {
    const { stdout } = await captureAsync(() => runRules({ args: ['lint', '--json'], cwd: emptyDir }));
    const data = JSON.parse(stdout);
    assert.ok('violations' in data);
    assert.ok('rulesRun' in data);
    assert.ok('violationCount' in data);
    assert.ok(Array.isArray(data.violations));
  });

  it('unknown option exits 1 and shows error', async () => {
    const { exitCode, stderr } = await captureAsync(() => runRules({ args: ['lint', '--unknown-flag'], cwd: emptyDir }));
    assert.equal(exitCode, 1);
    assert.ok(stderr.includes('Unknown option'), `Expected error about unknown option, got: ${stderr}`);
  });
});

// ─── kbx rules check ─────────────────────────────────────────────────────────

describe('kbx rules check', () => {
  let emptyDir;
  before(() => { emptyDir = makeTmpKb({}); });
  after(() => cleanup(emptyDir));

  it('exits 0 when rule passes', async () => {
    const { exitCode, stdout } = await captureAsync(() =>
      runRules({ args: ['check', 'KBX-M001'], cwd: emptyDir })
    );
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes('[PASS]'), `Expected PASS, got: ${stdout}`);
  });

  it('exits 1 when rule not found', async () => {
    const { exitCode } = await captureAsync(() =>
      runRules({ args: ['check', 'NOT-REAL-RULE'], cwd: emptyDir })
    );
    assert.equal(exitCode, 1);
  });

  it('exits 1 without rule id argument', async () => {
    const { exitCode } = await captureAsync(() =>
      runRules({ args: ['check'], cwd: emptyDir })
    );
    assert.equal(exitCode, 1);
  });

  it('exits 1 when rule fails with violations', async () => {
    const dir = makeTmpKb({
      'knowledge-base/01-product/doc.md': [
        '---', 'type: doc', '---', '# Doc',
      ].join('\n'),
    });
    const { exitCode, stdout } = await captureAsync(() =>
      runRules({ args: ['check', 'KBX-M001'], cwd: dir })
    );
    cleanup(dir);
    assert.equal(exitCode, 1);
    assert.ok(stdout.includes('[FAIL]'), `Expected FAIL, got: ${stdout}`);
  });

  it('--json found:false for unknown rule', async () => {
    const { stdout } = await captureAsync(() =>
      runRules({ args: ['check', 'NO-RULE', '--json'], cwd: emptyDir })
    );
    const data = JSON.parse(stdout);
    assert.equal(data.found, false);
  });

  it('--json found:true with passed:true for known passing rule', async () => {
    const { stdout } = await captureAsync(() =>
      runRules({ args: ['check', 'KBX-M001', '--json'], cwd: emptyDir })
    );
    const data = JSON.parse(stdout);
    assert.equal(data.found, true);
    assert.equal(data.passed, true);
  });
});

// ─── kbx rules help ──────────────────────────────────────────────────────────

describe('kbx rules help', () => {
  it('outputs usage lines', async () => {
    const { stdout } = await captureAsync(() => runRules({ args: ['help'] }));
    assert.ok(stdout.includes('kbx rules lint'), `Expected usage line, got: ${stdout}`);
    assert.ok(stdout.includes('kbx rules check'), `Expected check line, got: ${stdout}`);
    assert.ok(stdout.includes('kbx rules list'), `Expected list line, got: ${stdout}`);
    assert.ok(stdout.includes('kbx rules next-id'), `Expected next-id line, got: ${stdout}`);
    assert.ok(stdout.includes('kbx rules scaffold'), `Expected scaffold line, got: ${stdout}`);
    assert.ok(stdout.includes('--append'), `Expected --append flag in help, got: ${stdout}`);
  });

  it('unknown subcommand exits 1 with error', async () => {
    const { exitCode, stderr } = await captureAsync(() => runRules({ args: ['nonexistent'] }));
    assert.equal(exitCode, 1);
    assert.ok(stderr.includes('Unknown rules subcommand'), `Expected error message, got: ${stderr}`);
  });
});
