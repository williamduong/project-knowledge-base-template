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

const phase2GatePolicy = [
  {
    gate: 'G-DETERMINISTIC-PLACEMENT',
    severity: 'hard-fail',
    command: 'kbx status --json',
    evaluate: ({ statusResult }) => {
      if (!statusResult.ok) {
        return {
          ok: false,
          detail: 'status command failed, deterministic runtime cannot be trusted',
        };
      }

      return {
        ok: true,
        detail: 'status command completed with deterministic exit code',
      };
    },
  },
  {
    gate: 'G-EVIDENCE-SUFFICIENCY',
    severity: 'hard-fail',
    command: 'kbx doctor --json',
    evaluate: ({ doctorResult }) => {
      if (!doctorResult.ok) {
        return {
          ok: false,
          detail: 'doctor command failed, cannot verify workspace evidence',
        };
      }

      if (!doctorResult.parsed || !Array.isArray(doctorResult.parsed.checks)) {
        return {
          ok: false,
          detail: 'doctor output is not parseable JSON with checks[] evidence',
        };
      }

      return {
        ok: true,
        detail: `doctor returned ${doctorResult.parsed.checks.length} checks`,
      };
    },
  },
  {
    gate: 'G-INTENT-UNIQUENESS',
    severity: 'hard-fail',
    command: 'kbx status --json',
    evaluate: ({ statusResult }) => {
      const activeCount = statusResult.parsed?.activeIntents?.count;
      if (typeof activeCount !== 'number') {
        return {
          ok: false,
          detail: 'active intent count missing from status payload',
        };
      }

      if (activeCount > 1) {
        return {
          ok: false,
          detail: `expected <= 1 active intent, observed ${activeCount}`,
        };
      }

      return {
        ok: true,
        detail: `active intent policy satisfied (${activeCount})`,
      };
    },
  },
  {
    gate: 'G-CHAOS-ESTIMATE',
    severity: 'warn',
    command: 'kbx chaos --estimate',
    evaluate: ({ chaosResult }) => {
      if (!chaosResult.ok) {
        return {
          ok: false,
          detail: 'chaos estimate command failed',
        };
      }

      const summary = chaosResult.stdout || chaosResult.stderr;
      if (/UNSTABLE|RISK|WARNING/i.test(summary)) {
        return {
          ok: false,
          detail: 'chaos estimate reports elevated risk signals',
        };
      }

      return {
        ok: true,
        detail: 'chaos estimate does not show unstable markers',
      };
    },
  },
  {
    gate: 'G-THREE-LAYER-TRACE',
    severity: 'info',
    command: 'kbx status --json + kbx doctor --json + kbx chaos --estimate',
    evaluate: ({ statusResult, doctorResult, chaosResult }) => {
      const ok = statusResult.ok && doctorResult.ok && chaosResult.ok;
      return {
        ok,
        detail: ok
          ? 'intake/runtime/completion evidence captured in one bridge response'
          : 'one or more trace commands failed',
      };
    },
  },
];

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

function summarizeGateResults(items) {
  const summary = {
    pass: 0,
    warn: 0,
    fail: 0,
    blocked: false,
  };

  for (const item of items) {
    if (item.ok) {
      summary.pass += 1;
      continue;
    }

    if (item.severity === 'hard-fail') {
      summary.fail += 1;
      summary.blocked = true;
      continue;
    }

    summary.warn += 1;
  }

  return summary;
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

  const gateItems = phase2GatePolicy.map((policy) => {
    const evaluation = policy.evaluate({ statusResult, doctorResult, chaosResult });
    return {
      gate: policy.gate,
      severity: policy.severity,
      command: policy.command,
      ok: evaluation.ok,
      detail: evaluation.detail,
    };
  });

  const summary = summarizeGateResults(gateItems);

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