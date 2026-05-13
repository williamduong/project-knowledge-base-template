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

  // Phase 4 mutation commands
  if (command.includes('intent create')) {
    return Promise.resolve({
      command,
      ok: true,
      exitCode: 0,
      parsed: {
        id: 'v2-11-test-intent',
        title: 'Test Intent',
        lifecycle: 'draft',
        created_at: '2025-01-15T10:00:00Z',
      },
      stdout: '',
      stderr: '',
    });
  }

  if (command.includes('intent update')) {
    return Promise.resolve({
      command,
      ok: true,
      exitCode: 0,
      parsed: {
        command: 'kbx intent update',
        intent_id: 'v2-11-test-intent',
        updated_fields: ['title', 'focus'],
        state: 'draft',
        status: 'updated',
      },
      stdout: '',
      stderr: '',
    });
  }

  if (command.includes('intent approve')) {
    return Promise.resolve({
      command,
      ok: true,
      exitCode: 0,
      parsed: {
        id: 'v2-11-test-intent',
        lifecycle: 'staged',
        approved_at: '2025-01-15T10:02:00Z',
      },
      stdout: '',
      stderr: '',
    });
  }

  if (command.includes('apply-preview')) {
    return Promise.resolve({
      command,
      ok: true,
      exitCode: 0,
      parsed: {
        command: 'kbx intent apply-preview',
        intent_id: 'v2-11-test-intent',
        files_changed: 2,
        insertions: 0,
        deletions: 0,
        files: [
          { file: 'knowledge-base/15-governance/example.md', op: 'modified' },
          { file: 'knowledge-base/12-ai-skills/extra.md', op: 'new' },
        ],
        warnings: [{ level: 'warn', message: 'Ensure catalog.json is valid' }],
        status: 'preview',
      },
      stdout: '',
      stderr: '',
    });
  }

  if (command.includes('intent apply')) {
    return Promise.resolve({
      command,
      ok: true,
      exitCode: 0,
      parsed: {
        id: 'v2-11-test-intent',
        lifecycle: 'active',
        applied_at: '2025-01-15T10:03:00Z',
        changes: 2,
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
    assert.equal(payload.ok, true);
    assert.ok(Array.isArray(payload.gates));
    assert.equal(payload.gates.length > 0, true);
    assert.equal(payload.commands.status.command, 'kbx status --json');
  });
});

test('GET / returns bridge landing page', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type')?.includes('text/html'), true);

    const body = await response.text();
    assert.equal(body.includes('KBAgent Bridge'), true);
    assert.equal(body.includes('http://localhost:4174'), true);
    assert.equal(body.includes('http://localhost:4173'), true);
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
    assert.equal(response.status, 200);

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
    assert.equal(response.status, 200);

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

// Phase 4 Mutation Tests

test('POST /api/intents/create creates intent with valid title', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/intents/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Intent',
        focus: 'Phase 4',
        next_action: 'Implement forms',
      }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.result.id, 'v2-11-test-intent');
    assert.ok(Array.isArray(payload.trace));
  });
});

test('POST /api/intents/create rejects empty title', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/intents/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '',
      }),
    });

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(typeof payload.error, 'string');
  });
});

test('PATCH /api/intents/{id} updates intent fields', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/intents/v2-11-test-intent`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Intent',
        focus: 'Phase 4 Complete',
      }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.result.id, 'v2-11-test-intent');
    assert.deepEqual(payload.result.updated_fields, ['title', 'focus']);
    assert.equal(payload.result.status, 'updated');
    assert.ok(Array.isArray(payload.trace));
  });
});

test('PATCH /api/intents/{id} rejects missing id', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/intents/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Update' }),
    });

    assert.equal(response.status, 404);
  });
});

test('POST /api/intents/{id}/approve transitions to staged', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/intents/v2-11-test-intent/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approval_note: 'Looks good',
      }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.result.lifecycle, 'staged');
    assert.ok(Array.isArray(payload.trace));
  });
});

test('GET /api/intents/{id}/apply-preview returns diff and warnings', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/intents/v2-11-test-intent/apply-preview`);

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.intent_id, 'v2-11-test-intent');
    assert.equal(payload.status, 'preview');
    assert.equal(payload.diff.files_changed, 2);
    assert.ok(Array.isArray(payload.diff.files));
    assert.ok(Array.isArray(payload.warnings));
  });
});

test('POST /api/intents/{id}/apply applies intent with confirmed flag', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/intents/v2-11-test-intent/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirmed: true,
      }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.result.lifecycle, 'active');
    assert.ok(Array.isArray(payload.trace));
  });
});

test('POST /api/intents/{id}/apply rejects unconfirmed apply', async () => {
  await withServer(mockRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/intents/v2-11-test-intent/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirmed: false,
      }),
    });

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.ok, false);
  });
});

test('POST /api/intents/create handles CLI command failure', async () => {
  const failRunner = (command) => {
    if (command.includes('intent create')) {
      return Promise.resolve({
        command,
        ok: false,
        exitCode: 1,
        parsed: null,
        stdout: '',
        stderr: 'intent creation failed',
      });
    }
    return mockRunner(command);
  };

  await withServer(failRunner, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/intents/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Failed Intent',
      }),
    });

    assert.equal(response.status, 500);
    const payload = await response.json();
    assert.equal(payload.ok, false);
    assert.equal(typeof payload.error, 'string');
  });
});
