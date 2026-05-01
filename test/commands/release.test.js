'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getRuntimeReleaseVersion,
  normalizeReleaseVersionCandidate,
  parseArgs,
  getReleaseContentPaths,
  releaseTemplatePath,
  runReleaseInitPipeline,
  runReleasePosthookCatalogUpdate,
  runReleasePrecheck,
} = require('../../src/commands/release');
const { writeConfig } = require('../../src/lib/config');
const fs = require('fs');
const os = require('os');
const path = require('path');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-release-'));
}

test('release parseArgs: init defaults', () => {
  const o = parseArgs(['init']);
  assert.equal(o.sub, 'init');
  assert.equal(o.json, false);
});

test('release parseArgs: init with prerelease override', () => {
  const o = parseArgs(['init', '--include-prerelease', '--json']);
  assert.equal(o.sub, 'init');
  assert.equal(o.ignorePrerelease, false);
  assert.equal(o.json, true);
});

test('release parseArgs: tag requires summary', () => {
  assert.throws(() => parseArgs(['tag', 'v1.5.0']), /requires --summary/);
  const ok = parseArgs(['tag', 'v1.5.0', '--summary=ship']);
  assert.equal(ok.version, 'v1.5.0');
  assert.equal(ok.summary, 'ship');
});

test('release parseArgs: list/show forms', () => {
  const list = parseArgs(['list']);
  assert.equal(list.sub, 'list');

  const show = parseArgs(['show', 'v1.5.0']);
  assert.equal(show.sub, 'show');
  assert.equal(show.version, 'v1.5.0');
});

test('release parseArgs: notes defaults and options', () => {
  const defaults = parseArgs(['notes', 'v1.5.0']);
  assert.equal(defaults.sub, 'notes');
  assert.equal(defaults.version, 'v1.5.0');
  assert.equal(defaults.format, 'md');

  const jsonFmt = parseArgs([
    'notes',
    'v1.5.0',
    '--from=v1.4.0',
    '--output=notes.md',
    '--format=json',
  ]);
  assert.equal(jsonFmt.from, 'v1.4.0');
  assert.equal(jsonFmt.output, 'notes.md');
  assert.equal(jsonFmt.format, 'json');
});

test('release parseArgs: notes invalid format throws', () => {
  assert.throws(() => parseArgs(['notes', 'v1.5.0', '--format=xml']), /--format must be md or json/);
});

test('release parseArgs: ignores bare -- separator', () => {
  const parsed = parseArgs(['notes', 'v1.5.0', '--', '--from=v1.4.0', '--format=json']);
  assert.equal(parsed.sub, 'notes');
  assert.equal(parsed.version, 'v1.5.0');
  assert.equal(parsed.from, 'v1.4.0');
  assert.equal(parsed.format, 'json');
});

test('release parseArgs: unknown option throws', () => {
  assert.throws(() => parseArgs(['init', '--bogus']), /Unknown release option/);
});

test('release parseArgs: run supports pipeline flags', () => {
  const parsed = parseArgs([
    'run',
    '--bump=minor',
    '--target=gh',
    '--from=v1.5.0',
    '--file=notes/v1.6-phase0/release-pipeline.sample.yaml',
    '--yes',
  ]);

  assert.equal(parsed.sub, 'run');
  assert.equal(parsed.bump, 'minor');
  assert.equal(parsed.target, 'gh');
  assert.equal(parsed.from, 'v1.5.0');
  assert.equal(parsed.file, 'notes/v1.6-phase0/release-pipeline.sample.yaml');
  assert.equal(parsed.yes, true);
  assert.equal(parsed.dryRun, false);
});

test('release parseArgs: plan is dry-run alias', () => {
  const parsed = parseArgs(['plan', '-f', 'pipeline.yaml', '--bump=patch']);
  assert.equal(parsed.sub, 'plan');
  assert.equal(parsed.file, 'pipeline.yaml');
  assert.equal(parsed.bump, 'patch');
  assert.equal(parsed.dryRun, true);
});

test('release parseArgs: init-pipeline defaults and validation', () => {
  const defaults = parseArgs(['init-pipeline']);
  assert.equal(defaults.sub, 'init-pipeline');
  assert.equal(defaults.template, 'npm-package');

  const custom = parseArgs(['init-pipeline', '--template=custom']);
  assert.equal(custom.template, 'custom');

  assert.throws(
    () => parseArgs(['init-pipeline', '--template=unknown']),
    /--template must be npm-package, docs-only, or custom/
  );
});

test('release parseArgs: run rejects invalid bump/target', () => {
  assert.throws(() => parseArgs(['run', '--bump=hotfix']), /--bump must be patch, minor, or major/);
  assert.throws(() => parseArgs(['run', '--target=docker']), /--target must be npm, gh, or all/);
});

test('getReleaseContentPaths: returns defaults when config missing', () => {
  const root = tmpRoot();
  const paths = getReleaseContentPaths(root);
  assert.deepEqual(paths, ['knowledge-base/', 'template/']);
});

test('getReleaseContentPaths: reads configured values', () => {
  const root = tmpRoot();
  writeConfig(root, {
    release: {
      contentPaths: ['docs', 'template/'],
    },
  });

  const paths = getReleaseContentPaths(root);
  assert.deepEqual(paths, ['docs/', 'template/']);
});

