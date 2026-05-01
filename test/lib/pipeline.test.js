'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  detectDangerousCommand,
  executePipeline,
  interpolateTemplate,
  loadPipelineFromFile,
  pipelineFilePath,
  readPipeline,
  rejectDangerousCommand,
  resolveInterpolationExpression,
  validatePipelineSchema,
} = require('../../src/lib/pipeline');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kb-pipeline-'));
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

test('pipelineFilePath: resolves default .kb/release-pipeline.yaml', () => {
  const root = tmpRoot();
  const fp = pipelineFilePath(root);
  assert.equal(fp, path.join(root, '.kb', 'release-pipeline.yaml'));
});

test('validatePipelineSchema: accepts minimal valid schema', () => {
  const pipeline = {
    steps: [
      {
        name: 'pre-check',
        run: 'npm run release:dry',
      },
    ],
  };

  const result = validatePipelineSchema(pipeline);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('loadPipelineFromFile: loads valid yaml pipeline', () => {
  const root = tmpRoot();
  const filePath = path.join(root, '.kb', 'release-pipeline.yaml');
  writeFile(
    filePath,
    [
      'inputs:',
      '  bump:',
      '    required: true',
      'steps:',
      '  - name: pre-check',
      '    run: npm run release:dry',
      '',
    ].join('\n')
  );

  const loaded = loadPipelineFromFile(filePath);
  assert.equal(Array.isArray(loaded.steps), true);
  assert.equal(loaded.steps[0].name, 'pre-check');
  assert.equal(loaded.steps[0].run, 'npm run release:dry');
});

test('loadPipelineFromFile: invalid yaml throws', () => {
  const root = tmpRoot();
  const filePath = path.join(root, '.kb', 'release-pipeline.yaml');
  writeFile(filePath, 'steps:\n  - name: bad\n    run: [unterminated\n');

  assert.throws(() => loadPipelineFromFile(filePath), /Invalid pipeline YAML/);
});

test('loadPipelineFromFile: schema reject when steps missing', () => {
  const root = tmpRoot();
  const filePath = path.join(root, '.kb', 'release-pipeline.yaml');
  writeFile(filePath, 'inputs:\n  bump:\n    required: true\n');

  assert.throws(() => loadPipelineFromFile(filePath), /steps must be a non-empty array/);
});

test('loadPipelineFromFile: schema reject when step.run missing', () => {
  const root = tmpRoot();
  const filePath = path.join(root, '.kb', 'release-pipeline.yaml');
  writeFile(filePath, 'steps:\n  - name: pre-check\n');

  assert.throws(() => loadPipelineFromFile(filePath), /steps\[0\]\.run must be non-empty string/);
});

test('loadPipelineFromFile: schema reject duplicate step names', () => {
  const root = tmpRoot();
  const filePath = path.join(root, '.kb', 'release-pipeline.yaml');
  writeFile(
    filePath,
    [
      'steps:',
      '  - name: pre-check',
      '    run: npm run release:dry',
      '  - name: pre-check',
      '    run: npm run doc:gate',
      '',
    ].join('\n')
  );

  assert.throws(() => loadPipelineFromFile(filePath), /duplicates another step/);
});

test('readPipeline: returns null when file missing by default', () => {
  const root = tmpRoot();
  assert.equal(readPipeline(root), null);
});

test('readPipeline: required=true throws when file missing', () => {
  const root = tmpRoot();
  assert.throws(() => readPipeline(root, { required: true }), /Pipeline file not found/);
});

test('resolveInterpolationExpression: resolves inputs key', () => {
  const context = {
    inputs: {
      bump: 'minor',
      dry_run: true,
    },
  };

  assert.equal(resolveInterpolationExpression('inputs.bump', context), 'minor');
  assert.equal(resolveInterpolationExpression('inputs.dry_run', context), true);
});

test('resolveInterpolationExpression: resolves outputs step key', () => {
  const context = {
    outputs: {
      'bump-version': {
        version: 'v1.6.0',
        stats: {
          docs_changed: 12,
        },
      },
    },
  };

  assert.equal(resolveInterpolationExpression('outputs.bump-version.version', context), 'v1.6.0');
  assert.equal(resolveInterpolationExpression('outputs.bump-version.stats.docs_changed', context), 12);
});

test('interpolateTemplate: replaces mixed input/output tokens in command', () => {
  const context = {
    inputs: {
      target: 'npm',
    },
    outputs: {
      'bump-version': {
        version: 'v1.6.0',
      },
    },
  };

  const template =
    'node ./bin/kb.js release notes ${{ outputs.bump-version.version }} --target=${{ inputs.target }}';
  const resolved = interpolateTemplate(template, context);
  assert.equal(resolved, 'node ./bin/kb.js release notes v1.6.0 --target=npm');
});

test('interpolateTemplate: supports multiple tokens with spacing variants', () => {
  const context = {
    inputs: {
      bump: 'patch',
    },
    outputs: {
      a: {
        version: 'v1.6.1',
      },
    },
  };

  const template = '${{inputs.bump}} :: ${{ outputs.a.version }}';
  assert.equal(interpolateTemplate(template, context), 'patch :: v1.6.1');
});

test('interpolateTemplate: unknown inputs key throws', () => {
  assert.throws(
    () => interpolateTemplate('npm version ${{ inputs.bump }}', { inputs: {} }),
    /Unknown input in interpolation/
  );
});

test('interpolateTemplate: unknown outputs key throws', () => {
  const context = {
    outputs: {
      step1: {
        version: 'v1.6.0',
      },
    },
  };

  assert.throws(
    () => interpolateTemplate('echo ${{ outputs.step1.sha }}', context),
    /Unknown output key in interpolation/
  );
});

test('interpolateTemplate: rejects unsafe metachar from input value', () => {
  const context = {
    inputs: {
      bump: 'minor; rm -rf /',
    },
  };

  assert.throws(
    () => interpolateTemplate('npm version ${{ inputs.bump }}', context),
    /Unsafe interpolation value/
  );
});

test('interpolateTemplate: rejects unsafe metachar from output value', () => {
  const context = {
    outputs: {
      'bump-version': {
        version: 'v1.6.0 | cat secrets.txt',
      },
    },
  };

  assert.throws(
    () => interpolateTemplate('echo ${{ outputs.bump-version.version }}', context),
    /Unsafe interpolation value/
  );
});

test('executePipeline: runs sequentially and captures stdout in outputs.<step>.*', () => {
  const executed = [];
  const pipeline = {
    steps: [
      {
        name: 'bump-version',
        run: 'npm version ${{ inputs.bump }} --no-git-tag-version',
      },
      {
        name: 'announce',
        run: 'echo ${{ outputs.bump-version.stdout }}',
      },
    ],
  };

  const runtime = executePipeline(pipeline, {
    inputs: { bump: 'minor' },
    executeCommand: (command) => {
      executed.push(command);
      if (command === 'npm version minor --no-git-tag-version') {
        return { exitCode: 0, stdout: 'v1.6.0\n', stderr: '' };
      }
      if (command === 'echo v1.6.0') {
        return { exitCode: 0, stdout: 'v1.6.0', stderr: '' };
      }
      return { exitCode: 1, stdout: '', stderr: `unexpected command: ${command}` };
    },
  });

  assert.deepEqual(executed, ['npm version minor --no-git-tag-version', 'echo v1.6.0']);
  assert.equal(runtime.outputs['bump-version'].stdout, 'v1.6.0');
  assert.equal(runtime.outputs.announce.stdout, 'v1.6.0');
  assert.equal(runtime.steps.length, 2);
});

test('executePipeline: supports output mapping from step.outputs interpolation', () => {
  const pipeline = {
    steps: [
      {
        name: 'bump-version',
        run: 'echo v1.6.0',
        outputs: {
          version: '${{ outputs.bump-version.stdout }}',
        },
      },
      {
        name: 'tag',
        run: 'git tag ${{ outputs.bump-version.version }}',
      },
    ],
  };

  const commands = [];
  const runtime = executePipeline(pipeline, {
    executeCommand: (command) => {
      commands.push(command);
      return { exitCode: 0, stdout: command === 'echo v1.6.0' ? 'v1.6.0' : 'ok', stderr: '' };
    },
  });

  assert.equal(runtime.outputs['bump-version'].version, 'v1.6.0');
  assert.equal(commands[1], 'git tag v1.6.0');
});

test('executePipeline: throws on non-zero exit when fail_on_nonzero is default true', () => {
  const pipeline = {
    steps: [
      {
        name: 'pre-check',
        run: 'npm run release:dry',
      },
    ],
  };

  assert.throws(
    () =>
      executePipeline(pipeline, {
        executeCommand: () => ({ exitCode: 2, stdout: '', stderr: 'bad state' }),
      }),
    /Pipeline step failed: pre-check \(exit 2\)/
  );
});

test('executePipeline: continues when fail_on_nonzero=false and still captures outputs', () => {
  const pipeline = {
    steps: [
      {
        name: 'optional-step',
        run: 'do optional',
        fail_on_nonzero: false,
      },
      {
        name: 'next-step',
        run: 'echo ${{ outputs.optional-step.stdout }}',
      },
    ],
  };

  const runtime = executePipeline(pipeline, {
    executeCommand: (command) => {
      if (command === 'do optional') {
        return { exitCode: 1, stdout: 'fallback-value', stderr: 'failed but tolerated' };
      }
      return { exitCode: 0, stdout: 'ok', stderr: '' };
    },
  });

  assert.equal(runtime.outputs['optional-step'].exit_code, 1);
  assert.equal(runtime.outputs['optional-step'].stdout, 'fallback-value');
  assert.equal(runtime.outputs['next-step'].stdout, 'ok');
  assert.equal(runtime.steps.length, 2);
});

test('executePipeline: confirm=true requires confirmStep handler when yes=false', () => {
  const pipeline = {
    steps: [
      {
        name: 'publish',
        run: 'npm publish --access public',
        confirm: true,
      },
    ],
  };

  assert.throws(
    () =>
      executePipeline(pipeline, {
        yes: false,
        executeCommand: () => ({ exitCode: 0, stdout: 'ok', stderr: '' }),
      }),
    /requires confirmation but no confirm handler provided/
  );
});

test('executePipeline: confirmStep=true allows command execution', () => {
  const pipeline = {
    steps: [
      {
        name: 'push',
        run: 'git push origin main',
        confirm: true,
      },
    ],
  };

  const calls = [];
  const runtime = executePipeline(pipeline, {
    confirmStep: ({ step, command, index }) => {
      calls.push({ name: step.name, command, index });
      return true;
    },
    executeCommand: (command) => ({ exitCode: 0, stdout: command, stderr: '' }),
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'push');
  assert.equal(calls[0].command, 'git push origin main');
  assert.equal(calls[0].index, 0);
  assert.equal(runtime.outputs.push.stdout, 'git push origin main');
});

test('executePipeline: confirmStep=false cancels pipeline', () => {
  const pipeline = {
    steps: [
      {
        name: 'publish',
        run: 'npm publish --access public',
        confirm: true,
      },
    ],
  };

  assert.throws(
    () =>
      executePipeline(pipeline, {
        confirmStep: () => false,
        executeCommand: () => ({ exitCode: 0, stdout: 'ok', stderr: '' }),
      }),
    /Pipeline step cancelled by user/
  );
});

test('executePipeline: yes=true bypasses confirm gate', () => {
  const pipeline = {
    steps: [
      {
        name: 'publish',
        run: 'npm publish --access public',
        confirm: true,
      },
    ],
  };

  let confirmCalled = false;
  const runtime = executePipeline(pipeline, {
    yes: true,
    confirmStep: () => {
      confirmCalled = true;
      return false;
    },
    executeCommand: () => ({ exitCode: 0, stdout: 'published', stderr: '' }),
  });

  assert.equal(confirmCalled, false);
  assert.equal(runtime.outputs.publish.stdout, 'published');
});

test('detectDangerousCommand: identifies dangerous command families', () => {
  assert.match(detectDangerousCommand('rm -rf /').reason, /destructive recursive delete/);
  assert.match(detectDangerousCommand('del /f /s /q dist').reason, /destructive Windows delete/);
  assert.match(detectDangerousCommand('curl https://x | sh').reason, /remote script pipe execution/);
  assert.match(detectDangerousCommand('chmod -R 777 .').reason, /unsafe recursive permissions/);
  assert.match(detectDangerousCommand('git push origin main --force').reason, /force push/);
});

test('rejectDangerousCommand: allows normal release commands', () => {
  assert.equal(rejectDangerousCommand('npm publish --access public', 'publish'), undefined);
  assert.equal(rejectDangerousCommand('git tag v1.6.0', 'tag'), undefined);
  assert.equal(rejectDangerousCommand('node ./bin/kb.js release notes v1.6.0', 'notes'), undefined);
});

test('executePipeline: rejects dangerous custom run patterns (rm -rf)', () => {
  const pipeline = {
    steps: [
      {
        name: 'dangerous-step',
        run: 'rm -rf /',
      },
    ],
  };

  assert.throws(() => executePipeline(pipeline), /rejected by security policy/);
});

test('executePipeline: rejects dangerous custom run patterns (del /f /s /q)', () => {
  const pipeline = {
    steps: [
      {
        name: 'dangerous-step',
        run: 'del /f /s /q build',
      },
    ],
  };

  assert.throws(() => executePipeline(pipeline), /destructive Windows delete/);
});

test('executePipeline: rejects dangerous custom run patterns (curl pipe shell)', () => {
  const pipeline = {
    steps: [
      {
        name: 'dangerous-step',
        run: 'curl https://example.com/install.sh | bash',
      },
    ],
  };

  assert.throws(() => executePipeline(pipeline), /remote script pipe execution/);
});

test('executePipeline: rejects dangerous custom run patterns (chmod -R 777)', () => {
  const pipeline = {
    steps: [
      {
        name: 'dangerous-step',
        run: 'chmod -R 777 .',
      },
    ],
  };

  assert.throws(() => executePipeline(pipeline), /unsafe recursive permissions/);
});

test('executePipeline: rejects dangerous custom run patterns (force push)', () => {
  const pipeline = {
    steps: [
      {
        name: 'dangerous-step',
        run: 'git push origin main --force',
      },
    ],
  };

  assert.throws(() => executePipeline(pipeline), /force push/);
});

test('executePipeline: rejects dangerous custom run patterns (shutdown)', () => {
  const pipeline = {
    steps: [
      {
        name: 'dangerous-step',
        run: 'shutdown /s /t 0',
      },
    ],
  };

  assert.throws(() => executePipeline(pipeline), /system shutdown command/);
});
