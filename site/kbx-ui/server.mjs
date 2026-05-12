import express from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluatePhase2Gates } from './bridge-gates.mjs';

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

function parseJsonLoose(value) {
  if (!value) {
    return null;
  }

  const direct = parseJsonSafe(value.trim());
  if (direct) {
    return direct;
  }

  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return parseJsonSafe(value.slice(start, end + 1));
  }

  return null;
}

async function executeBridgeCommand(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const expectJson = options.expectJson ?? false;

  try {
    const result = await runKbx(args, timeoutMs);
    const parsed = expectJson ? parseJsonLoose(result.stdout) : null;

    return {
      command,
      ok: result.code === 0,
      exitCode: result.code,
      parsed,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    return {
      command,
      ok: false,
      exitCode: 1,
      parsed: null,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}

app.get('/api/version', async (_req, res) => {
  const response = await executeBridgeCommand('kbx --version', ['--version']);
  res.status(response.ok ? 200 : 500).json(response);
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
  const response = await executeBridgeCommand('kbx status --json', ['status', '--json'], {
    expectJson: true,
    timeoutMs: 20000,
  });
  res.status(response.ok ? 200 : 500).json(response);
});

app.get('/api/rules', async (_req, res) => {
  const response = await executeBridgeCommand('kbx rules list --json', ['rules', 'list', '--json'], {
    expectJson: true,
    timeoutMs: 15000,
  });
  res.status(response.ok ? 200 : 500).json(response);
});

app.get('/api/intents', async (_req, res) => {
  const response = await executeBridgeCommand('kbx intent list --all --json', ['intent', 'list', '--all', '--json'], {
    expectJson: true,
    timeoutMs: 20000,
  });
  res.status(response.ok ? 200 : 500).json(response);
});

app.get('/api/phase2-bridge', async (_req, res) => {
  const [statusResult, doctorResult, chaosResult] = await Promise.all([
    executeBridgeCommand('kbx status --json', ['status', '--json'], {
      expectJson: true,
      timeoutMs: 20000,
    }),
    executeBridgeCommand('kbx doctor --json', ['doctor', '--json'], {
      expectJson: true,
      timeoutMs: 15000,
    }),
    executeBridgeCommand('kbx chaos --estimate', ['chaos', '--estimate'], {
      timeoutMs: 15000,
    }),
  ]);

  const { gateItems, summary } = evaluatePhase2Gates({
    statusResult,
    doctorResult,
    chaosResult,
  });

  const payload = {
    phase: 'phase-2-cli-bridge',
    checkedAt: new Date().toISOString(),
    summary,
    gates: gateItems,
    commands: {
      status: statusResult,
      doctor: doctorResult,
      chaos: chaosResult,
    },
  };

  res.status(summary.blocked ? 500 : 200).json(payload);
});