test('release init-pipeline: copies selected template to pipeline path', () => {
  const root = tmpRoot();

  runReleaseInitPipeline({
    contentRoot: root,
    options: {
      template: 'docs-only',
      yes: false,
      json: true,
    },
  });

  const writtenPath = path.join(root, '.kb', 'release-pipeline.yaml');
  assert.equal(fs.existsSync(writtenPath), true);

  const repoRoot = path.resolve(__dirname, '..', '..');
  const templatePath = releaseTemplatePath(repoRoot, 'docs-only');
  const expected = fs.readFileSync(templatePath, 'utf8');
  const actual = fs.readFileSync(writtenPath, 'utf8');
  assert.equal(actual, expected);
});

test('release init-pipeline: refuses overwrite without --yes', () => {
  const root = tmpRoot();

  runReleaseInitPipeline({
    contentRoot: root,
    options: {
      template: 'npm-package',
      yes: false,
      json: true,
    },
  });

  assert.throws(
    () => runReleaseInitPipeline({
      contentRoot: root,
      options: {
        template: 'custom',
        yes: false,
        json: true,
      },
    }),
    /Re-run with --yes to overwrite/
  );
});

test('release init-pipeline: overwrite works with --yes', () => {
  const root = tmpRoot();

  runReleaseInitPipeline({
    contentRoot: root,
    options: {
      template: 'npm-package',
      yes: false,
      json: true,
    },
  });

  runReleaseInitPipeline({
    contentRoot: root,
    options: {
      template: 'custom',
      yes: true,
      json: true,
    },
  });

  const writtenPath = path.join(root, '.kb', 'release-pipeline.yaml');
  const content = fs.readFileSync(writtenPath, 'utf8');
  assert.match(content, /Release pipeline template:\s*custom/);
});

test('release pre-check: passes when kb status --quiet returns clean', () => {
  const result = runReleasePrecheck({
    workspaceRoot: process.cwd(),
    processRunner: () => ({
      status: 0,
      stdout: 'clean\n',
      stderr: '',
    }),
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.status, 'clean');
});

test('release pre-check: fails fast when kb status --quiet is non-zero', () => {
  assert.throws(
    () => runReleasePrecheck({
      workspaceRoot: process.cwd(),
      processRunner: () => ({
        status: 1,
        stdout: 'attention\n',
        stderr: '',
      }),
    }),
    /Release blocked by status pre-check \(attention\)/
  );
});

test('release pre-check: throws when runner reports execution error', () => {
  assert.throws(
    () => runReleasePrecheck({
      workspaceRoot: process.cwd(),
      processRunner: () => ({
        status: null,
        stdout: '',
        stderr: '',
        error: new Error('spawn failed'),
      }),
    }),
    /Release pre-check failed to execute/
  );
});

test('release normalize version: accepts v-prefixed and plain semver', () => {
  assert.equal(normalizeReleaseVersionCandidate('v1.6.0'), 'v1.6.0');
  assert.equal(normalizeReleaseVersionCandidate('1.6.1'), 'v1.6.1');
  assert.equal(normalizeReleaseVersionCandidate('v1.6.2-rc.1'), 'v1.6.2-rc.1');
  assert.equal(normalizeReleaseVersionCandidate('release-v1.6.0'), null);
});

test('release runtime version: prefers bump-version.version then stdout', () => {
  const fromVersion = getRuntimeReleaseVersion({
    outputs: {
      'bump-version': {
        version: '1.7.0',
        stdout: 'v1.7.0',
      },
    },
  });
  assert.equal(fromVersion, 'v1.7.0');

  const fromStdout = getRuntimeReleaseVersion({
    outputs: {
      'bump-version': {
        stdout: 'v1.7.1\n',
      },
    },
  });
  assert.equal(fromStdout, 'v1.7.1');
});

test('release post-hook: calls upsert with resolved version and summary', () => {
  const calls = [];
  const result = runReleasePosthookCatalogUpdate({
    workspaceRoot: process.cwd(),
    contentRoot: process.cwd(),
    runtime: {
      outputs: {
        'bump-version': {
          version: 'v1.8.0',
          stdout: 'v1.8.0',
        },
      },
    },
    inputs: {
      bump: 'minor',
      target: 'gh',
    },
    upsertReleaseFn: (payload) => {
      calls.push(payload);
      return {
        updated: true,
        version: payload.version,
        reason: null,
        summary: payload.summary,
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].version, 'v1.8.0');
  assert.match(calls[0].summary, /Auto pipeline release v1\.8\.0/);
  assert.match(calls[0].summary, /bump=minor/);
  assert.match(calls[0].summary, /target=gh/);
  assert.equal(result.hook, 'catalog-update');
  assert.equal(result.updated, true);
});

test('release post-hook: throws when runtime cannot provide release version', () => {
  assert.throws(
    () => runReleasePosthookCatalogUpdate({
      workspaceRoot: process.cwd(),
      contentRoot: process.cwd(),
      runtime: {
        outputs: {
          'build-only': {
            stdout: 'done',
          },
        },
      },
      inputs: {
        bump: 'patch',
      },
      upsertReleaseFn: () => ({ updated: true, version: 'v0.0.0', reason: null, summary: '' }),
    }),
    /cannot resolve release version/
  );
});
