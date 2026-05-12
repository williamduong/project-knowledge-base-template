import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';

async function withServer(commandRunner, run) {
  const app = createApp(commandRunner);
  const server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.on('listening', resolve);
    server.on('error', reject);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Unable to resolve test server address');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function mockRunner(command) {
  if (command === 'kbx rules list --json') {
    return Promise.resolve({
      command,
      ok: true,
      exitCode: 0,
      parsed: {
        count: 2,
        rules: [
          { id: 'KBX-M001', severity: 'error', title: 'Required frontmatter fields' },
          { id: 'KBX-V001', severity: 'error', title: 'time_state required with code-verified' },
        ],
      },
      stdout: '',
      stderr: '',
    });
  }

  if (command === 'kbx intent list --all --json') {
    return Promise.resolve({
      command,
      ok: true,
      exitCode: 0,
      parsed: {
        count: 1,
        intents: [{ id: 'v2-10-sample', lifecycle: 'active', mode: 'full' }],
      },
      stdout: '',
      stderr: '',
    });
  }

  if (command === 'kbx status --json') {
    return Promise.resolve({
      command,
      ok: true,
      exitCode: 0,
      parsed: {
        activeIntents: { count: 1 },
      },
      stdout: 'ok',
      stderr: '',
    });
  }

  if (command === 'kbx doctor --json') {
    return Promise.resolve({
      command,
      ok: true,
      exitCode: 0,
      parsed: {
        checks: [{ name: 'rules-lint', status: 'PASS' }],
      },
      stdout: 'ok',
      stderr: '',
    });
  }

  if (command === 'kbx chaos --estimate') {
    return Promise.resolve({
      command,
      ok: true,
      exitCode: 0,
      parsed: null,
      stdout: 'Forward estimates: STABLE',
      stderr: '',
    });
  }

  if (command === 'kbx graph check --json') {
    return Promise.resolve({
      command,
      ok: true,
      exitCode: 0,
      parsed: {
        entity_count: 10,
        relation_count: 4,
        issue_count: 1,
        issues: [
          {
            check_id: 'missing-node-reference',
            severity: 'error',
            message: 'missing node relation detected',
            evidence_path: '.kb/catalog.json',
          },
        ],
      },
      stdout: '',
      stderr: '',
    });
  }

  return Promise.resolve({
    command,
    ok: false,
    exitCode: 1,
    parsed: null,
    stdout: '',
    stderr: 'unsupported command in test',
  });
}

test('GET /api/rules returns contract payload', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/rules`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.command, 'kbx rules list --json');
    assert.equal(payload.parsed.count, 2);
    assert.ok(Array.isArray(payload.parsed.rules));
    assert.equal(payload.parsed.rules[0].id, 'KBX-M001');
  });
});

test('GET /api/intents returns contract payload', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/intents`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.command, 'kbx intent list --all --json');
    assert.equal(payload.parsed.count, 1);
    assert.ok(Array.isArray(payload.parsed.intents));
    assert.equal(payload.parsed.intents[0].id, 'v2-10-sample');
  });
});

test('GET /api/phase2-bridge returns gate summary contract', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/phase2-bridge`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.phase, 'phase-2-cli-bridge');
    assert.equal(typeof payload.checkedAt, 'string');
    assert.equal(payload.summary.blocked, false);
    assert.ok(Array.isArray(payload.gates));
    assert.equal(payload.gates.length > 0, true);
    assert.equal(payload.commands.status.command, 'kbx status --json');
  });
});

test('GET /api/workspace returns summary contract', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/workspace`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.summary.activeIntentCount, 1);
    assert.equal(typeof payload.summary.hasWorkingTreeChanges, 'boolean');
  });
});

test('GET /api/workspace returns error on command fail', async () => {
  const failRunner = () => Promise.resolve({
    command: 'kbx status --json',
    ok: false,
    exitCode: 1,
    parsed: null,
    stdout: '',
    stderr: 'command failed',
  });

  await withServer(failRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/workspace`);
    assert.equal(response.status, 500);

    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'workspace command failed');
  });
});

test('GET /api/system returns summary contract', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/system`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.summary.checkSummary.pass >= 1, true);
    assert.equal(payload.summary.result, null);
  });
});

test('GET /api/system returns error on command fail', async () => {
  const failRunner = () => Promise.resolve({
    command: 'kbx doctor --json',
    ok: false,
    exitCode: 1,
    parsed: null,
    stdout: '',
    stderr: 'doctor check failed',
  });

  await withServer(failRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/system`);
    assert.equal(response.status, 500);

    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'system command failed');
  });
});

test('GET /api/documents returns summary contract', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/documents`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.summary.entityCount, 10);
    assert.equal(payload.summary.issueCount, 1);
    assert.equal(payload.summary.topIssues[0].checkId, 'missing-node-reference');
  });
});

test('GET /api/documents returns error on command fail', async () => {
  const failRunner = () => Promise.resolve({
    command: 'kbx graph check --json',
    ok: false,
    exitCode: 1,
    parsed: null,
    stdout: '',
    stderr: 'graph check failed',
  });

  await withServer(failRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/documents`);
    assert.equal(response.status, 500);

    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(payload.error, 'documents command failed');
  });
});
