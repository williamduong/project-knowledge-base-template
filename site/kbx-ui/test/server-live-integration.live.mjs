import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const cliPath = path.join(repoRoot, 'bin', 'kbx.js');

async function withServer(run) {
  const app = createApp();
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

function parseJsonLoose(value) {
  if (!value) return null;
  try {
    return JSON.parse(value.trim());
  } catch {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(value.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function runKbx(args, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`kbx command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        exitCode: code ?? 1,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        parsed: parseJsonLoose(stdout),
      });
    });
  });
}

async function cleanupIntent(intentId) {
  const cleanupResult = await runKbx(['intent', 'cancel', intentId, '--yes', '--json']);
  if (cleanupResult.exitCode === 0) {
    return;
  }

  const activePath = path.join(repoRoot, 'knowledge-base', 'intents', '_active', intentId);
  if (fs.existsSync(activePath)) {
    fs.rmSync(activePath, { recursive: true, force: true });
  }

  const verify = await runKbx(['intent', 'status', intentId, '--json']);
  if (verify.exitCode === 0) {
    throw new Error(`Cleanup failed for ${intentId}: ${cleanupResult.stderr || cleanupResult.stdout}`);
  }
}

test('live bridge integration: create -> update -> apply-preview -> cleanup', async () => {
  const unique = Date.now();
  const title = `C3 Live Intent ${unique}`;
  const requestedIntentId = `intent-c3-live-${unique}`;
  let createdIntentId = null;

  try {
    await withServer(async (baseUrl) => {
      const createResponse = await fetch(`${baseUrl}/api/intents/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent_id: requestedIntentId,
          title,
          focus: 'Phase C.3 integration',
          next_action: 'Bridge live integration validation',
          decision_summary: 'Create for live mutation flow',
        }),
      });

      assert.equal(createResponse.status, 200);
      const createPayload = await createResponse.json();
      assert.equal(createPayload.ok, true);

      const createResult = createPayload.result || {};
      createdIntentId = createResult.intent_id || createResult.id || null;
      assert.equal(typeof createdIntentId, 'string');
      assert.ok(createdIntentId.length > 0);
      assert.equal(createdIntentId, requestedIntentId);

      const updateResponse = await fetch(`${baseUrl}/api/intents/${encodeURIComponent(createdIntentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision_summary: 'Updated by Phase C.3 live integration test',
          focus: 'C3 updated focus',
        }),
      });

      assert.equal(updateResponse.status, 200);
      const updatePayload = await updateResponse.json();
      assert.equal(updatePayload.ok, true);
      assert.equal(updatePayload.result.id, createdIntentId);
      assert.ok(Array.isArray(updatePayload.result.updated_fields));

      const previewResponse = await fetch(`${baseUrl}/api/intents/${encodeURIComponent(createdIntentId)}/apply-preview`);
      assert.equal(previewResponse.status, 200);
      const previewPayload = await previewResponse.json();
      assert.equal(previewPayload.ok, true);
      assert.equal(previewPayload.intent_id, createdIntentId);
      assert.equal(typeof previewPayload.diff.files_changed, 'number');
      assert.ok(Array.isArray(previewPayload.diff.files));
      assert.ok(Array.isArray(previewPayload.warnings));
    });
  } finally {
    if (createdIntentId) {
      await cleanupIntent(createdIntentId);
    }
  }
});
