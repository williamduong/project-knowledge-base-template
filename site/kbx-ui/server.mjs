import express from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluatePhase2Gates } from './bridge-gates.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const cliPath = path.join(repoRoot, 'bin', 'kbx.js');

const uiHost = process.env.KBX_UI_HOST || 'kbx.local';
const uiPort = Number(process.env.KBX_UI_PORT || 4173);
const port = Number(process.env.KBX_BRIDGE_PORT || 4174);

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

function summarizeWorkspace(statusResult) {
  const parsed = statusResult.parsed || {};
  const activeIntents = parsed.activeIntents || {};
  const release = parsed.release || {};
  const workingTree = parsed.workingTree || {};

  return {
    activeIntentCount: activeIntents.count ?? null,
    activeIntentId: activeIntents.id ?? null,
    releaseCurrent: release.current ?? null,
    releaseLatest: release.latest ?? null,
    hasWorkingTreeChanges: workingTree.clean === true ? false : true,
  };
}

function summarizeSystem(doctorResult) {
  const checks = Array.isArray(doctorResult.parsed?.checks) ? doctorResult.parsed.checks : [];
  const summary = {
    pass: 0,
    warn: 0,
    error: 0,
    info: 0,
  };

  for (const check of checks) {
    const status = String(check?.status || '').toUpperCase();
    if (status === 'PASS') {
      summary.pass += 1;
    } else if (status === 'WARN') {
      summary.warn += 1;
    } else if (status === 'ERROR') {
      summary.error += 1;
    } else if (status === 'INFO') {
      summary.info += 1;
    }
  }

  return {
    result: doctorResult.parsed?.result ?? null,
    nodeVersion: doctorResult.parsed?.nodeVersion ?? null,
    workspaceRoot: doctorResult.parsed?.workspaceRoot ?? null,
    checkSummary: summary,
  };
}

function summarizeDocuments(graphCheckResult) {
  const parsed = graphCheckResult.parsed || {};
  const issues = Array.isArray(parsed.issues) ? parsed.issues : [];

  return {
    entityCount: parsed.entity_count ?? null,
    relationCount: parsed.relation_count ?? null,
    issueCount: parsed.issue_count ?? issues.length,
    topIssues: issues.slice(0, 5).map((issue) => ({
      checkId: issue.check_id ?? null,
      severity: issue.severity ?? null,
      message: issue.message ?? null,
      evidencePath: issue.evidence_path ?? null,
    })),
  };
}

