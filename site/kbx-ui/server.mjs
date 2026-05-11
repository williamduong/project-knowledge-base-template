import express from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const cliPath = path.join(repoRoot, 'bin', 'kbx.js');

const app = express();
const port = 4174;

function runKbx(args, timeoutMs = 15000) {
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
      resolve({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

app.get('/api/version', async (_req, res) => {
  try {
    const result = await runKbx(['--version']);
    res.status(result.code === 0 ? 200 : 500).json({
      command: 'kbx --version',
      ok: result.code === 0,
      exitCode: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error) {
    res.status(500).json({
      command: 'kbx --version',
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get('/api/interaction-model', (_req, res) => {
  res.json({
    chat: 'Copilot Chat with KBAgent proposes actions and prompts inside VS Code.',
    web: 'Localhost UI reads runtime state and triggers CLI-backed actions.',
    writePath: 'CLI is the only deterministic mutation path.',
  });
});

app.listen(port, () => {
  console.log(`kbx-ui bridge listening on http://localhost:${port}`);
});

app.get('/api/status', async (_req, res) => {
  try {
    const result = await runKbx(['status', '--json']);
    const parsed = parseJsonSafe(result.stdout);

    res.status(result.code === 0 ? 200 : 500).json({
      command: 'kbx status --json',
      ok: result.code === 0,
      exitCode: result.code,
      parsed,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error) {
    res.status(500).json({
      command: 'kbx status --json',
      ok: false,
      exitCode: 1,
      parsed: null,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
    });
  }
});