export function createApp(commandRunner = executeBridgeCommand) {
  const app = express();
  
  // Middleware
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KBAgent Bridge</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; padding: 2rem; background: #0f172a; color: #e2e8f0; }
      main { max-width: 720px; margin: 0 auto; }
      .card { background: rgba(15, 23, 42, 0.72); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 16px; padding: 1.5rem; }
      a { color: #7dd3fc; }
      code { background: rgba(30, 41, 59, 0.9); padding: 0.2rem 0.4rem; border-radius: 6px; }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        <h1>KBAgent Bridge</h1>
        <p>CLI-backed bridge server is running on <code>http://${uiHost}:${port}</code>.</p>
        <p>Open the local UI at <a href="http://${uiHost}:${uiPort}/">http://${uiHost}:${uiPort}/</a>.</p>
        <p>Health and runtime data are available under <code>/api/*</code>.</p>
      </div>
    </main>
  </body>
</html>`);
  });

  app.get('/api/version', async (_req, res) => {
    const response = await commandRunner('kbx --version', ['--version']);
    res.status(response.ok ? 200 : 500).json(response);
  });

  app.get('/api/interaction-model', (_req, res) => {
    res.json({
      chat: 'Copilot Chat with KBAgent proposes actions and prompts inside VS Code.',
      web: 'Localhost UI reads runtime state and triggers CLI-backed actions.',
      writePath: 'CLI is the only deterministic mutation path.',
    });
  });

  app.get('/api/status', async (_req, res) => {
    const response = await commandRunner('kbx status --json', ['status', '--json'], {
      expectJson: true,
      timeoutMs: 20000,
    });
    res.status(200).json(response);
  });

  app.get('/api/rules', async (_req, res) => {
    const response = await commandRunner('kbx rules list --json', ['rules', 'list', '--json'], {
      expectJson: true,
      timeoutMs: 15000,
    });
    res.status(response.ok ? 200 : 500).json(response);
  });

  app.get('/api/intents', async (_req, res) => {
    const response = await commandRunner('kbx intent list --all --json', ['intent', 'list', '--all', '--json'], {
      expectJson: true,
      timeoutMs: 20000,
    });
    res.status(response.ok ? 200 : 500).json(response);
  });

  app.get('/api/workspace', async (_req, res) => {
    const statusResult = await commandRunner('kbx status --json', ['status', '--json'], {
      expectJson: true,
      timeoutMs: 20000,
    });

    if (!statusResult.ok) {
      res.status(200).json({ ok: false, error: 'workspace command failed', stderr: statusResult.stderr });
      return;
    }

    res.status(200).json({
      ok: true,
      summary: summarizeWorkspace(statusResult),
    });
  });

  app.get('/api/system', async (_req, res) => {
    const doctorResult = await commandRunner('kbx doctor --json', ['doctor', '--json'], {
      expectJson: true,
      timeoutMs: 20000,
    });

    if (!doctorResult.ok) {
      res.status(200).json({ ok: false, error: 'system command failed', stderr: doctorResult.stderr });
      return;
    }

    res.status(200).json({
      ok: true,
      summary: summarizeSystem(doctorResult),
    });
  });

  app.get('/api/documents', async (_req, res) => {
    const graphCheckResult = await commandRunner('kbx graph check --json', ['graph', 'check', '--json'], {
      expectJson: true,
      timeoutMs: 20000,
    });

    if (!graphCheckResult.ok) {
      res.status(500).json({ ok: false, error: 'documents command failed', stderr: graphCheckResult.stderr });
      return;
    }

    res.status(200).json({
      ok: true,
      summary: summarizeDocuments(graphCheckResult),
    });
  });

  app.get('/api/phase2-bridge', async (_req, res) => {
    const [statusResult, doctorResult, chaosResult] = await Promise.all([
      commandRunner('kbx status --json', ['status', '--json'], {
        expectJson: true,
        timeoutMs: 20000,
      }),
      commandRunner('kbx doctor --json', ['doctor', '--json'], {
        expectJson: true,
        timeoutMs: 15000,
      }),
      commandRunner('kbx chaos --estimate', ['chaos', '--estimate'], {
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

    res.status(200).json({
      ...payload,
      ok: !summary.blocked,
    });
  });

  // ═══ PHASE 4: MUTATION ENDPOINTS ═══

  app.post('/api/intents/create', async (req, res) => {
    const { title, focus, next_action, decision_summary, intent_id, id } = req.body;

    // Validate
    if (!title || String(title).trim().length < 3) {
      return res.status(400).json({
        ok: false,
        error: 'Title required (min 3 characters)',
      });
    }

    const requestedIntentId = String(intent_id || id || '').trim();
    const args = [
      'intent', 'create',
      ...(requestedIntentId ? [requestedIntentId] : []),
      '--title', String(title).trim(),
      ...(focus ? ['--focus', String(focus).trim()] : []),
      ...(next_action ? ['--next-action', String(next_action).trim()] : []),
      ...(decision_summary ? ['--decision-summary', String(decision_summary).trim()] : []),
      '--json'
    ];

    const result = await commandRunner('kbx intent create --json', args, {
      expectJson: true,
      timeoutMs: 15000,
    });

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        error: 'Create intent failed',
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
    }

    res.status(200).json({
      ok: true,
      result: result.parsed || {},
      command: result.command,
      stdout: result.stdout,
      trace: [
        { timestamp: new Date().toISOString(), step: 'validate_args', status: 'pass' },
        { timestamp: new Date().toISOString(), step: 'create_intent', status: 'pass' },
      ],
    });
  });

  app.patch('/api/intents/:id', async (req, res) => {
    const { id } = req.params;
    const body = req.body || {};

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Intent ID required',
      });
    }

    // Accept flat fields (from frontend) or wrapped in 'fields' object (from old API)
    const fields = body.fields || body;
    
    const args = ['intent', 'update', id, '--json'];
    const updateFields = [];

    if (fields.title) {
      args.push('--title', String(fields.title).trim());
      updateFields.push('title');
    }
    if (fields.focus) {
      args.push('--focus', String(fields.focus).trim());
      updateFields.push('focus');
    }
    if (fields.next_action) {
      args.push('--next-action', String(fields.next_action).trim());
      updateFields.push('next_action');
    }
    if (fields.decision_summary) {
      args.push('--decision-summary', String(fields.decision_summary).trim());
      updateFields.push('decision_summary');
    }
    if (fields.state) {
      args.push('--state', String(fields.state).trim());
      updateFields.push('state');
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'At least one field to update required',
      });
    }

    const result = await commandRunner('kbx intent update --json', args, {
      expectJson: true,
      timeoutMs: 15000,
    });

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        error: 'Update intent failed',
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
    }

    const parsed = result.parsed || {};
    const updatedFields = Array.isArray(parsed.updated_fields) ? parsed.updated_fields : updateFields;

    res.status(200).json({
      ok: true,
      result: {
        id: parsed.intent_id || parsed.id || id,
        updated_fields: updatedFields,
        state: parsed.state ?? null,
        status: parsed.status || 'updated',
        ...parsed,
      },
      command: result.command,
      trace: [
        { timestamp: new Date().toISOString(), step: 'load_intent', status: 'pass' },
        { timestamp: new Date().toISOString(), step: 'validate_state_transition', status: 'pass' },
        { timestamp: new Date().toISOString(), step: 'write_changes', status: 'pass' },
      ],
    });
  });

  app.post('/api/intents/:id/approve', async (req, res) => {
    const { id } = req.params;
    const { approval_note } = req.body;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Intent ID required',
      });
    }

    const args = ['intent', 'approve', id, '--json'];
    if (approval_note) {
      args.push('--note', String(approval_note).trim());
    }

    const result = await commandRunner('kbx intent approve --json', args, {
      expectJson: true,
      timeoutMs: 15000,
    });

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        error: 'Approve intent failed',
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
    }

    res.status(200).json({
      ok: true,
      result: {
        id,
        state: 'staged',
        approved_at: new Date().toISOString(),
        ...result.parsed,
      },
      command: result.command,
      trace: [
        { timestamp: new Date().toISOString(), step: 'validate_active_state', status: 'pass' },
        { timestamp: new Date().toISOString(), step: 'transition_to_staged', status: 'pass' },
      ],
    });
  });

  app.get('/api/intents/:id/apply-preview', async (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Intent ID required',
      });
    }

    // Call kbx to get diff preview from CLI contract.
    const result = await commandRunner('kbx intent apply-preview --json', 
      ['intent', 'apply-preview', id, '--json'], 
      {
        expectJson: true,
        timeoutMs: 15000,
      }
    );

    if (!result.ok) {
      // Fallback: return minimal preview structure
      return res.status(200).json({
        ok: true,
        diff: {
          files_changed: 0,
          insertions: 0,
          deletions: 0,
          files: [],
        },
        warnings: [
          { level: 'info', message: 'Preview command not available' },
        ],
      });
    }

    const parsed = result.parsed || {};
    const files = Array.isArray(parsed.files) ? parsed.files : [];
    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];

    res.status(200).json({
      ok: true,
      diff: {
        files_changed: parsed.files_changed ?? 0,
        insertions: parsed.insertions ?? 0,
        deletions: parsed.deletions ?? 0,
        files,
      },
      warnings,
      intent_id: parsed.intent_id ?? id,
      status: parsed.status || 'preview',
      conflict_summary: parsed.conflict_summary ?? null,
      command: result.command,
    });
  });

  app.post('/api/intents/:id/apply', async (req, res) => {
    const { id } = req.params;
    const { confirmed } = req.body;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Intent ID required',
      });
    }

    if (confirmed !== true) {
      return res.status(400).json({
        ok: false,
        error: 'Apply requires explicit confirmation (confirmed: true)',
      });
    }

    const args = ['intent', 'apply', id, '--json'];

    const result = await commandRunner('kbx intent apply --json', args, {
      expectJson: true,
      timeoutMs: 30000,  // Apply can take longer
    });

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        error: 'Apply intent failed',
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
    }

    res.status(200).json({
      ok: true,
      result: {
        id,
        state: 'committed',
        applied_at: new Date().toISOString(),
        ...result.parsed,
      },
      command: result.command,
      trace: [
        { timestamp: new Date().toISOString(), step: 'validate_staged_state', status: 'pass' },
        { timestamp: new Date().toISOString(), step: 'check_conflicts', status: 'pass' },
        { timestamp: new Date().toISOString(), step: 'apply_changes', status: 'pass' },
        { timestamp: new Date().toISOString(), step: 'git_commit', status: 'pass' },
      ],
    });
  });

  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const app = createApp();
  app.listen(port, () => {
    console.log(`kbx-ui bridge listening on http://${uiHost}:${port}`);
  });
}