import express from 'express';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluatePhase2Gates } from './bridge-gates.mjs';
import { createRuntimeServicesCron } from './runtime-services-cron.mjs';
import { createSystemSnapshotStore } from './system-snapshot-store.mjs';
import { createGraphApiRouter } from './api-graph.mjs';
import {
  DEFAULT_CANDIDATE_ROOTS as KB_CANDIDATE_ROOTS,
  parseDocFromDisk as kbParseDocFromDisk,
  parseDocFromText as kbParseDocFromText,
  walkRoot as kbWalkRoot,
  validateCandidateRoot as kbValidateCandidateRoot,
  computeFileHash as kbComputeFileHash,
  ALLOWED_EXT as KB_ALLOWED_EXT,
  SKIP_DIRS as KB_SKIP_DIRS,
} from '../../src/lib/kb-content.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const kbRoot = path.join(repoRoot, 'knowledge-base');
const cliPath = path.join(repoRoot, 'bin', 'kbx.js');
const require = createRequire(import.meta.url);
const { resolveIntentRecord, updateIntentFields } = require(path.join(repoRoot, 'src', 'lib', 'intent.js'));
const { readFocusState, writeFocusState } = require(path.join(repoRoot, 'src', 'lib', 'focus-state.js'));
const { syncValidator } = require(path.join(repoRoot, 'src', 'lib', 'goals-sync-validator.js')); // Phase 6: Track B
const { metricsCollector } = require(path.join(repoRoot, 'src', 'lib', 'graph-query-metrics.js')); // Phase 6: Track B
const {
  readGoalsState,
  createGoal,
  updateGoal,
  deleteGoal,
  listGoalsForEntity,
} = require(path.join(repoRoot, 'src', 'lib', 'goals-state.js'));
const kbDb = require(path.join(repoRoot, 'src', 'lib', 'kb-db.js'));
const kbIndexDbPath = path.join(repoRoot, 'svfactory', 'kb-index.db');
const { runGitCommand } = require(path.join(repoRoot, 'src', 'lib', 'git.js'));
const { readPipeline } = require(path.join(repoRoot, 'src', 'lib', 'pipeline.js'));
const { run: runCli } = require(path.join(repoRoot, 'src', 'cli.js'));
const { listTools, summarizeTools } = require(path.join(repoRoot, 'src', 'lib', 'svfactory-tools', 'registry.js'));
const {
  buildOfficialBacklogStatus,
  runOfficialBacklogResetAndSeed,
} = require(path.join(repoRoot, 'src', 'lib', 'svfactory-official-backlog.js'));
const {
  buildIntentContextExplorer,
} = require(path.join(repoRoot, 'src', 'lib', 'intent-context-explorer.js'));
const {
  readAiSettings,
  updateAiSettings,
  pingAiSettings,
} = require(path.join(repoRoot, 'src', 'lib', 'ai-settings.js'));
const { connect: connectKnowledgeGraph } = require(path.join(repoRoot, 'src', 'graph-db', 'knowledge'));
const {
  buildIntentGraphProjection,
  synchronizeIntentContextGraph,
  fetchIntentContextFromGraph,
} = require(path.join(repoRoot, 'src', 'lib', 'intent-context-graph-layer.js'));

const uiHost = process.env.KBX_UI_HOST || 'kbx.local';
const uiPort = Number(process.env.KBX_UI_PORT || 4173);
const port = Number(process.env.KBX_BRIDGE_PORT || 4174);
const runtimeServicesRegistryPath = path.join(__dirname, 'runtime-services.json');
const runtimeServicesStatePath = path.join(__dirname, '.runtime-services-state.json');
const kbRootsStatePath = path.join(__dirname, '.runtime-state', 'kb-roots.json');
const ensureInFlight = new Map();
let inProcessCommandQueue = Promise.resolve();
const SYSTEM_SNAPSHOT_TTL_MS = 15000;
const INTENT_CONTEXT_SYNC_TTL_MS = 30000;
const CHILD_ENV_BLOCKLIST_KEYS = new Set([
  'ELECTRON_RUN_AS_NODE',
  'NODE_OPTIONS',
]);
const CHILD_ENV_BLOCKLIST_PREFIXES = [
  'VSCODE_',
];
let lastIntentContextProjectionFingerprint = null;
let lastIntentContextSyncAt = 0;

function buildChildProcessEnv(baseEnv = process.env) {
  const nextEnv = {};

  for (const [key, value] of Object.entries(baseEnv || {})) {
    if (CHILD_ENV_BLOCKLIST_KEYS.has(key)) {
      continue;
    }

    if (CHILD_ENV_BLOCKLIST_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      continue;
    }

    nextEnv[key] = value;
  }

  return nextEnv;
}

function runKbx(args, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: repoRoot,
      env: buildChildProcessEnv(process.env),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
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

function buildIntentContextProjectionFingerprint({ intents, goalsState, releaseLines }) {
  const intentParts = (intents || [])
    .map((intent) => [
      intent.id,
      intent.lifecycle,
      intent.taskCount ?? 0,
      intent.taskDoneCount ?? 0,
      intent.title ?? '',
    ].join(':'))
    .sort();
  const goalParts = (Array.isArray(goalsState?.goals) ? goalsState.goals : [])
    .map((goal) => [
      goal.id,
      goal.entity_level,
      goal.entity_id,
      goal.parent_goal_id ?? '',
      goal.state ?? '',
      goal.updated_at ?? '',
    ].join(':'))
    .sort();
  const releaseParts = (releaseLines || [])
    .map((releaseLine) => [
      releaseLine.id ?? '',
      releaseLine.label ?? '',
      Array.isArray(releaseLine.sources) ? releaseLine.sources.join(',') : '',
    ].join(':'))
    .sort();

  return JSON.stringify({
    intents: intentParts,
    goals: goalParts,
    releases: releaseParts,
  });
}

function enqueueInProcessCommand(task) {
  const next = inProcessCommandQueue.then(task, task);
  inProcessCommandQueue = next.catch(() => {});
  return next;
}

function supportsInProcessCommand(args = []) {
  const [command = 'help', subcommand = ''] = args;
  if (command === '--version' || command === '-v' || command === 'version') {
    return true;
  }

  if (command === 'status' || command === 'doctor' || command === 'chaos') {
    return true;
  }

  if (command === 'rules' && (subcommand === 'list' || subcommand === 'lint')) {
    return true;
  }

  return false;
}

async function runKbxInProcess(args, timeoutMs = 15000) {
  return enqueueInProcessCommand(async () => {
    const stdoutChunks = [];
    const stderrChunks = [];
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    const originalExit = process.exit;
    const originalExitCode = process.exitCode;
    const originalCwd = process.cwd();

    class ExitSignal extends Error {
      constructor(code) {
        super(`CLI exit ${code}`);
        this.code = code;
      }
    }

    let exitCode = 0;

    const captureChunk = (target, chunk, encoding) => {
      if (typeof chunk === 'string') {
        target.push(chunk);
        return true;
      }
      if (Buffer.isBuffer(chunk)) {
        target.push(chunk.toString(typeof encoding === 'string' ? encoding : 'utf8'));
        return true;
      }
      target.push(String(chunk));
      return true;
    };

    try {
      console.log = (...parts) => {
        stdoutChunks.push(`${parts.map((part) => String(part)).join(' ')}\n`);
      };
      console.error = (...parts) => {
        stderrChunks.push(`${parts.map((part) => String(part)).join(' ')}\n`);
      };
      console.warn = (...parts) => {
        stderrChunks.push(`${parts.map((part) => String(part)).join(' ')}\n`);
      };
      process.stdout.write = (chunk, encoding, callback) => {
        captureChunk(stdoutChunks, chunk, encoding);
        if (typeof encoding === 'function') {
          encoding();
        } else if (typeof callback === 'function') {
          callback();
        }
        return true;
      };
      process.stderr.write = (chunk, encoding, callback) => {
        captureChunk(stderrChunks, chunk, encoding);
        if (typeof encoding === 'function') {
          encoding();
        } else if (typeof callback === 'function') {
          callback();
        }
        return true;
      };
      process.exit = (code = 0) => {
        exitCode = Number.isFinite(Number(code)) ? Number(code) : 0;
        throw new ExitSignal(exitCode);
      };
      process.exitCode = 0;
      process.chdir(repoRoot);

      let timeoutHandle = null;
      await Promise.race([
        runCli(args),
        new Promise((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`kbx command timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        }),
      ]);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      exitCode = Number.isFinite(Number(process.exitCode)) ? Number(process.exitCode) : exitCode;
    } catch (error) {
      if (error instanceof ExitSignal) {
        exitCode = error.code;
      } else {
        exitCode = exitCode || Number(process.exitCode) || 1;
        stderrChunks.push(`${error instanceof Error ? error.message : String(error)}\n`);
      }
    } finally {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      process.stdout.write = originalStdoutWrite;
      process.stderr.write = originalStderrWrite;
      process.exit = originalExit;
      process.exitCode = originalExitCode;
      process.chdir(originalCwd);
    }

    return {
      code: exitCode || 0,
      stdout: stdoutChunks.join('').trim(),
      stderr: stderrChunks.join('').trim(),
    };
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

function readJsonFileSafe(filePath, fallbackValue) {
  try {
    if (!fs.existsSync(filePath)) {
      return fallbackValue;
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallbackValue;
  }
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function defaultRuntimeServices() {
  return [
    {
      id: 'bridge',
      label: 'KBX Bridge',
      kind: 'self',
      host: '127.0.0.1',
      preferredPort: port,
      healthPath: '/api/version',
    },
    {
      id: 'uiv2',
      label: 'UIV2 Dev Server',
      kind: 'vite-dev',
      host: '127.0.0.1',
      cwd: 'site/uiv2',
      preferredPort: 5173,
      portRange: [5173, 5174, 5175, 5176, 5177],
      healthPath: '/',
      healthMatch: '<div id="root"></div>',
      autoStart: false,
    },
    {
      id: 'legacy-ui',
      label: 'Legacy UI Dev Server',
      kind: 'vite-preview',
      host: '127.0.0.1',
      cwd: 'site/kbx-ui',
      preferredPort: 4173,
      portRange: [4173, 4175, 4176, 4177],
      healthPath: '/',
      healthMatch: '<div id="root"></div>',
      autoStart: true,
    },
  ];
}

function loadRuntimeServiceRegistry() {
  const parsed = readJsonFileSafe(runtimeServicesRegistryPath, null);
  return Array.isArray(parsed?.services) ? parsed.services : defaultRuntimeServices();
}

function readRuntimeServiceState() {
  const parsed = readJsonFileSafe(runtimeServicesStatePath, {});
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function writeRuntimeServiceState(state) {
  writeJsonFile(runtimeServicesStatePath, state);
}

function isPidRunning(pid) {
  if (!pid || typeof pid !== 'number') {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function checkTcpPort(host, targetPort, timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finalize = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finalize(true));
    socket.once('timeout', () => finalize(false));
    socket.once('error', () => finalize(false));
    socket.connect(targetPort, host);
  });
}

async function checkHttpHealth(service, targetPort) {
  const healthPath = service.healthPath || '/';
  const url = `http://${service.host || '127.0.0.1'}:${targetPort}${healthPath}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return false;
    }

    if (!service.healthMatch) {
      return true;
    }

    const body = await response.text();
    return body.includes(service.healthMatch);
  } catch {
    return false;
  }
}

async function probeServicePort(service, targetPort, stateEntry) {
  if (!targetPort) {
    return null;
  }

  if (!(await checkTcpPort(service.host || '127.0.0.1', targetPort))) {
    return null;
  }

  const healthy = await checkHttpHealth(service, targetPort);
  if (!healthy && service.kind !== 'self') {
    return null;
  }

  return {
    port: targetPort,
    pid: stateEntry?.pid ?? null,
    running: true,
    reachable: true,
    healthy,
  };
}

async function resolveRuntimeServiceStatus(service, stateEntry = {}) {
  if (service.kind === 'self') {
    return {
      id: service.id,
      label: service.label,
      kind: service.kind,
      running: true,
      healthy: true,
      pid: process.pid,
      host: service.host || '127.0.0.1',
      port: service.preferredPort,
      source: 'self',
      autoStart: false,
      healthPath: service.healthPath || '/',
    };
  }

  const candidatePorts = Array.from(new Set([
    stateEntry.port,
    service.preferredPort,
    ...(Array.isArray(service.portRange) ? service.portRange : []),
  ].filter(Boolean)));

  for (const candidatePort of candidatePorts) {
    const result = await probeServicePort(service, candidatePort, stateEntry);
    if (result) {
      return {
        id: service.id,
        label: service.label,
        kind: service.kind,
        running: true,
        healthy: result.healthy,
        pid: isPidRunning(stateEntry?.pid) ? stateEntry.pid : null,
        host: service.host || '127.0.0.1',
        port: result.port,
        source: candidatePort === stateEntry?.port ? 'state' : candidatePort === service.preferredPort ? 'preferred-port' : 'port-scan',
        autoStart: service.autoStart === true,
        healthPath: service.healthPath || '/',
      };
    }
  }

  return {
    id: service.id,
    label: service.label,
    kind: service.kind,
    running: false,
    healthy: false,
    pid: isPidRunning(stateEntry?.pid) ? stateEntry.pid : null,
    host: service.host || '127.0.0.1',
    port: stateEntry.port ?? service.preferredPort ?? null,
    source: stateEntry.port ? 'state' : 'registry',
    autoStart: service.autoStart === true,
    healthPath: service.healthPath || '/',
  };
}

async function collectRuntimeServiceStatuses() {
  const registry = loadRuntimeServiceRegistry();
  const state = readRuntimeServiceState();
  const services = [];

  for (const service of registry) {
    const resolved = await resolveRuntimeServiceStatus(service, state[service.id]);
    services.push(resolved);
  }

  const nextState = { ...state };
  for (const service of services) {
    nextState[service.id] = {
      pid: service.pid,
      port: service.port,
      running: service.running,
      updatedAt: new Date().toISOString(),
    };
  }
  writeRuntimeServiceState(nextState);

  return services;
}

function summarizeRuntimeServices(services) {
  const registeredCount = services.length;
  const runningCount = services.filter((service) => service.running).length;
  const healthyCount = services.filter((service) => service.healthy).length;

  return {
    registeredCount,
    runningCount,
    healthyCount,
    summaryLabel: `${runningCount}/${registeredCount} services`,
    services,
  };
}

function resolveLocalViteBin(serviceCwd) {
  const viteBinPath = path.join(repoRoot, serviceCwd, 'node_modules', 'vite', 'bin', 'vite.js');
  return fs.existsSync(viteBinPath) ? viteBinPath : null;
}

function runtimeBridgeStatus(summary) {
  if (!summary || summary.registeredCount === 0) {
    return 'offline';
  }

  if (summary.runningCount === summary.registeredCount) {
    return 'live';
  }

  if (summary.runningCount > 0) {
    return 'degraded';
  }

  return 'offline';
}

const runtimeServicesCron = createRuntimeServicesCron({
  intervalMs: 60_000,
  collectStatuses: collectRuntimeServiceStatuses,
  summarizeStatuses: summarizeRuntimeServices,
  ensureService: ensureRuntimeService,
});

function resolveManagedSpawn(service, targetPort) {
  const localViteBin = resolveLocalViteBin(service.cwd);

  if (service.kind === 'vite-dev') {
    if (localViteBin) {
      return {
        command: process.execPath,
        args: [localViteBin, '--host', service.host || '127.0.0.1', '--port', String(targetPort)],
        cwd: path.join(repoRoot, service.cwd),
      };
    }

    return {
      command: 'npx',
      args: ['vite', '--host', service.host || '127.0.0.1', '--port', String(targetPort)],
      cwd: path.join(repoRoot, service.cwd),
    };
  }

  if (service.kind === 'vite-preview') {
    if (localViteBin) {
      return {
        command: process.execPath,
        args: [localViteBin, 'preview', '--host', service.host || '127.0.0.1', '--port', String(targetPort)],
        cwd: path.join(repoRoot, service.cwd),
      };
    }

    return {
      command: 'npx',
      args: ['vite', 'preview', '--host', service.host || '127.0.0.1', '--port', String(targetPort)],
      cwd: path.join(repoRoot, service.cwd),
    };
  }

  throw new Error(`Unsupported managed service kind: ${service.kind}`);
}

async function ensureRuntimeService(serviceId) {
  if (ensureInFlight.has(serviceId)) {
    return ensureInFlight.get(serviceId);
  }

  const ensurePromise = (async () => {
  try {
    const registry = loadRuntimeServiceRegistry();
    const service = registry.find((item) => item.id === serviceId);
    if (!service) {
      return { ok: false, error: `Unknown runtime service: ${serviceId}` };
    }

    const state = readRuntimeServiceState();
    const existing = await resolveRuntimeServiceStatus(service, state[service.id]);
    if (existing.running) {
      return { ok: true, action: 'already-running', service: existing };
    }

    if (service.kind === 'self') {
      return { ok: true, action: 'self', service: existing };
    }

    const portCandidates = Array.from(new Set([
      service.preferredPort,
      ...(Array.isArray(service.portRange) ? service.portRange : []),
    ].filter(Boolean)));
    let selectedPort = null;

    for (const candidatePort of portCandidates) {
      // eslint-disable-next-line no-await-in-loop
      const occupied = await checkTcpPort(service.host || '127.0.0.1', candidatePort);
      if (!occupied) {
        selectedPort = candidatePort;
        break;
      }
    }

    if (!selectedPort) {
      return { ok: false, error: `No free port available for service ${service.id}` };
    }

    const spawnConfig = resolveManagedSpawn(service, selectedPort);
    const child = spawn(spawnConfig.command, spawnConfig.args, {
      cwd: spawnConfig.cwd,
      detached: true,
      stdio: 'ignore',
      env: buildChildProcessEnv(process.env),
      windowsHide: true,
    });
    child.unref();

    const nextState = { ...state };
    nextState[service.id] = {
      pid: child.pid ?? null,
      port: selectedPort,
      running: false,
      updatedAt: new Date().toISOString(),
    };
    writeRuntimeServiceState(nextState);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 250));
      // eslint-disable-next-line no-await-in-loop
      const resolved = await resolveRuntimeServiceStatus(service, nextState[service.id]);
      if (resolved.running) {
        nextState[service.id] = {
          pid: child.pid ?? null,
          port: resolved.port,
          running: true,
          updatedAt: new Date().toISOString(),
        };
        writeRuntimeServiceState(nextState);
        return { ok: true, action: 'started', service: resolved };
      }
    }

    return {
      ok: false,
      error: `Service ${service.id} did not become healthy after start`,
      service: {
        id: service.id,
        label: service.label,
        port: selectedPort,
        pid: child.pid ?? null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  })();

  ensureInFlight.set(serviceId, ensurePromise);
  try {
    return await ensurePromise;
  } finally {
    ensureInFlight.delete(serviceId);
  }
}

async function executeBridgeCommand(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const expectJson = options.expectJson ?? false;

  try {
    const result = supportsInProcessCommand(args)
      ? await runKbxInProcess(args, timeoutMs)
      : await runKbx(args, timeoutMs);
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
  const activeIntentItems = Array.isArray(activeIntents.intents) ? activeIntents.intents : [];
  const activeIntentId = activeIntents.id ?? activeIntentItems[0]?.id ?? null;

  return {
    activeIntentCount: activeIntents.count ?? null,
    activeIntentId,
    releaseCurrent: release.current ?? null,
    releaseLatest: release.latest ?? null,
    hasWorkingTreeChanges: workingTree.clean === true ? false : true,
    driftStatus: parsed.state?.driftStatus ?? null,
  };
}

function readCurrentBranchName() {
  const branch = runGitCommand(['git', 'branch', '--show-current'], repoRoot);
  return branch || null;
}

function normalizeIntentId(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.startsWith('intent-') ? normalized.slice('intent-'.length) : normalized;
}

function intentIdFromBranchName(branchName) {
  const branch = String(branchName || '').trim();
  if (!branch) {
    return null;
  }

  const directIntentMatch = branch.match(/^intent\/(.+)$/i);
  if (directIntentMatch?.[1]) {
    return normalizeIntentId(directIntentMatch[1]);
  }

  return null;
}

function sanitizeDraftSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function normalizeLifecycle(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'unknown';
  if (text === 'active') return 'active';
  if (text === 'backlog' || text === 'open') return 'backlog';
  if (text === 'closed' || text === 'released') return 'closed';
  if (text === 'archive' || text === 'archived') return 'archived';
  if (text === 'draft') return 'draft';
  if (text === 'dropped' || text === 'cancelled' || text === 'canceled') return 'dropped';
  if (text === 'done') return 'done';
  return text.replace(/\s+/g, '-');
}

function sanitizeGoalKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function deriveVersionBucket(intentId) {
  const match = String(intentId || '').match(/^(v\d+(?:-\d+)?)/i);
  return match?.[1]?.toLowerCase() ?? 'legacy';
}

function versionRank(versionId) {
  const numbers = String(versionId || '')
    .replace(/^v/i, '')
    .split('-')
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
  return numbers.reduce((accumulator, value, index) => accumulator + value / 10 ** (index * 2), 0);
}

function buildTaskGoalOwnerId(intentId, task, index) {
  const titlePart = sanitizeGoalKey(task?.title || task?.text || `task-${index + 1}`) || `task-${index + 1}`;
  const sourcePart = sanitizeGoalKey(task?.source || 'intent');
  return `${intentId}::${sourcePart}::${String(index + 1).padStart(3, '0')}::${titlePart}`;
}

function cloneGoalRecord(goal, childCount = 0) {
  return {
    id: goal.id,
    entityLevel: goal.entity_level,
    entityId: goal.entity_id,
    parentGoalId: goal.parent_goal_id ?? null,
    title: goal.title,
    description: goal.description || '',
    state: goal.state || 'active',
    rank: goal.rank ?? 0,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at,
    childGoalCount: childCount,
    canDelete: childCount === 0,
  };
}

function expectedParentLevel(entityLevel) {
  if (entityLevel === 'milestone') return 'system';
  if (entityLevel === 'intent') return 'milestone';
  if (entityLevel === 'task') return 'intent';
  return null;
}

function classifyGoalCoverage(entityLevel, goals) {
  if (!Array.isArray(goals) || goals.length === 0) {
    return {
      code: 'missing-goals',
      label: entityLevel === 'system' ? 'missing system goals' : 'missing goals',
    };
  }

  if (entityLevel === 'system') {
    return {
      code: 'aligned',
      label: `${goals.length} system goal${goals.length === 1 ? '' : 's'}`,
    };
  }

  const linkedCount = goals.filter((goal) => goal.parent_goal_id).length;
  if (linkedCount === 0) {
    return {
      code: 'outside-main',
      label: 'outside main goals',
    };
  }

  if (linkedCount < goals.length) {
    return {
      code: 'mixed',
      label: 'partially linked',
    };
  }

  return {
    code: 'aligned',
    label: 'aligned',
  };
}

function countDescendantGoals(goalsState) {
  const map = new Map();
  const goals = Array.isArray(goalsState?.goals) ? goalsState.goals : [];
  for (const goal of goals) {
    const parentId = goal?.parent_goal_id ? String(goal.parent_goal_id) : null;
    if (!parentId) continue;
    map.set(parentId, (map.get(parentId) ?? 0) + 1);
  }
  return map;
}

function preferredGoalTextForEntity(goalsState, entityLevel, entityId) {
  const goals = listGoalsForEntity(goalsState, entityLevel, entityId);
  if (!goals.length) {
    return null;
  }
  return goals
    .map((goal) => String(goal.title || '').trim())
    .filter(Boolean)
    .join(' • ') || null;
}

function syncLegacyIntentGoalText(intentId, goalsState) {
  if (!intentId) {
    return null;
  }

  const titles = listGoalsForEntity(goalsState, 'intent', intentId)
    .map((goal) => String(goal.title || '').trim())
    .filter(Boolean);

  return updateIntentFields(kbRoot, intentId, {
    goalText: titles.join(' • '),
  });
}

function extractIntentNarrative(text) {
  if (!text) {
    return { goal: null, summary: null };
  }

  const sections = String(text).split(/^---\s*$/m);
  const body = sections.length >= 3 ? sections.slice(2).join('---').trim() : String(text).trim();
  const goalMatch = body.match(/^(?:\*\*Goal:\*\*|Goal:)\s*(.+)$/im);
  const summaryMatch = body.match(/^## Summary\s+([\s\S]*?)(?:\n## |$)/m);
  const goalSectionMatch = body.match(/^## Goal\s+([\s\S]*?)(?:\n## |$)/m);
  const goalSection = goalSectionMatch?.[1]
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('```'))
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' • ');

  return {
    goal: goalMatch?.[1]?.trim() ?? goalSection ?? null,
    summary: summaryMatch?.[1]?.replace(/^[>\s]+/gm, '').trim() || null,
  };
}

function extractIntentTasks(text, source) {
  if (!text) {
    return [];
  }

  const lines = String(text).split(/\r?\n/);
  const tasks = [];
  let currentSection = null;
  let inTaskSection = false;

  function isTaskLikeSection(sectionName) {
    return /plan|task|checklist|verification|implementation order|execution order/i.test(sectionName || '');
  }

  function isExcludedTaskSection(sectionName) {
    return /goal|acceptance criteria|stop when|files touched|intent split strategy|post-v/i.test(sectionName || '');
  }

  function parseTaskText(rawText, fallbackDone = false) {
    const text = String(rawText || '').trim();
    if (!text || /:\s*$/.test(text)) {
      return null;
    }
    const commitMatches = [...text.matchAll(/commit\s+([0-9a-f]{7,40})/gi)].map((match) => match[1]);
    const titleDescMatch = text.match(/^(?:\*\*)?(.+?)(?:\*\*)?\s+[—-]\s+(.+)$/);
    const title = (titleDescMatch?.[1] ?? text).trim();
    const description = titleDescMatch?.[2]?.trim() ?? null;
    const tags = [];

    if (/partial/i.test(text)) tags.push('partial');
    if (/major gap/i.test(text)) tags.push('major-gap');
    if (/engine exists/i.test(text)) tags.push('engine-exists');
    if (/planned/i.test(text)) tags.push('planned');
    if (/draft/i.test(text)) tags.push('draft');
    if (/reviewed/i.test(text)) tags.push('reviewed');

    const iconStatus = /✅/.test(text)
      ? 'done'
      : /❌/.test(text)
        ? 'blocked'
        : /⚠️|⚠/.test(text)
          ? 'warning'
          : fallbackDone
            ? 'done'
            : 'open';

    return {
      title,
      description,
      text,
      done: iconStatus === 'done',
      status: iconStatus,
      tags,
      explicitCommits: commitMatches,
    };
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const headingMatch = line.match(/^(#{2,4})\s+(.+)$/);
    if (headingMatch) {
      currentSection = headingMatch[2].trim();
      inTaskSection = isTaskLikeSection(currentSection) && !isExcludedTaskSection(currentSection);
      continue;
    }

    const checkboxMatch = line.match(/^[-*]\s+\[(x| )\]\s+(.+)$/i);
    if (checkboxMatch && inTaskSection) {
      const parsed = parseTaskText(checkboxMatch[2], checkboxMatch[1].toLowerCase() === 'x');
      if (!parsed) continue;
      tasks.push({
        ...parsed,
        section: currentSection,
        source,
      });
      continue;
    }

    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch && inTaskSection) {
      const parsed = parseTaskText(numberedMatch[1], false);
      if (!parsed) continue;
      tasks.push({
        ...parsed,
        section: currentSection,
        source,
      });
      continue;
    }

    if (!inTaskSection) {
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const parsed = parseTaskText(bulletMatch[1], false);
      if (!parsed) continue;
      tasks.push({
        ...parsed,
        section: currentSection,
        source,
      });
    }
  }

  return tasks;
}

function readFiniteNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function extractStagedFiles(text) {
  if (!text) {
    return [];
  }

  const lines = String(text).split(/\r?\n/);
  const stagedFiles = [];
  let inStagedFiles = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^##\s+Staged Files/i.test(line)) {
      inStagedFiles = true;
      continue;
    }
    if (inStagedFiles && /^##\s+/.test(line)) {
      break;
    }
    if (!inStagedFiles) {
      continue;
    }
    const fileMatch = line.match(/^[-*]\s+`?([^`]+?)`?$/);
    if (fileMatch && /\//.test(fileMatch[1])) {
      stagedFiles.push(fileMatch[1].trim());
    }
  }

  return stagedFiles;
}

function lookupRecentCommit(relativePath) {
  if (!relativePath) {
    return null;
  }

  const output = runGitCommand(['git', 'log', '-1', '--format=%h|%s', '--', relativePath], repoRoot);
  if (!output) {
    return null;
  }

  const [sha, subject] = output.trim().split('|');
  if (!sha) {
    return null;
  }

  return {
    sha: sha.trim(),
    subject: (subject || '').trim(),
    path: relativePath,
  };
}

function enrichTasksWithGit(tasks, candidatePaths) {
  const relatedCommits = candidatePaths
    .map((relativePath) => lookupRecentCommit(relativePath))
    .filter(Boolean)
    .filter((commit, index, commits) => commits.findIndex((item) => item.sha === commit.sha) === index)
    .slice(0, 3);

  return tasks.map((task) => ({
    ...task,
    relatedCommits: task.explicitCommits.length > 0
      ? task.explicitCommits.map((sha) => ({ sha, subject: 'Referenced in intent text', path: null }))
      : relatedCommits,
  }));
}

function summarizeIntentDetail(intentId, options = {}) {
  const includeGit = options.includeGit === true;
  const goalsState = options.goalsState ?? readGoalsState({ workspaceRoot: repoRoot });
  const record = resolveIntentRecord(kbRoot, intentId);
  if (!record) {
    return null;
  }

  const intentText = fs.existsSync(record.metaPath) ? fs.readFileSync(record.metaPath, 'utf8') : '';
  const narrative = extractIntentNarrative(intentText);
  const planPath = record.workspacePath ? path.join(record.workspacePath, 'plan.md') : null;
  const planText = planPath && fs.existsSync(planPath) ? fs.readFileSync(planPath, 'utf8') : '';
  const focus = record.meta?.focus && typeof record.meta.focus === 'object' ? record.meta.focus : {};
  const rawTasks = [
    ...extractIntentTasks(intentText, 'intent.md'),
    ...extractIntentTasks(planText, 'plan.md'),
  ];
  const stagedFiles = extractStagedFiles(intentText);
  const candidatePaths = [
    ...stagedFiles,
    path.relative(repoRoot, record.metaPath).replace(/\\/g, '/'),
  ].filter(Boolean);
  const tasks = includeGit ? enrichTasksWithGit(rawTasks, candidatePaths) : rawTasks.map((task) => ({
    ...task,
    relatedCommits: task.explicitCommits.length > 0
      ? task.explicitCommits.map((sha) => ({ sha, subject: 'Referenced in intent text', path: null }))
      : [],
  }));
  const chaosEstimate = record.meta?.chaos_estimate && typeof record.meta.chaos_estimate === 'object'
    ? {
        currentScore: readFiniteNumber(record.meta.chaos_estimate.current_score),
        currentLevel: record.meta.chaos_estimate.current_level ?? null,
        estimatedDelta: readFiniteNumber(record.meta.chaos_estimate.estimated_delta),
        projectedScore: readFiniteNumber(record.meta.chaos_estimate.projected_score),
        projectedLevel: record.meta.chaos_estimate.projected_level ?? null,
        warning: record.meta.chaos_estimate.warning ?? null,
      }
    : null;
  const registryGoalText = preferredGoalTextForEntity(goalsState, 'intent', record.id ?? intentId);

  return {
    id: record.id ?? intentId,
    title: record.meta?.title ?? null,
    slug: record.slug ?? null,
    scope: record.scope ?? null,
    lifecycle: record.meta?.lifecycle ?? record.lifecycle ?? null,
    status: record.meta?.status ?? null,
    mode: record.meta?.mode ?? null,
    changeType: record.meta?.change_type ?? null,
    goalText: registryGoalText ?? record.meta?.goal_text ?? null,
    decisionSummary: record.meta?.decision_summary ?? null,
    closeCondition: record.meta?.close_condition ?? null,
    goal: registryGoalText ?? record.meta?.goal_text ?? narrative.goal,
    summary: narrative.summary,
    focusCurrent: focus.current ?? null,
    focusNextAction: focus.next_action ?? null,
    focusUpdatedAt: focus.last_updated ?? null,
    chaosEstimate,
    tasks,
    stagedFiles,
    workspacePath: record.workspacePath ? path.relative(repoRoot, record.workspacePath).replace(/\\/g, '/') : null,
    sourceFile: record.metaPath ? path.relative(repoRoot, record.metaPath).replace(/\\/g, '/') : null,
  };
}

function summarizeIntentListSignals(intentId, goalsState = null) {
  const detail = summarizeIntentDetail(intentId, { includeGit: false, goalsState: goalsState ?? undefined });
  if (!detail) {
    return {
      taskCount: 0,
      taskDoneCount: 0,
      goal: null,
      goalText: null,
      focusCurrent: null,
      focusNextAction: null,
      chaosEstimate: null,
    };
  }

  const taskCount = Array.isArray(detail.tasks) ? detail.tasks.length : 0;
  const taskDoneCount = Array.isArray(detail.tasks)
    ? detail.tasks.filter((task) => task?.done || normalizeLifecycle(task?.status) === 'done').length
    : 0;

  return {
    taskCount,
    taskDoneCount,
    goal: detail.goal ?? null,
    goalText: detail.goalText ?? null,
    focusCurrent: detail.focusCurrent ?? null,
    focusNextAction: detail.focusNextAction ?? null,
    chaosEstimate: detail.chaosEstimate ?? null,
  };
}

function collectIntentsWithPriority() {
  const intentsRoot = path.join(kbRoot, 'intents');
  if (!fs.existsSync(intentsRoot)) {
    return { intents: [], ok: true };
  }

  const goalsState = readGoalsState({ workspaceRoot: repoRoot });
  const intents = [];
  const lifecycles = ['_active', '_backlog', '_archive', '_closed'];

  for (const lifecycle of lifecycles) {
    const lifecyclePath = path.join(intentsRoot, lifecycle);
    if (!fs.existsSync(lifecyclePath)) continue;

    const entries = fs.readdirSync(lifecyclePath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isFile()) continue;

      let contentPath;
      let id;

      if (entry.isDirectory()) {
        contentPath = path.join(lifecyclePath, entry.name, 'intent.md');
        id = entry.name;
      } else if (entry.name.endsWith('.md')) {
        contentPath = path.join(lifecyclePath, entry.name);
        id = entry.name.replace(/\.md$/, '');
      } else {
        continue;
      }

      if (!fs.existsSync(contentPath)) continue;

      try {
        const content = fs.readFileSync(contentPath, 'utf8');
        const sections = content.split(/^---\s*$/m);
        let frontmatter = {};

        if (sections.length >= 2) {
          const yamlText = sections[1];
          const lines = yamlText.split('\n');
          for (const line of lines) {
            const match = line.match(/^(\w+):\s*(.+)$/);
            if (match) {
              const [, key, value] = match;
              frontmatter[key] = value.trim();
            }
          }
        }

        intents.push({
          id: normalizeIntentId(frontmatter.id || id),
          title: frontmatter.title || id,
          lifecycle: lifecycle.replace(/^_/, ''),
          priority: frontmatter.priority || null,
          blocks: frontmatter.blocks || null,
          mode: frontmatter.mode || 'normal',
          strategic_mode: frontmatter.strategic_mode || null,
          ...summarizeIntentListSignals(normalizeIntentId(frontmatter.id || id), goalsState),
        });
      } catch (err) {
        console.error(`Error reading intent ${id}:`, err.message);
      }
    }
  }

  intents.sort((a, b) => {
    if ((a.priority ?? '') && !(b.priority ?? '')) return -1;
    if (!(a.priority ?? '') && (b.priority ?? '')) return 1;
    if ((a.priority ?? '') && (b.priority ?? '')) {
      return String(a.priority).localeCompare(String(b.priority), undefined, { numeric: true });
    }
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  return { intents, ok: true };
}

function buildGoalsTreeSnapshot() {
  const goalsState = readGoalsState({ workspaceRoot: repoRoot });
  const goalChildCounts = countDescendantGoals(goalsState);
  const intentsPayload = collectIntentsWithPriority();
  const intents = Array.isArray(intentsPayload?.intents) ? intentsPayload.intents : [];
  const milestoneBucketMap = new Map();

  for (const intent of intents) {
    const bucketId = deriveVersionBucket(intent.id);
    const current = milestoneBucketMap.get(bucketId) ?? [];
    current.push(intent);
    milestoneBucketMap.set(bucketId, current);
  }

  const rootGoals = listGoalsForEntity(goalsState, 'system', 'workspace')
    .map((goal) => cloneGoalRecord(goal, goalChildCounts.get(goal.id) ?? 0));

  const milestoneNodes = Array.from(milestoneBucketMap.entries())
    .sort((left, right) => versionRank(left[0]) - versionRank(right[0]))
    .map(([bucketId, bucketIntents]) => {
      const milestoneGoals = listGoalsForEntity(goalsState, 'milestone', bucketId)
        .map((goal) => cloneGoalRecord(goal, goalChildCounts.get(goal.id) ?? 0));
      const milestoneStatus = classifyGoalCoverage('milestone', milestoneGoals);

      const intentNodes = bucketIntents.map((intent) => {
        const detail = summarizeIntentDetail(intent.id, { includeGit: false, goalsState });
        const intentGoals = listGoalsForEntity(goalsState, 'intent', intent.id)
          .map((goal) => cloneGoalRecord(goal, goalChildCounts.get(goal.id) ?? 0));
        const intentStatus = classifyGoalCoverage('intent', intentGoals);
        const tasks = Array.isArray(detail?.tasks) ? detail.tasks : [];
        const taskNodes = tasks.map((task, index) => {
          const taskOwnerId = buildTaskGoalOwnerId(intent.id, task, index);
          const taskGoals = listGoalsForEntity(goalsState, 'task', taskOwnerId)
            .map((goal) => cloneGoalRecord(goal, goalChildCounts.get(goal.id) ?? 0));
          const taskStatus = classifyGoalCoverage('task', taskGoals);
          return {
            entityLevel: 'task',
            entityId: taskOwnerId,
            label: task.title || task.text || `Task ${index + 1}`,
            summary: task.description || task.section || null,
            runtimeState: task.status || 'open',
            status: taskStatus,
            goals: taskGoals,
            children: [],
          };
        });

        return {
          entityLevel: 'intent',
          entityId: intent.id,
          label: intent.title || intent.id,
          summary: detail?.focusCurrent || detail?.summary || null,
          runtimeState: intent.lifecycle || 'backlog',
          status: intentStatus,
          goals: intentGoals,
          children: taskNodes,
        };
      });

      return {
        entityLevel: 'milestone',
        entityId: bucketId,
        label: bucketId === 'legacy' ? 'Legacy' : bucketId.toUpperCase(),
        summary: `${bucketIntents.length} intents`,
        runtimeState: bucketIntents.some((intent) => normalizeLifecycle(intent.lifecycle) === 'active')
          ? 'active'
          : bucketIntents.some((intent) => normalizeLifecycle(intent.lifecycle) === 'backlog')
            ? 'backlog'
            : 'closed',
        status: milestoneStatus,
        goals: milestoneGoals,
        children: intentNodes,
      };
    });

  const rootStatus = classifyGoalCoverage('system', rootGoals);
  const flattenNodes = [
    { entityLevel: 'system', status: rootStatus },
    ...milestoneNodes,
    ...milestoneNodes.flatMap((milestone) => milestone.children),
    ...milestoneNodes.flatMap((milestone) => milestone.children.flatMap((intent) => intent.children)),
  ];

  const summary = {
    totalGoals: Array.isArray(goalsState.goals) ? goalsState.goals.length : 0,
    coverage: {
      system: flattenNodes.filter((node) => node.entityLevel === 'system' && node.status.code === 'aligned').length,
      milestones: flattenNodes.filter((node) => node.entityLevel === 'milestone' && node.status.code === 'aligned').length,
      intents: flattenNodes.filter((node) => node.entityLevel === 'intent' && node.status.code === 'aligned').length,
      tasks: flattenNodes.filter((node) => node.entityLevel === 'task' && node.status.code === 'aligned').length,
    },
    missingCounts: {
      milestones: flattenNodes.filter((node) => node.entityLevel === 'milestone' && node.status.code === 'missing-goals').length,
      intents: flattenNodes.filter((node) => node.entityLevel === 'intent' && node.status.code === 'missing-goals').length,
      tasks: flattenNodes.filter((node) => node.entityLevel === 'task' && node.status.code === 'missing-goals').length,
    },
    outsideCounts: {
      milestones: flattenNodes.filter((node) => node.entityLevel === 'milestone' && node.status.code === 'outside-main').length,
      intents: flattenNodes.filter((node) => node.entityLevel === 'intent' && node.status.code === 'outside-main').length,
      tasks: flattenNodes.filter((node) => node.entityLevel === 'task' && node.status.code === 'outside-main').length,
    },
    entityCounts: {
      milestones: milestoneNodes.length,
      intents: flattenNodes.filter((node) => node.entityLevel === 'intent').length,
      tasks: flattenNodes.filter((node) => node.entityLevel === 'task').length,
    },
  };

  return {
    ok: true,
    checkedAt: new Date().toISOString(),
    summary,
    root: {
      entityLevel: 'system',
      entityId: 'workspace',
      label: 'Workspace System',
      summary: 'Root OKR plane for the maintainer workspace',
      runtimeState: 'active',
      status: rootStatus,
      goals: rootGoals,
      children: milestoneNodes,
    },
  };
}

function summarizeSessionContext(statusResult) {
  const parsed = statusResult.parsed || {};
  const activeIntents = Array.isArray(parsed.activeIntents?.intents) ? parsed.activeIntents.intents : [];
  const activeIntentIds = activeIntents.map((intent) => normalizeIntentId(intent?.id)).filter(Boolean);
  const focusState = readFocusState({ workspaceRoot: repoRoot, branchName: null });
  const branchName = focusState.current_focus?.branch ?? focusState.checkpoint?.branch ?? null;
  const branchIntentId = intentIdFromBranchName(branchName);
  const focusFile = focusState.source_files?.state ?? focusState.source_files?.markdown ?? null;
  const checkpointIntentId = normalizeIntentId(focusState.checkpoint?.intent_id ?? null);
  const stateFocusIntentId = normalizeIntentId(focusState.current_focus?.intent_id ?? null);
  const singleActiveIntentId = activeIntentIds.length === 1
    ? activeIntentIds[0]
    : normalizeIntentId(parsed.activeIntents?.id ?? null);

  const sessionIntentId = stateFocusIntentId
    ?? checkpointIntentId
    ?? branchIntentId
    ?? singleActiveIntentId
    ?? null;

  let sessionIntentSource = 'none';
  if (focusState.current_focus?.source) {
    sessionIntentSource = focusState.current_focus.source;
  } else if (checkpointIntentId) {
    sessionIntentSource = activeIntentIds.includes(checkpointIntentId) ? 'checkpoint' : 'checkpoint-untracked';
  } else if (branchIntentId) {
    sessionIntentSource = activeIntentIds.includes(branchIntentId) ? 'branch' : 'branch-untracked';
  } else if (singleActiveIntentId) {
    sessionIntentSource = 'active-intent';
  }

  let sessionIntentState = typeof focusState.current_focus?.intent_state === 'string'
    ? focusState.current_focus.intent_state
    : null;
  if (sessionIntentId) {
    if (!sessionIntentState && activeIntentIds.includes(sessionIntentId)) {
      sessionIntentState = 'active';
    } else if (!sessionIntentState && (sessionIntentSource === 'branch-untracked' || sessionIntentSource === 'checkpoint-untracked')) {
      sessionIntentState = 'branch-local';
    }
  }

  return {
    sessionIntentId,
    sessionIntentSource,
    sessionIntentState,
    sessionLabel: focusState.checkpoint?.branch ?? branchName ?? 'unknown-session',
    checkpointEvent: focusState.checkpoint?.event ?? null,
    checkpointIntentId,
    checkpointTimestamp: focusState.checkpoint?.timestamp ?? null,
    focusFile: focusFile ? path.relative(repoRoot, focusFile).replace(/\\/g, '/') : null,
    activeIntentIds,
    branchName,
    branchIntentId,
    focusState,
  };
}

function summarizeWorkspaceFocus(statusResult) {
  const session = summarizeSessionContext(statusResult);

  return {
    intentId: session.sessionIntentId,
    intentState: session.sessionIntentState,
    source: session.sessionIntentSource,
    branch: session.branchName,
  };
}

function buildSessionFocus(statusResult) {
  const session = summarizeSessionContext(statusResult);
  if (!session.sessionIntentId) {
    return {
      ...session,
      intent: null,
      currentTask: null,
    };
  }

  const detail = summarizeIntentDetail(session.sessionIntentId, { includeGit: false });
  if (!detail) {
    return {
      ...session,
      intent: {
        id: session.sessionIntentId,
        title: null,
        goal: null,
        summary: null,
        lifecycle: session.sessionIntentState ?? null,
        status: session.sessionIntentState ?? null,
        focusCurrent: null,
        focusNextAction: null,
        chaosEstimate: null,
      },
      currentTask: null,
    };
  }

  const currentTask = Array.isArray(detail.tasks)
    ? detail.tasks.find((task) => task.status !== 'done') ?? detail.tasks[0] ?? null
    : null;

  const fallbackTask = !currentTask && (detail.focusNextAction || detail.focusCurrent)
    ? {
        title: detail.focusNextAction ?? detail.focusCurrent,
        status: detail.focusNextAction ? 'next' : 'active',
        source: detail.focusNextAction ? 'focus.next_action' : 'focus.current',
      }
    : null;

  return {
    ...session,
    intent: {
      id: detail.id ?? session.sessionIntentId,
      title: detail.title ?? null,
      goal: detail.goal ?? null,
      summary: detail.summary ?? null,
      lifecycle: detail.lifecycle ?? null,
      status: detail.status ?? null,
      focusCurrent: detail.focusCurrent ?? null,
      focusNextAction: detail.focusNextAction ?? null,
      chaosEstimate: detail.chaosEstimate ?? null,
    },
    currentTask: (currentTask || fallbackTask)
      ? {
          title: (currentTask || fallbackTask).title ?? null,
          status: (currentTask || fallbackTask).status ?? null,
          source: (currentTask || fallbackTask).source ?? null,
        }
      : null,
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

function summarizePipeline() {
  try {
    const pipeline = readPipeline(repoRoot, { required: false });
    const steps = Array.isArray(pipeline?.steps) ? pipeline.steps : [];

    return {
      ok: true,
      file: pipeline ? '.kb/release-pipeline.yaml' : null,
      stepCount: steps.length,
      confirmCount: steps.filter((step) => step?.confirm === true).length,
      failOnNonzeroCount: steps.filter((step) => step?.fail_on_nonzero !== false).length,
      steps: steps.slice(0, 5).map((step, index) => ({
        index,
        name: step?.name ?? `step-${index + 1}`,
        description: step?.description ?? null,
        confirm: step?.confirm === true,
        when: step?.when ?? null,
      })),
    };
  } catch (error) {
    return {
      ok: false,
      file: '.kb/release-pipeline.yaml',
      stepCount: 0,
      confirmCount: 0,
      failOnNonzeroCount: 0,
      steps: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function summarizeRulesResult(listResult, lintResult) {
  const listedRules = Array.isArray(listResult?.parsed?.rules) ? listResult.parsed.rules : [];
  const listedPacks = Array.isArray(listResult?.parsed?.packs) ? listResult.parsed.packs : [];
  const precedence = Array.isArray(listResult?.parsed?.precedence) ? listResult.parsed.precedence : [];
  const violations = Array.isArray(lintResult?.parsed?.violations) ? lintResult.parsed.violations : [];
  const errorCount = violations.filter((violation) => String(violation?.severity || '').toLowerCase() === 'error').length;
  const warnCount = violations.filter((violation) => String(violation?.severity || '').toLowerCase() === 'warn').length;
  const hardCount = listedRules.filter((rule) => String(rule?.kind || '').toLowerCase() === 'hard').length;
  const masterCount = listedRules.filter((rule) => String(rule?.kind || '').toLowerCase() === 'master').length;
  const softCount = listedRules.filter((rule) => String(rule?.kind || '').toLowerCase() === 'soft').length;

  return {
    ok: Boolean(listResult?.ok) && Boolean(lintResult?.ok || lintResult?.parsed),
    count: listedRules.length,
    hardCount,
    masterCount,
    softCount,
    linted: lintResult?.parsed?.rulesRun ?? null,
    violationCount: violations.length,
    errorCount,
    warnCount,
    packCount: listedPacks.length,
    rules: listedRules.map((rule) => ({
      id: rule?.id ?? null,
      title: rule?.title ?? rule?.id ?? null,
      severity: rule?.severity ?? null,
      kind: rule?.kind ?? null,
      layer: rule?.layer ?? null,
      scope: Array.isArray(rule?.scope) ? rule.scope : [],
      priority: rule?.priority ?? null,
      dependsOn: Array.isArray(rule?.dependsOn) ? rule.dependsOn : [],
      overrideMode: rule?.overrideMode ?? null,
      tools: Array.isArray(rule?.tools) ? rule.tools : [],
      precedence: rule?.precedence ?? null,
      description: rule?.description ?? null,
      sourceDoc: rule?.source_doc ?? null,
      sourceAnchor: rule?.source_anchor ?? null,
    })),
    packs: listedPacks.map((pack) => ({
      id: pack?.id ?? null,
      title: pack?.title ?? pack?.id ?? null,
      context: pack?.context ?? null,
      description: pack?.description ?? null,
      promptSummary: pack?.promptSummary ?? null,
      ruleIds: Array.isArray(pack?.ruleIds) ? pack.ruleIds : [],
      stats: {
        count: pack?.stats?.count ?? 0,
        hardCount: pack?.stats?.hardCount ?? 0,
        masterCount: pack?.stats?.masterCount ?? 0,
        softCount: pack?.stats?.softCount ?? 0,
        toolAssociationCoverage: pack?.stats?.toolAssociationCoverage ?? 0,
        enforcementCoverage: pack?.stats?.enforcementCoverage ?? 0,
        toolCoverage: pack?.stats?.toolCoverage ?? 0,
      },
    })),
    precedence,
    violations: violations.map((violation) => ({
      ruleId: violation?.rule_id ?? null,
      severity: violation?.severity ?? null,
      file: violation?.file ?? null,
      line: violation?.line ?? null,
      message: violation?.message ?? null,
    })),
    topRules: listedRules.slice(0, 5).map((rule) => ({
      id: rule?.id ?? null,
      title: rule?.title ?? rule?.id ?? null,
      severity: rule?.severity ?? null,
      kind: rule?.kind ?? null,
      precedence: rule?.precedence ?? null,
      description: rule?.description ?? null,
      sourceDoc: rule?.source_doc ?? null,
    })),
    topViolations: violations.slice(0, 5).map((violation) => ({
      ruleId: violation?.rule_id ?? null,
      severity: violation?.severity ?? null,
      file: violation?.file ?? null,
      message: violation?.message ?? null,
    })),
  };
}

function summarizeHomeDashboard(statusResult, runtimeSnapshot, rulesListResult, rulesLintResult, doctorResult) {
  const workspace = summarizeWorkspace(statusResult);
  const session = buildSessionFocus(statusResult);
  const pipeline = summarizePipeline();
  const rules = summarizeRulesResult(rulesListResult, rulesLintResult);
  const system = summarizeSystem(doctorResult);
  const runtime = runtimeSnapshot.summary;

  return {
    generatedAt: new Date().toISOString(),
    workspace,
    session,
    goal: {
      text: session.intent?.goal ?? null,
      summary: session.intent?.summary ?? null,
      focusCurrent: session.intent?.focusCurrent ?? null,
      focusNextAction: session.intent?.focusNextAction ?? null,
      checkpointEvent: session.checkpointEvent ?? null,
      checkpointTimestamp: session.checkpointTimestamp ?? null,
    },
    pipeline,
    rules,
    runtime: {
      ...runtime,
      refreshedAt: runtimeSnapshot.refreshedAt ?? null,
      nextRunAt: runtimeSnapshot.nextRunAt ?? null,
      lastError: runtimeSnapshot.lastError ?? null,
    },
    system,
    milestones: [
      {
        id: 'bridge-runtime',
        label: runtime.runningCount > 0 ? 'Bridge Runtime Live' : 'Bridge Runtime Pending',
        detail: runtime.summaryLabel ?? 'runtime unavailable',
        status: runtime.runningCount > 0 ? 'live' : 'pending',
      },
      {
        id: 'active-intent',
        label: session.intent?.id ? 'Active Intent Routed' : 'Active Intent Missing',
        detail: session.intent?.title ?? session.intent?.id ?? 'no active intent',
        status: session.intent?.id ? 'live' : 'pending',
      },
      {
        id: 'rules-pressure',
        label: rules.violationCount > 0 ? 'Rule Findings Detected' : 'Rules Clean',
        detail: `${rules.violationCount} findings across ${rules.count} rules`,
        status: rules.errorCount > 0 ? 'warn' : rules.violationCount > 0 ? 'live' : 'stable',
      },
      {
        id: 'pipeline-ready',
        label: pipeline.stepCount > 0 ? 'Pipeline Loaded' : 'Pipeline Missing',
        detail: pipeline.stepCount > 0 ? `${pipeline.stepCount} steps in release pipeline` : (pipeline.error ?? 'no pipeline file'),
        status: pipeline.stepCount > 0 ? 'live' : 'pending',
      },
    ],
  };
}

function summarizeSnapshotMetadata({
  previousSnapshot,
  generatedAt,
  workspace,
  session,
  home,
}) {
  const branchName = workspace?.currentFocus?.branch ?? session?.summary?.branchName ?? null;
  const focusIntentId = workspace?.currentFocus?.intentId ?? session?.summary?.sessionIntentId ?? null;
  const activeIntentId = home?.workspace?.activeIntentId ?? null;
  const workingTreeDirty = home?.workspace?.hasWorkingTreeChanges === true;
  const generatedAtMs = Date.parse(generatedAt);
  const staleAt = Number.isFinite(generatedAtMs)
    ? new Date(generatedAtMs + SYSTEM_SNAPSHOT_TTL_MS).toISOString()
    : new Date(Date.now() + SYSTEM_SNAPSHOT_TTL_MS).toISOString();
  const previousMetadata = previousSnapshot?.metadata ?? null;
  const reloadReasons = [];

  if (previousMetadata?.branchName && branchName && previousMetadata.branchName !== branchName) {
    reloadReasons.push('branch-changed');
  }

  if (previousMetadata?.focusIntentId && focusIntentId && previousMetadata.focusIntentId !== focusIntentId) {
    reloadReasons.push('focus-intent-changed');
  }

  if (previousMetadata?.activeIntentId && activeIntentId && previousMetadata.activeIntentId !== activeIntentId) {
    reloadReasons.push('active-intent-changed');
  }

  const fingerprint = JSON.stringify({
    branchName,
    focusIntentId,
    activeIntentId,
    workingTreeDirty,
    driftStatus: workspace?.summary?.driftStatus ?? null,
    runtimeSummary: home?.runtime?.summaryLabel ?? null,
    rulesPressure: home?.rules?.violationCount ?? null,
    systemResult: home?.system?.result ?? null,
  });

  return {
    snapshotVersion: 1,
    generatedAt,
    staleAt,
    ttlMs: SYSTEM_SNAPSHOT_TTL_MS,
    reloadRecommended: reloadReasons.length > 0,
    reloadReasons,
    fingerprint,
    branchName,
    focusIntentId,
    activeIntentId,
    workingTreeDirty,
  };
}

async function collectSystemSnapshot(commandRunner, options = {}) {
  const previousSnapshot = options.previousSnapshot ?? null;
  const [statusResult, runtimeSnapshot, rulesListResult, rulesLintResult, doctorResult, chaosResult, versionResult] = await Promise.all([
    commandRunner('kbx status --json --no-fail-exit --bridge-read', ['status', '--json', '--no-fail-exit', '--bridge-read'], {
      expectJson: true,
      timeoutMs: 20000,
    }),
    runtimeServicesCron.read(`system-snapshot:${options.reason || 'refresh'}`),
    commandRunner('kbx rules list --json', ['rules', 'list', '--json'], {
      expectJson: true,
      timeoutMs: 15000,
    }),
    commandRunner('kbx rules lint --json', ['rules', 'lint', '--json'], {
      expectJson: true,
      timeoutMs: 15000,
    }),
    commandRunner('kbx doctor --json', ['doctor', '--json'], {
      expectJson: true,
      timeoutMs: 15000,
    }),
    commandRunner('kbx chaos --json --no-save', ['chaos', '--json', '--no-save'], {
      expectJson: true,
      timeoutMs: 20000,
    }),
    commandRunner('kbx --version', ['--version'], {
      timeoutMs: 5000,
    }),
  ]);

  const generatedAt = new Date().toISOString();
  const workspaceSummary = summarizeWorkspace(statusResult);
  const workspaceFocus = summarizeWorkspaceFocus(statusResult);
  const sessionSummary = buildSessionFocus(statusResult);
  const rulesSummary = summarizeRulesResult(rulesListResult, rulesLintResult);
  const systemSummary = summarizeSystem(doctorResult);
  const homeSummary = summarizeHomeDashboard(statusResult, runtimeSnapshot, rulesListResult, rulesLintResult, doctorResult);
  const version = versionResult.stdout || versionResult.stderr || null;
  const runtimeSummary = runtimeSnapshot.summary;

  const statusResponse = {
    ...statusResult,
    ok: runtimeSummary.registeredCount > 0 && runtimeSummary.runningCount > 0 && !runtimeSnapshot.lastError,
    chaos: chaosResult,
    parsed: statusResult.parsed && typeof statusResult.parsed === 'object'
      ? {
          ...statusResult.parsed,
          bridgeStatus: runtimeBridgeStatus(runtimeSummary),
          runtimeServices: runtimeSummary,
          runtimeServicesRefreshedAt: runtimeSnapshot.refreshedAt,
          runtimeServicesNextRunAt: runtimeSnapshot.nextRunAt,
          observation: {
            ...(statusResult.parsed.observation && typeof statusResult.parsed.observation === 'object'
              ? statusResult.parsed.observation
              : {}),
            chaosResult: chaosResult.parsed && typeof chaosResult.parsed === 'object'
              ? {
                  score: readFiniteNumber(chaosResult.parsed.score),
                  level: chaosResult.parsed.level ?? null,
                  trend: chaosResult.parsed.trend ?? null,
                }
              : (statusResult.parsed.observation && statusResult.parsed.observation.chaosResult) || null,
          },
        }
      : statusResult.parsed,
  };

  const { gateItems, summary } = evaluatePhase2Gates({
    statusResult,
    doctorResult,
    chaosResult: {
      ...chaosResult,
      stdout: chaosResult.stdout || '',
    },
  });

  return {
    ok: Boolean(statusResult.parsed) || runtimeSummary.registeredCount > 0,
    metadata: summarizeSnapshotMetadata({
      previousSnapshot,
      generatedAt,
      workspace: {
        summary: workspaceSummary,
        currentFocus: workspaceFocus,
      },
      session: {
        summary: sessionSummary,
      },
      home: homeSummary,
    }),
    version: {
      ok: versionResult.ok,
      stdout: version,
      version,
    },
    status: statusResponse,
    workspace: {
      ok: statusResult.ok,
      summary: workspaceSummary,
      currentFocus: workspaceFocus,
      stderr: statusResult.stderr,
    },
    sessionContext: {
      ok: statusResult.ok,
      summary: sessionSummary,
      stderr: statusResult.stderr,
    },
    runtimeServices: {
      ok: true,
      summary: runtimeSummary,
      refreshedAt: runtimeSnapshot.refreshedAt ?? null,
      nextRunAt: runtimeSnapshot.nextRunAt ?? null,
      intervalMs: runtimeSnapshot.intervalMs ?? null,
      schedules: runtimeSnapshot.schedules ?? [],
      reason: runtimeSnapshot.reason ?? null,
      lastError: runtimeSnapshot.lastError ?? null,
    },
    rulesCatalog: {
      ...rulesListResult,
    },
    rulesSummary: {
      ok: Boolean(rulesListResult.ok) && Boolean(rulesLintResult.ok),
      summary: rulesSummary,
      errors: {
        list: rulesListResult.ok ? null : rulesListResult.stderr || 'rules list failed',
        lint: rulesLintResult.ok ? null : rulesLintResult.stderr || 'rules lint failed',
      },
    },
    system: {
      ok: doctorResult.ok,
      summary: systemSummary,
      error: doctorResult.ok ? null : doctorResult.stderr || 'doctor failed',
    },
    homeSummary: {
      ok: Boolean(statusResult.parsed) || runtimeSummary.registeredCount > 0,
      summary: homeSummary,
      errors: {
        status: statusResult.ok ? null : statusResult.stderr || 'status failed',
        rulesList: rulesListResult.ok ? null : rulesListResult.stderr || 'rules list failed',
        rulesLint: rulesLintResult.ok ? null : rulesLintResult.stderr || 'rules lint failed',
        doctor: doctorResult.ok ? null : doctorResult.stderr || 'doctor failed',
        runtime: runtimeSnapshot.lastError ?? null,
      },
    },
    gates: {
      ok: true,
      phase: 'phase-2-cli-bridge',
      checkedAt: generatedAt,
      summary,
      items: gateItems,
      readiness: summary.blocked ? 'blocked' : summary.warn > 0 ? 'review' : 'ready',
    },
    diagnostics: {
      doctor: doctorResult,
      chaos: chaosResult,
      phase2Bridge: {
        phase: 'phase-2-cli-bridge',
        checkedAt: generatedAt,
        summary,
        gates: gateItems,
        commands: {
          status: statusResult,
          doctor: doctorResult,
          chaos: chaosResult,
        },
        ok: !summary.blocked,
      },
    },
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

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function isSupportedDocumentFile(fileName) {
  return /\.(md|html?)$/i.test(String(fileName || ''));
}

function parseFrontmatter(text) {
  const normalized = String(text || '');
  if (!normalized.startsWith('---\n') && !normalized.startsWith('---\r\n')) {
    return { metadata: {}, body: normalized };
  }

  const match = normalized.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, body: normalized };
  }

  const metadata = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^#/.test(line)) continue;
    const fieldMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!fieldMatch) continue;
    const [, key, rawValue] = fieldMatch;
    metadata[key] = rawValue.replace(/^"|"$/g, '').trim();
  }

  return {
    metadata,
    body: match[2] || '',
  };
}

function slugifyHeading(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function extractMarkdownToc(body) {
  const items = [];
  for (const rawLine of String(body || '').split(/\r?\n/)) {
    const match = rawLine.match(/^(#{1,6})\s+(.+)$/);
    if (!match) continue;
    const label = match[2].trim();
    items.push({
      id: slugifyHeading(label),
      label,
      level: match[1].length,
    });
  }
  return items;
}

function extractHtmlToc(text) {
  const items = [];
  const regex = /<h([1-6])(?:\s+[^>]*)?>([\s\S]*?)<\/h\1>/gi;
  for (const match of String(text || '').matchAll(regex)) {
    const level = Number(match[1]);
    const label = String(match[2] || '').replace(/<[^>]+>/g, '').trim();
    if (!label) continue;
    items.push({
      id: slugifyHeading(label),
      label,
      level,
    });
  }
  return items;
}

function extractDocumentSummary(format, body) {
  if (format === 'html') {
    const plain = String(body || '').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return plain.slice(0, 220) || null;
  }

  for (const rawBlock of String(body || '').split(/\r?\n\s*\r?\n/)) {
    const clean = rawBlock
      .replace(/^#+\s+/gm, '')
      .replace(/^[-*]\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .trim();
    if (clean) {
      return clean.slice(0, 220);
    }
  }
  return null;
}

function formatDocumentTone(metadata) {
  const verification = String(metadata.verification || '').toLowerCase();
  const timeState = String(metadata.time_state || '').toLowerCase();
  if (verification === 'code-verified' || verification === 'self-referential') {
    return 'ok';
  }
  if (verification === 'unverified' || verification === 'design-only' || timeState === 'stale') {
    return 'warn';
  }
  return 'info';
}

function buildDocumentDetail(absPath, relPath) {
  const content = fs.readFileSync(absPath, 'utf8');
  const format = /\.html?$/i.test(absPath) ? 'html' : 'md';
  const parsed = format === 'md'
    ? parseFrontmatter(content)
    : { metadata: {}, body: content };
  const metadata = parsed.metadata || {};
  const title = metadata.title || (format === 'html'
    ? String(content.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').trim()
    : String(parsed.body.match(/^#\s+(.+)$/m)?.[1] || '').trim()) || path.basename(absPath);
  const toc = format === 'html' ? extractHtmlToc(content) : extractMarkdownToc(parsed.body);
  const summary = extractDocumentSummary(format, parsed.body || content);

  return {
    path: relPath,
    format,
    title,
    content,
    summary,
    metadata: {
      title: metadata.title || null,
      type: metadata.type || null,
      status: metadata.status || null,
      owner: metadata.owner || null,
      verification: metadata.verification || null,
      time_state: metadata.time_state || null,
      last_updated: metadata.last_updated || null,
      last_verified: metadata.last_verified || null,
      tags: metadata.tags ? [String(metadata.tags)] : [],
    },
    toc,
  };
}

function listKnowledgeBaseDocuments(rootDir) {
  const folders = new Map();
  const documents = [];

  function ensureFolder(folderPath) {
    const key = toPosixPath(folderPath || '');
    if (!folders.has(key)) {
      folders.set(key, {
        kind: 'folder',
        name: key ? path.posix.basename(key) : 'knowledge-base',
        path: key,
        children: [],
      });
    }
    return folders.get(key);
  }

  ensureFolder('');

  function walk(currentDir, relativeDir = '') {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith('.'))
      .sort((left, right) => Number(right.isDirectory()) - Number(left.isDirectory()) || left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absPath = path.join(currentDir, entry.name);
      const relPath = toPosixPath(path.posix.join(relativeDir, entry.name));
      if (entry.isDirectory()) {
        ensureFolder(relPath);
        walk(absPath, relPath);
        continue;
      }
      if (!isSupportedDocumentFile(entry.name)) {
        continue;
      }
      const detail = buildDocumentDetail(absPath, relPath);
      documents.push(detail);
    }
  }

  walk(rootDir, '');

  const folderPaths = [...folders.keys()].sort((left, right) => left.localeCompare(right));
  for (const folderPath of folderPaths) {
    const folder = folders.get(folderPath);
    const parentPath = folderPath.includes('/') ? folderPath.slice(0, folderPath.lastIndexOf('/')) : '';
    if (folderPath) {
      ensureFolder(parentPath).children.push(folder);
    }
  }

  for (const detail of documents) {
    const docPath = toPosixPath(detail.path);
    const parentPath = docPath.includes('/') ? docPath.slice(0, docPath.lastIndexOf('/')) : '';
    ensureFolder(parentPath).children.push({
      kind: 'document',
      name: path.posix.basename(docPath),
      path: docPath,
      format: detail.format,
      title: detail.title,
      summary: detail.summary,
      statusTone: formatDocumentTone(detail.metadata),
    });
  }

  for (const folder of folders.values()) {
    folder.children.sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === 'folder' ? -1 : 1;
      }
      return String(left.name || '').localeCompare(String(right.name || ''));
    });
  }

  return {
    tree: folders.get('')?.children || [],
    documents,
  };
}

function summarizeDocumentWorkspace(documents) {
  const folderStats = new Map();
  const topIssues = [];
  let markdownCount = 0;
  let htmlCount = 0;
  let verifiedCount = 0;
  let provisionalCount = 0;
  let staleCount = 0;

  for (const doc of documents) {
    if (doc.format === 'html') htmlCount += 1;
    else markdownCount += 1;

    const verification = String(doc.metadata.verification || '').toLowerCase();
    const timeState = String(doc.metadata.time_state || '').toLowerCase();
    if (verification === 'code-verified' || verification === 'self-referential') {
      verifiedCount += 1;
    }
    if (verification === 'unverified' || verification === 'design-only') {
      provisionalCount += 1;
      topIssues.push({
        checkId: 'doc-verification',
        severity: 'warn',
        message: `${doc.title || doc.path} is ${verification || 'unverified'}`,
        evidencePath: doc.path,
      });
    }
    if (timeState && timeState !== 'current') {
      staleCount += 1;
      topIssues.push({
        checkId: 'doc-time-state',
        severity: 'info',
        message: `${doc.title || doc.path} is ${timeState}`,
        evidencePath: doc.path,
      });
    }

    const parentPath = doc.path.includes('/') ? doc.path.slice(0, doc.path.lastIndexOf('/')) : '';
    if (!folderStats.has(parentPath)) {
      folderStats.set(parentPath, { path: parentPath || 'knowledge-base', count: 0, warningCount: 0 });
    }
    const entry = folderStats.get(parentPath);
    entry.count += 1;
    if (formatDocumentTone(doc.metadata) === 'warn') {
      entry.warningCount += 1;
    }
  }

  return {
    totalDocuments: documents.length,
    markdownCount,
    htmlCount,
    verifiedCount,
    provisionalCount,
    staleCount,
    folderCount: folderStats.size,
    entityCount: documents.length,
    relationCount: folderStats.size,
    issueCount: topIssues.length,
    topIssues: topIssues.slice(0, 5),
    topFolders: [...folderStats.values()]
      .sort((left, right) => right.warningCount - left.warningCount || right.count - left.count || left.path.localeCompare(right.path))
      .slice(0, 5),
  };
}

function buildDocumentsWorkspace(selectedPath) {
  const { tree, documents } = listKnowledgeBaseDocuments(kbRoot);
  const normalizedSelectedPath = toPosixPath(String(selectedPath || '').trim());
  const selected = documents.find((doc) => doc.path === normalizedSelectedPath) || documents[0] || null;
  return {
    summary: summarizeDocumentWorkspace(documents),
    tree,
    selected,
  };
}

// ═══ KB STORE (Slice C-1 — DB-backed) ═══
//
// The KB workspace is now persisted in svfactory/kb-index.db. Roots and per-
// file rows (folders + .md/.html docs) live in `kb_roots` and `kb_files`.
// Reads hit indexed columns (~ms); mutations write to DB then schedule a
// background re-import of the affected root. Filesystem is reconciled
// against the DB via drift/sync ops in slice C-2+.
function createKbStore({ repoRoot: storeRepoRoot, dbPath = kbIndexDbPath, legacyStatePath = kbRootsStatePath, defaults = KB_CANDIDATE_ROOTS }) {
  const db = kbDb.openKbDb(dbPath);

  // One-time migration: if the slice-B L5 json still exists and the DB has
  // no roots, seed the table from it. Then delete the json — DB takes over.
  function migrateLegacyL5() {
    const seeded = kbDb.readMeta(db, 'legacy_l5_migrated');
    if (seeded === '1') return;
    const existingRoots = kbDb.listRoots(db);
    let toSeed = [];
    if (existingRoots.length === 0) {
      let activeFromJson = null;
      try {
        if (fs.existsSync(legacyStatePath)) {
          const parsed = JSON.parse(fs.readFileSync(legacyStatePath, 'utf8'));
          if (parsed && Array.isArray(parsed.activeRoots)) activeFromJson = parsed.activeRoots;
        }
      } catch {}
      const activeSet = new Set(activeFromJson ?? defaults.filter((d) => d.defaultActive).map((d) => d.path));
      // Seed from defaults; mark active per active-set.
      toSeed = defaults
        .filter((d) => fs.existsSync(path.join(storeRepoRoot, d.path)))
        .map((d) => ({ path: d.path, label: d.label, active: activeSet.has(d.path) ? 1 : 0 }));
    }
    for (const row of toSeed) {
      kbDb.upsertRoot(db, { path: row.path, label: row.label, active: row.active, addedAt: new Date().toISOString() });
    }
    kbDb.writeMeta(db, 'legacy_l5_migrated', '1');
    try { if (fs.existsSync(legacyStatePath)) fs.renameSync(legacyStatePath, `${legacyStatePath}.migrated`); } catch {}
  }
  migrateLegacyL5();

  // ─── helpers ───

  function rowToTreeNode(row) {
    if (row.kind === 'folder') {
      return {
        kind: 'folder',
        path: row.path,
        title: row.basename || row.path.split('/').pop(),
        children: [],
        // docCount set after assembly
        docCount: 0,
        stalest: null,
      };
    }
    return {
      kind: 'doc',
      path: row.path,
      title: row.title || row.basename,
      type: row.type || 'unknown',
      status: row.status || 'unknown',
      verification: row.verification || 'unknown',
      time_state: row.time_state || 'unknown',
      owner: row.owner || '',
      last_updated: row.last_updated || '',
      last_verified: row.last_verified || '',
      daysSinceVerified: row.days_since_verified ?? 0,
      stale: (row.days_since_verified ?? 0) >= 60,
      tags: row.tags ? safeJsonParse(row.tags, []) : [],
      fileKind: row.kind,
    };
  }

  function safeJsonParse(s, fallback) {
    try { return JSON.parse(s); } catch { return fallback; }
  }

  // Build a root subtree from all rows under root_path.
  function buildRootTree(rootRow) {
    const rows = kbDb.listAllUnderRoot(db, rootRow.path);
    const byPath = new Map();
    for (const r of rows) byPath.set(r.path, rowToTreeNode(r));
    // root node itself isn't in kb_files (we only store children); synthesize.
    const rootNode = {
      kind: 'folder',
      path: rootRow.path,
      title: rootRow.path.split('/').pop() || rootRow.path,
      label: rootRow.label,
      defaultActive: true,
      docCount: 0,
      stalest: null,
      children: [],
    };
    byPath.set(rootRow.path, rootNode);
    // Attach children to parents; track docCount and stalest.
    for (const r of rows) {
      const parent = byPath.get(r.parent_path) || rootNode;
      parent.children.push(byPath.get(r.path));
    }
    // Recursive post-order: counts + stalest aggregate
    function fold(node) {
      if (node.kind !== 'folder') {
        return { count: 1, stalest: node.daysSinceVerified >= 60 ? { path: node.path, daysSinceVerified: node.daysSinceVerified } : null };
      }
      let count = 0;
      let stalest = null;
      // sort children: folders first then files, alphabetical
      node.children.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
        return (a.title || '').localeCompare(b.title || '');
      });
      for (const c of node.children) {
        const f = fold(c);
        count += f.count;
        if (f.stalest && (!stalest || f.stalest.daysSinceVerified > stalest.daysSinceVerified)) stalest = f.stalest;
      }
      node.docCount = count;
      node.stalest = stalest;
      return { count, stalest };
    }
    fold(rootNode);
    return rootNode;
  }

  // ─── import (disk → DB) ───

  let importing = new Set(); // paths being imported (guard re-entry)

  function importRoot(rootPath, { force = false } = {}) {
    if (importing.has(rootPath)) return;
    const root = kbDb.getRoot(db, rootPath);
    if (!root) return;
    if (!force && root.indexed_at && kbDb.countFilesByRoot(db, rootPath) > 0) return;
    importing.add(rootPath);
    try {
      const abs = path.join(storeRepoRoot, rootPath);
      const walk = kbWalkRoot(abs, rootPath, new Date());
      if (!walk.node) {
        kbDb.deleteFilesUnderRoot(db, rootPath);
        kbDb.setRootIndexed(db, rootPath);
        return;
      }
      // Wipe and re-insert in a transaction (simple full reimport).
      const tx = db.prepare('BEGIN'); tx.run();
      try {
        kbDb.deleteFilesUnderRoot(db, rootPath);
        const indexedAt = new Date().toISOString();
        // walk.node.children contains the tree. We need flat rows: every doc
        // and every folder under root (including nested), with parent_path.
        function flatten(node, parentPath) {
          if (node.kind === 'doc') {
            // Need full body+html — kbWalkRoot returns summary only. Re-parse
            // from disk for body+html.
            const fullAbs = path.join(storeRepoRoot, node.path);
            const parsed = kbParseDocFromDisk(fullAbs, node.path, new Date());
            const stat = (() => { try { return fs.statSync(fullAbs); } catch { return null; } })();
            kbDb.upsertFileRow(db, {
              path: node.path,
              root_path: rootPath,
              parent_path: parentPath,
              basename: node.path.split('/').pop(),
              kind: node.fileKind || (node.path.endsWith('.html') ? 'html' : 'md'),
              size: stat ? stat.size : null,
              mtime_ms: stat ? Math.round(stat.mtimeMs) : null,
              content_hash: parsed.contentHash || null,
              title: parsed.doc.frontmatter.title || node.title,
              type: parsed.doc.frontmatter.type,
              status: parsed.doc.frontmatter.status,
              verification: parsed.doc.frontmatter.verification,
              time_state: parsed.doc.frontmatter.time_state,
              owner: parsed.doc.frontmatter.owner,
              last_updated: parsed.doc.frontmatter.last_updated,
              last_verified: parsed.doc.frontmatter.last_verified,
              days_since_verified: node.daysSinceVerified,
              tags: parsed.doc.frontmatter.tags,
              body: parsed.rawText,         // raw file bytes (used by slice C-3 restore)
              html: parsed.doc.html,
              indexed_at: indexedAt,
            });
            return;
          }
          // folder
          kbDb.upsertFileRow(db, {
            path: node.path,
            root_path: rootPath,
            parent_path: parentPath,
            basename: node.path.split('/').pop(),
            kind: 'folder',
            indexed_at: indexedAt,
          });
          for (const c of node.children || []) flatten(c, node.path);
        }
        // Children of the root walk node go under parent = rootPath.
        for (const c of walk.node.children || []) flatten(c, rootPath);
        kbDb.setRootIndexed(db, rootPath, indexedAt);
        db.prepare('COMMIT').run();
      } catch (err) {
        try { db.prepare('ROLLBACK').run(); } catch {}
        throw err;
      }
    } finally {
      importing.delete(rootPath);
    }
  }

  function ensureRootImported(rootPath) {
    const root = kbDb.getRoot(db, rootPath);
    if (!root) return;
    if (kbDb.countFilesByRoot(db, rootPath) === 0) importRoot(rootPath);
  }

  // ─── public API (UI contract) ───

  function getTree() {
    const generatedAt = new Date().toISOString();
    const activeRoots = kbDb.listActiveRoots(db);
    const roots = [];
    for (const r of activeRoots) {
      ensureRootImported(r.path);
      const rootRow = kbDb.getRoot(db, r.path);
      roots.push(buildRootTree(rootRow));
    }
    return { generatedAt, roots };
  }

  function getRootCandidates() {
    // All rows in kb_roots, with active flag and docCount.
    const all = kbDb.listRoots(db);
    return all.map((r) => ({
      path: r.path,
      label: r.label,
      defaultActive: false, // not meaningful anymore — DB tracks active per-row
      docCount: kbDb.countFilesByRoot(db, r.path),
      active: r.active === 1,
      indexedAt: r.indexed_at,
    }));
  }

  function getActiveRoots() {
    return kbDb.listActiveRoots(db).map((r) => r.path);
  }

  function getDoc(relPath) {
    if (typeof relPath !== 'string' || !relPath) return null;
    const safe = relPath.replace(/^[/\\]+/, '').split(/[\\/]+/).join('/');
    const row = kbDb.getDoc(db, safe);
    if (row) {
      if (row.kind === 'folder') return null;
      return {
        path: row.path,
        frontmatter: {
          title: row.title || '',
          type: row.type || 'unknown',
          status: row.status || 'unknown',
          owner: row.owner || '',
          time_state: row.time_state || 'unknown',
          verification: row.verification || 'unknown',
          last_updated: row.last_updated || '',
          last_verified: row.last_verified || '',
          last_verified_commit: null,
          source_of_truth: null,
          related_strong: [],
          related_weak: [],
          released_in: null,
          tags: row.tags ? safeJsonParse(row.tags, []) : [],
        },
        headings: [], // not stored in slice C-1; client TOC is empty until C-2 stores them
        html: row.html || '',
        body: row.body || '',
        contentHash: row.content_hash || null,
        fromCache: true,
        snapshotAt: row.indexed_at,
      };
    }
    // Fallback: doc not in DB but path looks like a valid file under repo →
    // parse on the fly and upsert. Lets us serve a file before its root was
    // ever indexed.
    const abs = path.resolve(storeRepoRoot, safe);
    const rel = path.relative(storeRepoRoot, abs).split(path.sep).join('/');
    if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
    if (!/\.(md|html)$/i.test(rel)) return null;
    if (!fs.existsSync(abs)) return null;
    const parsed = kbParseDocFromDisk(abs, rel, new Date());
    return { ...parsed.doc, fromCache: false, snapshotAt: new Date().toISOString() };
  }

  function refresh(reason, rootPath) {
    if (rootPath) { importRoot(rootPath, { force: true }); return { generatedAt: new Date().toISOString(), reason: `refresh:${reason || 'manual'}:${rootPath}` }; }
    // Full refresh = re-import all active roots.
    for (const r of kbDb.listActiveRoots(db)) importRoot(r.path, { force: true });
    return { generatedAt: new Date().toISOString(), reason: `refresh:${reason || 'manual'}:all` };
  }

  function addRoot(requestedPath) {
    const v = kbValidateCandidateRoot(storeRepoRoot, requestedPath);
    if (!v.ok) return { ok: false, error: v.reason };
    const existing = kbDb.getRoot(db, v.normalized);
    if (existing && existing.active === 1) {
      return { ok: true, alreadyActive: true, activeRoots: getActiveRoots() };
    }
    const label = existing ? existing.label : v.normalized.split('/').pop() || v.normalized;
    kbDb.upsertRoot(db, { path: v.normalized, label, active: 1, addedAt: existing ? existing.added_at : new Date().toISOString() });
    // Defer import: GET /api/kb/tree triggers ensureRootImported lazily.
    return { ok: true, activeRoots: getActiveRoots(), addedPath: v.normalized };
  }

  function removeRoot(requestedPath) {
    if (typeof requestedPath !== 'string' || !requestedPath) {
      return { ok: false, error: 'path required' };
    }
    const normalized = requestedPath.trim().replace(/^[/\\]+/, '').split(/[\\/]+/).join('/');
    const existing = kbDb.getRoot(db, normalized);
    if (!existing || existing.active === 0) {
      return { ok: true, alreadyInactive: true, activeRoots: getActiveRoots() };
    }
    kbDb.upsertRoot(db, { path: normalized, label: existing.label, active: 0, addedAt: existing.added_at });
    // Keep cached rows for a possible re-activate later; full delete is opt-in.
    return { ok: true, activeRoots: getActiveRoots() };
  }

  // ─── browse picker (drill-down filesystem chooser, no DB writes) ───
  //
  // Dumb file-tree browser. Lists immediate child directories only — no
  // recursive scan to "suggest" useful folders, no doc count, no content
  // probing. Skips only obvious junk (node_modules, .git, dist...). If the
  // user picks an empty folder, that's their call; the import will just
  // produce 0 rows and they can pick something else.
  function browse(relPath) {
    const safe = (relPath || '').replace(/^[/\\]+/, '').split(/[\\/]+/).filter(Boolean).join('/');
    const abs = safe ? path.join(storeRepoRoot, safe) : storeRepoRoot;
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      return { ok: false, error: 'path is not a directory' };
    }
    let entries;
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return { ok: false, error: 'cannot read directory' }; }
    const children = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith('.') && e.name !== '.github') continue;
      if (KB_SKIP_DIRS.has(e.name)) continue;
      const childRel = safe ? `${safe}/${e.name}` : e.name;
      const existing = kbDb.getRoot(db, childRel);
      children.push({
        name: e.name,
        path: childRel,
        isRoot: !!existing,
        active: existing ? existing.active === 1 : false,
      });
    }
    children.sort((a, b) => a.name.localeCompare(b.name));
    const parent = safe ? safe.split('/').slice(0, -1).join('/') : null;
    return { ok: true, path: safe, parent, children };
  }

  // ─── drift detection (slice C-2) ───
  //
  // Compares DB rows against disk for each active root. Returns one entry
  // per out-of-sync file. Categories:
  //   - disk-only:    file exists on disk, no DB row (created outside UI)
  //   - db-only:      DB row exists, no file on disk (deleted outside UI)
  //   - content-diff: both exist but content_hash differs (edited outside UI)
  // Backfill: if a DB row has null content_hash (legacy row from before
  // slice C-2), it's hashed lazily and the row updated, then compared.
  function detectDrift(filterRoot) {
    const roots = filterRoot
      ? [kbDb.getRoot(db, filterRoot)].filter((r) => r && r.active === 1)
      : kbDb.listActiveRoots(db).map((r) => kbDb.getRoot(db, r.path));
    const drift = [];
    for (const root of roots) {
      // 1) walk disk to collect file set (only kb-relevant extensions)
      const diskFiles = new Map(); // relPath → { hash, mtime, size }
      const rootAbs = path.join(storeRepoRoot, root.path);
      if (fs.existsSync(rootAbs)) {
        const stack = [rootAbs];
        while (stack.length > 0) {
          const cur = stack.pop();
          let entries;
          try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
          for (const e of entries) {
            if (e.name.startsWith('.') && e.name !== '.github') continue;
            if (KB_SKIP_DIRS.has(e.name)) continue;
            const abs = path.join(cur, e.name);
            if (e.isDirectory()) { stack.push(abs); continue; }
            if (!e.isFile()) continue;
            const dot = e.name.lastIndexOf('.');
            const ext = dot >= 0 ? e.name.slice(dot).toLowerCase() : '';
            if (!KB_ALLOWED_EXT.has(ext)) continue;
            const rel = path.relative(storeRepoRoot, abs).split(path.sep).join('/');
            const hash = kbComputeFileHash(abs);
            let stat = null; try { stat = fs.statSync(abs); } catch {}
            diskFiles.set(rel, { hash, mtime: stat ? Math.round(stat.mtimeMs) : null, size: stat ? stat.size : null });
          }
        }
      }
      // 2) DB rows (file kind only)
      const rows = kbDb.listAllUnderRoot(db, root.path).filter((r) => r.kind !== 'folder');
      const dbPaths = new Set(rows.map((r) => r.path));
      // 3) Compare
      // disk-only
      for (const [p, info] of diskFiles) {
        if (!dbPaths.has(p)) {
          drift.push({ root: root.path, path: p, state: 'disk-only', diskHash: info.hash, dbHash: null });
        }
      }
      // db-only + content-diff
      for (const r of rows) {
        if (!diskFiles.has(r.path)) {
          drift.push({ root: root.path, path: r.path, state: 'db-only', diskHash: null, dbHash: r.content_hash });
          continue;
        }
        const disk = diskFiles.get(r.path);
        let dbHash = r.content_hash;
        // Backfill missing hash from disk (and update DB row so next check is fast)
        if (!dbHash && disk.hash) {
          try {
            db.prepare(`UPDATE kb_files SET content_hash = ? WHERE path = ?`).run(disk.hash, r.path);
            dbHash = disk.hash;
          } catch {}
        }
        if (dbHash && disk.hash && dbHash !== disk.hash) {
          drift.push({ root: root.path, path: r.path, state: 'content-diff', diskHash: disk.hash, dbHash });
        }
      }
    }
    return drift;
  }

  // ─── sync ops (slice C-3) ───
  //
  // Per-row drift resolution.
  //   syncImport(path)  = "accept disk" — make DB match disk.
  //     disk-only    → INSERT row from disk
  //     content-diff → UPSERT row with fresh disk content
  //     db-only      → DELETE row (file is gone)
  //   syncRestore(path) = "restore from DB" — make disk match DB.
  //     disk-only    → DELETE file from disk
  //     content-diff → overwrite disk with DB body
  //     db-only      → re-create file on disk from DB body
  //
  // Both operations re-check the file's actual state right before acting so
  // a stale UI doesn't cause a misfire.

  function classifyOne(relPath) {
    const safe = relPath.replace(/^[/\\]+/, '').split(/[\\/]+/).join('/');
    const abs = path.resolve(storeRepoRoot, safe);
    const rel = path.relative(storeRepoRoot, abs).split(path.sep).join('/');
    if (rel.startsWith('..') || path.isAbsolute(rel)) return { error: 'path outside workspace' };
    if (!/\.(md|html)$/i.test(rel)) return { error: 'path is not an allowed file' };
    const row = kbDb.getDoc(db, rel);
    const onDisk = fs.existsSync(abs);
    let diskHash = null;
    if (onDisk) diskHash = kbComputeFileHash(abs);
    if (!row && !onDisk) return { error: 'no DB row and no disk file' };
    if (!row && onDisk) return { state: 'disk-only', abs, rel, row: null, diskHash };
    if (row && !onDisk) return { state: 'db-only', abs, rel, row, diskHash: null };
    if (row && onDisk && row.content_hash === diskHash) return { state: 'in-sync', abs, rel, row, diskHash };
    return { state: 'content-diff', abs, rel, row, diskHash };
  }

  function rootOf(rel) {
    // Pick the deepest active root that is a prefix of rel.
    let best = null;
    for (const r of kbDb.listActiveRoots(db)) {
      if (rel === r.path || rel.startsWith(r.path + '/')) {
        if (!best || r.path.length > best.path.length) best = r;
      }
    }
    return best;
  }

  function syncImport(relPath) {
    const c = classifyOne(relPath);
    if (c.error) return { ok: false, error: c.error };
    if (c.state === 'in-sync') return { ok: true, state: 'in-sync', noop: true };
    if (c.state === 'db-only') {
      db.prepare(`DELETE FROM kb_files WHERE path = ?`).run(c.rel);
      return { ok: true, state: c.state, action: 'deleted-db-row' };
    }
    // disk-only or content-diff → parse disk and upsert.
    const root = rootOf(c.rel);
    if (!root) return { ok: false, error: 'path is not under any active root' };
    const parsed = kbParseDocFromDisk(c.abs, c.rel, new Date());
    let stat = null; try { stat = fs.statSync(c.abs); } catch {}
    const parentPath = c.rel.split('/').slice(0, -1).join('/');
    kbDb.upsertFileRow(db, {
      path: c.rel,
      root_path: root.path,
      parent_path: parentPath,
      basename: c.rel.split('/').pop(),
      kind: c.rel.endsWith('.html') ? 'html' : 'md',
      size: stat ? stat.size : null,
      mtime_ms: stat ? Math.round(stat.mtimeMs) : null,
      content_hash: parsed.contentHash,
      title: parsed.doc.frontmatter.title || c.rel.split('/').pop(),
      type: parsed.doc.frontmatter.type,
      status: parsed.doc.frontmatter.status,
      verification: parsed.doc.frontmatter.verification,
      time_state: parsed.doc.frontmatter.time_state,
      owner: parsed.doc.frontmatter.owner,
      last_updated: parsed.doc.frontmatter.last_updated,
      last_verified: parsed.doc.frontmatter.last_verified,
      days_since_verified: 0,
      tags: parsed.doc.frontmatter.tags,
      body: parsed.rawText,
      html: parsed.doc.html,
      indexed_at: new Date().toISOString(),
    });
    return { ok: true, state: c.state, action: 'upserted' };
  }

  function syncRestore(relPath) {
    const c = classifyOne(relPath);
    if (c.error) return { ok: false, error: c.error };
    if (c.state === 'in-sync') return { ok: true, state: 'in-sync', noop: true };
    if (c.state === 'disk-only') {
      try { fs.unlinkSync(c.abs); } catch (err) { return { ok: false, error: `unlink failed: ${err?.message || err}` }; }
      return { ok: true, state: c.state, action: 'deleted-disk-file' };
    }
    // db-only or content-diff → write DB body to disk.
    if (!c.row || !c.row.body) {
      return { ok: false, error: 'DB row has no body (legacy slice-C-1 row). Run POST /api/kb/refresh once to populate.' };
    }
    try {
      fs.mkdirSync(path.dirname(c.abs), { recursive: true });
      fs.writeFileSync(c.abs, c.row.body, 'utf8');
    } catch (err) {
      return { ok: false, error: `write failed: ${err?.message || err}` };
    }
    return { ok: true, state: c.state, action: 'wrote-disk-from-db' };
  }

  function syncMany(op, paths) {
    const results = [];
    for (const p of paths) {
      const r = op === 'import' ? syncImport(p) : syncRestore(p);
      results.push({ path: p, ...r });
    }
    return results;
  }

  // ─── doc mutation (slice C-4) ───
  //
  // DB-first edit flow: UPSERT row with the new body + re-parsed
  // frontmatter + fresh hash, then write the file atomically (tmp +
  // rename). The DB row reflects user intent the moment the response
  // returns; file may briefly lag if the disk write fails (surfaced via
  // drift detection on the next check).
  //
  // Conflict detection: if the client sends expectedHash and the disk
  // hash differs (someone edited the file behind our back since the
  // editor loaded), reject with 409 so the UI can surface the conflict.
  function updateDoc({ path: relPath, body, expectedHash } = {}) {
    if (typeof relPath !== 'string' || !relPath) return { ok: false, error: 'path required' };
    if (typeof body !== 'string') return { ok: false, error: 'body must be a string' };
    const safe = relPath.replace(/^[/\\]+/, '').split(/[\\/]+/).join('/');
    const abs = path.resolve(storeRepoRoot, safe);
    const rel = path.relative(storeRepoRoot, abs).split(path.sep).join('/');
    if (rel.startsWith('..') || path.isAbsolute(rel)) return { ok: false, error: 'path outside workspace' };
    if (!/\.(md|html)$/i.test(rel)) return { ok: false, error: 'only .md / .html supported' };

    // Conflict check: disk-side
    if (typeof expectedHash === 'string' && expectedHash) {
      if (fs.existsSync(abs)) {
        const onDisk = kbComputeFileHash(abs);
        if (onDisk && onDisk !== expectedHash) {
          return { ok: false, conflict: true, error: 'file on disk changed since editor opened', diskHash: onDisk };
        }
      }
    }

    const root = rootOf(rel);
    if (!root) return { ok: false, error: 'path is not under any active root' };

    // 1) Parse the new body (no fs read)
    const parsed = kbParseDocFromText(body, rel, new Date());

    // 2) DB-first UPSERT
    const parentPath = rel.split('/').slice(0, -1).join('/');
    const indexedAt = new Date().toISOString();
    kbDb.upsertFileRow(db, {
      path: rel,
      root_path: root.path,
      parent_path: parentPath,
      basename: rel.split('/').pop(),
      kind: rel.endsWith('.html') ? 'html' : 'md',
      size: Buffer.byteLength(body, 'utf8'),
      mtime_ms: Date.now(),
      content_hash: parsed.contentHash,
      title: parsed.doc.frontmatter.title || rel.split('/').pop(),
      type: parsed.doc.frontmatter.type,
      status: parsed.doc.frontmatter.status,
      verification: parsed.doc.frontmatter.verification,
      time_state: parsed.doc.frontmatter.time_state,
      owner: parsed.doc.frontmatter.owner,
      last_updated: parsed.doc.frontmatter.last_updated,
      last_verified: parsed.doc.frontmatter.last_verified,
      days_since_verified: 0,
      tags: parsed.doc.frontmatter.tags,
      body: parsed.rawText,
      html: parsed.doc.html,
      indexed_at: indexedAt,
    });

    // 3) Atomic disk write (tmp + rename). If this fails, DB stays ahead;
    // drift detection will show it. We surface the warning to the client.
    let diskWritten = true;
    let diskError = null;
    try {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      const tmp = `${abs}.tmp-${Date.now()}`;
      fs.writeFileSync(tmp, body, 'utf8');
      fs.renameSync(tmp, abs);
    } catch (err) {
      diskWritten = false;
      diskError = err?.message || String(err);
    }

    return {
      ok: true,
      path: rel,
      contentHash: parsed.contentHash,
      diskWritten,
      diskError,
      title: parsed.doc.frontmatter.title || null,
      indexedAt,
    };
  }

  return { getTree, getRootCandidates, getActiveRoots, getDoc, refresh, addRoot, removeRoot, browse, detectDrift, syncImport, syncRestore, syncMany, updateDoc };
}

export function createApp(commandRunner = executeBridgeCommand) {
  const app = express();
  runtimeServicesCron.start();
  const kbStore = createKbStore({ repoRoot });
  const systemSnapshotStore = createSystemSnapshotStore({
    ttlMs: SYSTEM_SNAPSHOT_TTL_MS,
    collectSnapshot: async (storeOptions) => {
      const snap = await collectSystemSnapshot(commandRunner, storeOptions);
      // Invalidate KB cache only on explicit manual refresh (Sync Signals
      // button). The 15s background tick and the startup warm must NOT
      // re-walk the whole project — kbStore is lazy on first read anyway.
      const reason = storeOptions?.reason || 'unknown';
      if (reason === 'manual-refresh') {
        setImmediate(() => { try { kbStore.refresh(`system-snapshot:${reason}`); } catch {} });
      }
      return snap;
    },
    buildPendingSnapshot: () => ({
      ok: false,
      metadata: {
        snapshotVersion: 1,
        generatedAt: null,
        staleAt: null,
        ttlMs: SYSTEM_SNAPSHOT_TTL_MS,
        reloadRecommended: true,
        reloadReasons: ['snapshot-pending'],
        fingerprint: 'pending',
        branchName: null,
        focusIntentId: null,
        activeIntentId: null,
        workingTreeDirty: null,
      },
      version: {
        ok: false,
        stdout: null,
        version: null,
      },
      status: {
        ok: false,
        exitCode: null,
        parsed: null,
        stderr: 'pending',
      },
      workspace: {
        ok: false,
        summary: null,
        currentFocus: null,
        stderr: 'pending',
      },
      sessionContext: {
        ok: false,
        summary: null,
        stderr: 'pending',
      },
      runtimeServices: {
        ok: false,
        summary: summarizeRuntimeServices([]),
        refreshedAt: null,
        nextRunAt: null,
        intervalMs: null,
        schedules: [],
        reason: 'pending',
        lastError: null,
      },
      rulesCatalog: {
        ok: false,
        parsed: {
          rules: [],
          packs: [],
          precedence: [],
        },
        stderr: 'pending',
      },
      rulesSummary: {
        ok: false,
        summary: summarizeRulesResult({ ok: false, parsed: { rules: [], packs: [], precedence: [] } }, { ok: false, parsed: { violations: [], rulesRun: null } }),
        errors: {
          list: 'pending',
          lint: 'pending',
        },
      },
      system: {
        ok: false,
        summary: {
          result: 'PENDING',
          nodeVersion: process.versions.node,
          workspaceRoot: repoRoot,
          checkSummary: {
            pass: 0,
            warn: 0,
            error: 0,
            info: 0,
          },
        },
        error: 'pending',
      },
      homeSummary: {
        ok: false,
        summary: null,
        errors: {
          status: 'pending',
          rulesList: 'pending',
          rulesLint: 'pending',
          doctor: 'pending',
          runtime: null,
        },
      },
      gates: {
        ok: false,
        phase: 'phase-2-cli-bridge',
        checkedAt: null,
        summary: {
          blocked: true,
          readyCount: 0,
          blockedCount: 0,
          attentionCount: 0,
        },
        items: [],
        readiness: 'pending',
      },
      diagnostics: {
        doctor: { ok: false, parsed: null, stderr: 'pending' },
        chaos: { ok: false, parsed: null, stderr: 'pending' },
        phase2Bridge: {
          ok: false,
          phase: 'phase-2-cli-bridge',
          checkedAt: null,
          summary: {
            blocked: true,
            readyCount: 0,
            blockedCount: 0,
            attentionCount: 0,
          },
          gates: [],
          commands: {},
        },
      },
    }),
  });
  systemSnapshotStore.start({ warm: true, intervalMs: SYSTEM_SNAPSHOT_TTL_MS });

  // Middleware
  app.use(express.json());

  // Graph API routes (Phase 5.3b: on-demand generation from Knowledge Graph)
  app.use('/api/graph', createGraphApiRouter());

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
    res.status(200).json(systemSnapshotStore.read().status);
  });

  app.get('/api/runtime-services', async (_req, res) => {
    const snapshot = await runtimeServicesCron.read('api-runtime-services');
    res.status(200).json({
      ok: !snapshot.lastError,
      summary: snapshot.summary,
      refreshedAt: snapshot.refreshedAt,
      nextRunAt: snapshot.nextRunAt,
      intervalMs: snapshot.intervalMs,
      schedules: snapshot.schedules,
      reason: snapshot.reason,
      lastError: snapshot.lastError,
    });
  });

  app.post('/api/runtime-services/:id/ensure', async (req, res) => {
    const result = await ensureRuntimeService(req.params.id);
    if (!result.ok) {
      return res.status(400).json(result);
    }

    await runtimeServicesCron.read('ensure');

    return res.status(200).json(result);
  });

  // Helper function to list intents with priority from filesystem
  function listIntentsWithPriority() {
    return collectIntentsWithPriority();
  }

  // Helper function to flatten goals tree for comparison (Phase 6 Track B)
  function flattenGoalsTree(node, result = []) {
    if (!node) return result;
    result.push({
      _key: node.entityId,
      id: node.entityId,
      title: node.label,
      name: node.label,
      status: node.runtimeState,
    });
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => flattenGoalsTree(child, result));
    }
    return result;
  }

  app.get('/api/rules', async (_req, res) => {
    res.status(200).json(systemSnapshotStore.read().rulesCatalog);
  });

  app.get('/api/rules-summary', async (_req, res) => {
    res.status(200).json(
      systemSnapshotStore.read().rulesSummary ?? {
        ok: false,
        summary: {
          ok: false,
          count: 0,
          hardCount: 0,
          masterCount: 0,
          softCount: 0,
          packCount: 0,
          linted: null,
          violationCount: 0,
          errorCount: 0,
          warnCount: 0,
          rules: [],
          packs: [],
          precedence: [],
          violations: [],
          topRules: [],
          topViolations: [],
        },
        errors: {
          list: 'pending',
          lint: 'deferred',
        },
      }
    );
  });

  app.get('/api/tools-registry', async (_req, res) => {
    res.status(200).json({
      ok: true,
      tools: listTools(),
      summary: summarizeTools(),
    });
  });

  app.get('/api/svfactory/official-backlog/status', async (_req, res) => {
    try {
      res.status(200).json(buildOfficialBacklogStatus(repoRoot));
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post('/api/svfactory/official-backlog/reset-seed', async (req, res) => {
    try {
      const confirmed = req.body?.confirmed === true;
      if (!confirmed) {
        res.status(400).json({
          ok: false,
          error: 'Official backlog reset requires confirmed=true.',
        });
        return;
      }

      const result = await runOfficialBacklogResetAndSeed(repoRoot, {
        confirmed: true,
        backupTag: req.body?.backup_tag,
      });

      res.status(200).json({
        ok: true,
        result,
        tree: buildGoalsTreeSnapshot(),
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/api/intents', async (_req, res) => {
    try {
      const data = listIntentsWithPriority();
      res.status(200).json({
        ok: data.ok,
        parsed: {
          count: data.intents.length,
          intents: data.intents,
        },
        command: 'kbx intent list (with priority)',
        exitCode: 0,
        stdout: '',
        stderr: '',
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        parsed: null,
        command: 'kbx intent list',
        exitCode: 1,
        stdout: '',
        stderr: String(error),
      });
    }
  });

  app.get('/api/intents/context', async (req, res) => {
    try {
      const intentsPayload = listIntentsWithPriority();
      const intents = Array.isArray(intentsPayload?.intents) ? intentsPayload.intents : [];
      const session = summarizeSessionContext({
        parsed: {
          activeIntents: {
            intents: intents.filter((intent) => normalizeLifecycle(intent.lifecycle) === 'active'),
          },
        },
      });
      const focusIntentId = normalizeIntentId(session.focusState?.current_focus?.intent_id ?? session.checkpointIntentId ?? null);
      const activeIntentId = session.activeIntentIds.length === 1
        ? session.activeIntentIds[0]
        : normalizeIntentId(session.sessionIntentId ?? null);
      const selectedIntentId = typeof req.query.id === 'string' && req.query.kind === 'intent'
        ? normalizeIntentId(req.query.id)
        : null;
      const graphTree = buildGoalsTreeSnapshot();
      const officialBacklogStatus = buildOfficialBacklogStatus(repoRoot);
      const detailsByIntent = new Map(
        intents.map((intent) => [
          intent.id,
          summarizeIntentDetail(intent.id, { includeGit: false }),
        ]),
      );
      const contextQuery = {
        id: String(req.query.id || '').trim() || 'workspace',
        kind: typeof req.query.kind === 'string' && req.query.kind.trim()
          ? String(req.query.kind).trim()
          : (selectedIntentId ? 'intent' : 'workspace'),
        depth: Number.isFinite(Number(req.query.depth)) ? Math.max(0, Math.min(3, Number(req.query.depth))) : 1,
        mode: ['focus', 'alignment', 'full'].includes(String(req.query.mode || '').trim())
          ? String(req.query.mode).trim()
          : 'alignment',
        include_tasks: req.query.include_tasks === 'false' ? false : true,
        include_unlinked: req.query.include_unlinked === 'false' ? false : true,
      };

      let graph = null;
      try {
        const goalsState = readGoalsState({ workspaceRoot: repoRoot });
        const graphDb = await connectKnowledgeGraph();
        const projectionFingerprint = buildIntentContextProjectionFingerprint({
          intents,
          goalsState,
          releaseLines: officialBacklogStatus.releaseLines ?? [],
        });
        const now = Date.now();
        const projection = buildIntentGraphProjection({
          intents,
          goalsState,
          officialReleaseLines: officialBacklogStatus.releaseLines ?? [],
        });
        const shouldSyncProjection =
          projectionFingerprint !== lastIntentContextProjectionFingerprint ||
          now - lastIntentContextSyncAt > INTENT_CONTEXT_SYNC_TTL_MS;

        if (shouldSyncProjection) {
          await synchronizeIntentContextGraph(graphDb, projection);
          lastIntentContextProjectionFingerprint = projectionFingerprint;
          lastIntentContextSyncAt = now;
        }
        graph = await fetchIntentContextFromGraph(graphDb, {
          id: contextQuery.id,
          kind: contextQuery.kind,
          depth: contextQuery.depth,
          mode: contextQuery.mode,
          includeTasks: contextQuery.include_tasks,
          includeUnlinked: contextQuery.include_unlinked,
          detailsByIntent,
          focusIntentId,
          activeIntentId,
        });
      } catch (_graphError) {
        graph = null;
      }

      if (!graph) {
        graph = buildIntentContextExplorer({
          query: contextQuery,
          intents,
          goalsTree: graphTree.root ?? null,
          goalsSummary: graphTree.summary ?? null,
          focusIntentId,
          activeIntentId,
          selectedIntentId,
          detailsByIntent,
          officialReleaseLines: officialBacklogStatus.releaseLines ?? [],
        });
      }

      res.status(200).json(graph);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/api/goals/tree', async (_req, res) => {
    try {
      res.status(200).json(buildGoalsTreeSnapshot());
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/api/goals', async (_req, res) => {
    try {
      const tree = buildGoalsTreeSnapshot();

      // Phase 6 Track B: Dual-read validation
      // Compare graph-based (tree) with file-based (goals.state.json)
      const graphGoals = Array.isArray(tree) ? tree : tree.root ? flattenGoalsTree(tree.root) : [];
      const validation = await syncValidator.compareGoals(graphGoals);

      // Log any discrepancies for monitoring
      if (!validation.match && validation.differences.length > 0) {
        validation.differences.forEach(diff => {
          syncValidator.logDiscrepancy('goals_mismatch', { detail: diff, timestamp: new Date().toISOString() });
        });
      }

      res.status(200).json({
        ok: true,
        goals: tree,
        timestamp: new Date().toISOString(),
        // Phase 6 Track B: Include validation metadata
        validation: {
          match: validation.match,
          file_count: validation.count_file,
          graph_count: validation.count_graph,
          discrepancy_count: validation.differences.length,
          discrepancies: validation.match ? [] : validation.differences.slice(0, 5), // First 5 only
        },
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post('/api/goals', async (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const payload = {
        entity_level: String(body.entity_level || '').trim(),
        entity_id: String(body.entity_id || '').trim(),
        parent_goal_id: body.parent_goal_id ? String(body.parent_goal_id).trim() : null,
        title: String(body.title || '').trim(),
        description: body.description == null ? '' : String(body.description).trim(),
        state: String(body.state || 'active').trim() || 'active',
      };

      if (!payload.entity_level || !payload.entity_id || !payload.title) {
        res.status(400).json({ ok: false, error: 'entity_level, entity_id, and title are required.' });
        return;
      }

      if (payload.parent_goal_id) {
        const goalsState = readGoalsState({ workspaceRoot: repoRoot });
        const parent = Array.isArray(goalsState.goals)
          ? goalsState.goals.find((goal) => goal.id === payload.parent_goal_id)
          : null;
        if (!parent) {
          res.status(400).json({ ok: false, error: `Parent goal not found: ${payload.parent_goal_id}` });
          return;
        }
        const expectedLevel = expectedParentLevel(payload.entity_level);
        if (expectedLevel && parent.entity_level !== expectedLevel) {
          res.status(400).json({
            ok: false,
            error: `A ${payload.entity_level} goal must link to a ${expectedLevel} goal.`,
          });
          return;
        }
      }

      const goal = createGoal({ workspaceRoot: repoRoot, goal: payload });
      const goalsState = readGoalsState({ workspaceRoot: repoRoot });
      if (payload.entity_level === 'intent') {
        syncLegacyIntentGoalText(payload.entity_id, goalsState);
      }
      res.status(200).json({
        ok: true,
        goal,
        tree: buildGoalsTreeSnapshot(),
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.patch('/api/goals/:goalId', async (req, res) => {
    try {
      const goalId = String(req.params.goalId || '').trim();
      if (!goalId) {
        res.status(400).json({ ok: false, error: 'goalId required' });
        return;
      }

      const patch = req.body && typeof req.body === 'object' ? req.body : {};
      const goalsState = readGoalsState({ workspaceRoot: repoRoot });
      const current = Array.isArray(goalsState.goals) ? goalsState.goals.find((goal) => goal.id === goalId) : null;
      if (!current) {
        res.status(404).json({ ok: false, error: `Goal not found: ${goalId}` });
        return;
      }

      const parentGoalId = Object.prototype.hasOwnProperty.call(patch, 'parent_goal_id')
        ? (patch.parent_goal_id ? String(patch.parent_goal_id).trim() : null)
        : current.parent_goal_id;

      if (parentGoalId) {
        const parent = goalsState.goals.find((goal) => goal.id === parentGoalId);
        if (!parent) {
          res.status(400).json({ ok: false, error: `Parent goal not found: ${parentGoalId}` });
          return;
        }
        const expectedLevel = expectedParentLevel(current.entity_level);
        if (expectedLevel && parent.entity_level !== expectedLevel) {
          res.status(400).json({
            ok: false,
            error: `A ${current.entity_level} goal must link to a ${expectedLevel} goal.`,
          });
          return;
        }
      }

      const goal = updateGoal({
        workspaceRoot: repoRoot,
        goalId,
        patch: {
          title: Object.prototype.hasOwnProperty.call(patch, 'title') ? String(patch.title || '').trim() : current.title,
          description: Object.prototype.hasOwnProperty.call(patch, 'description') ? String(patch.description || '').trim() : current.description,
          state: Object.prototype.hasOwnProperty.call(patch, 'state') ? String(patch.state || '').trim() : current.state,
          parent_goal_id: parentGoalId,
        },
      });

      const nextGoalsState = readGoalsState({ workspaceRoot: repoRoot });
      if (current.entity_level === 'intent') {
        syncLegacyIntentGoalText(current.entity_id, nextGoalsState);
      }
      res.status(200).json({
        ok: true,
        goal,
        tree: buildGoalsTreeSnapshot(),
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.delete('/api/goals/:goalId', async (req, res) => {
    try {
      const goalId = String(req.params.goalId || '').trim();
      if (!goalId) {
        res.status(400).json({ ok: false, error: 'goalId required' });
        return;
      }

      const goalsState = readGoalsState({ workspaceRoot: repoRoot });
      const current = Array.isArray(goalsState.goals) ? goalsState.goals.find((goal) => goal.id === goalId) : null;
      if (!current) {
        res.status(404).json({ ok: false, error: `Goal not found: ${goalId}` });
        return;
      }

      const deleted = deleteGoal({ workspaceRoot: repoRoot, goalId });
      const nextGoalsState = readGoalsState({ workspaceRoot: repoRoot });
      if (current.entity_level === 'intent') {
        syncLegacyIntentGoalText(current.entity_id, nextGoalsState);
      }
      res.status(200).json({
        ok: true,
        deleted,
        tree: buildGoalsTreeSnapshot(),
      });
    } catch (error) {
      const code = error && typeof error === 'object' ? error.code : null;
      res.status(code === 'GOAL_HAS_CHILDREN' ? 409 : 500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ============================================================================
  // Phase 6 Track B: Goals Sync Validation Monitoring
  // ============================================================================

  // GET /api/goals/sync-status — Check sync between file and graph sources (Phase 6 Track B)
  app.get('/api/goals/sync-status', async (req, res) => {
    try {
      const fileGoals = syncValidator.loadGoalsFromFile();
      const tree = buildGoalsTreeSnapshot();
      const graphGoals = Array.isArray(tree) ? tree : tree.root ? flattenGoalsTree(tree.root) : [];
      const validation = await syncValidator.compareGoals(graphGoals);

      // Phase 6 Track B: Full validation report for monitoring
      res.status(200).json({
        ok: true,
        phase: 'Phase 6 Track B - Dual-Read Validation',
        sync_status: validation.match ? 'synced' : 'drift-detected',
        file_count: validation.count_file,
        graph_count: validation.count_graph,
        discrepancy_count: validation.differences.length,
        status: validation.match ? 'clean' : 'needs-review',
        last_validation: syncValidator.lastValidation,
        recent_discrepancies: validation.differences.slice(0, 10),
        all_discrepancies: validation.differences,
        monitoring: {
          period_days: 7,
          next_decision_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          criteria: 'Archive goals.state.json when discrepancy_count = 0 for 7 consecutive days',
        },
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // GET /api/graph/cache/stats — Cache hit rate and metrics (Phase 6 Track B)
  app.get('/api/graph/cache/stats', async (_req, res) => {
    try {
      const metrics = metricsCollector.getMetrics();
      res.status(200).json({
        ok: true,
        cache_stats: metrics.cacheStats,
        period_ms: metrics.duration_ms,
        operations_tracked: Object.keys(metrics.operations).length,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/api/intents/:id/detail', async (req, res) => {
    const intentId = String(req.params.id || '').trim();
    if (!intentId) {
      res.status(400).json({ ok: false, error: 'Intent id required' });
      return;
    }

    try {
      const detail = summarizeIntentDetail(intentId, { includeGit: false });
      if (!detail) {
        res.status(404).json({ ok: false, error: `Intent not found: ${intentId}` });
        return;
      }

      res.status(200).json({ ok: true, detail });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/api/intents/:id/evidence', async (req, res) => {
    const intentId = String(req.params.id || '').trim();
    if (!intentId) {
      res.status(400).json({ ok: false, error: 'Intent id required' });
      return;
    }

    try {
      const detail = summarizeIntentDetail(intentId, { includeGit: true });
      if (!detail) {
        res.status(404).json({ ok: false, error: `Intent not found: ${intentId}` });
        return;
      }

      res.status(200).json({ ok: true, detail });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/api/workspace', async (_req, res) => {
    res.status(200).json(systemSnapshotStore.read().workspace);
  });

  app.get('/api/session-context', async (_req, res) => {
    res.status(200).json(systemSnapshotStore.read().sessionContext);
  });

  app.get('/api/focus-state', async (_req, res) => {
    try {
      const branchName = readCurrentBranchName();
      const state = readFocusState({ workspaceRoot: repoRoot, branchName });
      res.status(200).json({
        ok: true,
        state,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post('/api/focus-state', express.json(), async (req, res) => {
    try {
      const branchName = readCurrentBranchName();
      const nextState = writeFocusState({
        workspaceRoot: repoRoot,
        branchName,
        state: req.body && typeof req.body === 'object' ? req.body : {},
        syncMarkdown: true,
      });
      res.status(200).json({
        ok: true,
        state: nextState,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/api/system', async (_req, res) => {
    res.status(200).json(systemSnapshotStore.read().system);
  });

  app.get('/api/system/ai-settings', async (_req, res) => {
    try {
      const settings = readAiSettings(repoRoot);
      res.status(200).json({
        ok: true,
        settings: {
          schema_version: settings.schema_version,
          provider: settings.provider,
          ui_language: settings.ui_language,
          model: settings.model,
          endpoint: settings.endpoint,
          system_prompt: settings.system_prompt,
          planning_harness_prompt: settings.planning_harness_prompt,
          app_primary_goals: settings.app_primary_goals,
          app_description: settings.app_description,
          has_api_key: settings.has_api_key,
          api_key_masked: settings.api_key_masked,
          updated_at: settings.updated_at,
        },
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post('/api/system/ai-settings', express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const settings = updateAiSettings(repoRoot, req.body || {});
      res.status(200).json({
        ok: true,
        settings: {
          schema_version: settings.schema_version,
          provider: settings.provider,
          ui_language: settings.ui_language,
          model: settings.model,
          endpoint: settings.endpoint,
          system_prompt: settings.system_prompt,
          planning_harness_prompt: settings.planning_harness_prompt,
          app_primary_goals: settings.app_primary_goals,
          app_description: settings.app_description,
          has_api_key: settings.has_api_key,
          api_key_masked: settings.api_key_masked,
          updated_at: settings.updated_at,
        },
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post('/api/system/ai-settings/ping', async (_req, res) => {
    try {
      const result = await pingAiSettings(repoRoot);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/api/home-summary', async (_req, res) => {
    res.status(200).json(systemSnapshotStore.read().homeSummary);
  });

  app.get('/api/gates', async (_req, res) => {
    res.status(200).json(systemSnapshotStore.read().gates);
  });

  app.get('/api/system-snapshot', async (_req, res) => {
    res.status(200).json(systemSnapshotStore.read());
  });

  app.post('/api/system-snapshot/refresh', async (_req, res) => {
    const snapshot = await systemSnapshotStore.refresh({ reason: 'manual-refresh' });
    res.status(200).json(snapshot);
  });

  app.get('/api/documents', async (req, res) => {
    try {
      const workspace = buildDocumentsWorkspace(req.query.path);
      res.status(200).json({
        ok: true,
        ...workspace,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'documents query failed',
      });
    }
  });

  app.get('/api/phase2-bridge', async (_req, res) => {
    res.status(200).json(systemSnapshotStore.read().diagnostics.phase2Bridge);
  });

  // ═══ KB ENDPOINTS (slice A — read-only, snapshot-backed) ═══
  // Contract: notes/kbx-ui-kb-page-runtime-contract.md
  // These endpoints never invoke kbx/git/doctor/rules/chaos. They read from
  // kbStore (L3) which parses the filesystem lazily on first hit and caches
  // until the next refresh.

  app.get('/api/kb/tree', (_req, res) => {
    try {
      res.status(200).json({ ok: true, ...kbStore.getTree() });
    } catch (error) {
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'kb tree failed' });
    }
  });

  app.get('/api/kb/roots', (_req, res) => {
    try {
      res.status(200).json({
        ok: true,
        rootCandidates: kbStore.getRootCandidates(),
        activeRoots: kbStore.getActiveRoots(),
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'kb roots failed' });
    }
  });

  app.post('/api/kb/roots', express.json(), (req, res) => {
    const result = kbStore.addRoot(req.body?.path);
    if (!result.ok) { res.status(400).json(result); return; }
    // Don't include rootCandidates: that would force a synchronous tree
    // rebuild on the POST path. Client refetches tree+roots via its own
    // invalidateQueries — see useAddKbRoot.
    res.status(200).json(result);
  });

  app.delete('/api/kb/roots/:path(*)', (req, res) => {
    const result = kbStore.removeRoot(req.params.path);
    if (!result.ok) { res.status(400).json(result); return; }
    res.status(200).json(result);
  });

  app.get('/api/kb/doc', (req, res) => {
    const requested = typeof req.query.path === 'string' ? req.query.path : '';
    const doc = kbStore.getDoc(requested);
    if (!doc) {
      res.status(404).json({ ok: false, error: 'document not found or path rejected', path: requested });
      return;
    }
    res.status(200).json({ ok: true, ...doc });
  });

  // Slice C-4: DB-first edit. Body { path, body, expectedHash? }. The DB
  // row is UPSERTed before the disk write so the DB always reflects user
  // intent. If the disk write fails, the response carries diskWritten:false
  // and the UI can prompt the user (typically: open DriftPanel to retry).
  app.put('/api/kb/doc', express.json({ limit: '4mb' }), (req, res) => {
    const result = kbStore.updateDoc(req.body || {});
    if (!result.ok && result.conflict) { res.status(409).json(result); return; }
    if (!result.ok) { res.status(400).json(result); return; }
    res.status(200).json(result);
  });

  app.get('/api/kb/impact', (req, res) => {
    const requested = typeof req.query.path === 'string' ? req.query.path : '';
    const impactPath = path.join(repoRoot, 'knowledge-base', '.kb', 'impact.json');
    let impactGeneratedAt = null;
    let edges = { incoming_strong: [], incoming_weak: [], outgoing_strong: [], outgoing_weak: [] };
    try {
      if (fs.existsSync(impactPath)) {
        const data = JSON.parse(fs.readFileSync(impactPath, 'utf8'));
        impactGeneratedAt = data?.generatedAt || null;
        // impact.json shape varies; accept multiple known shapes gracefully.
        const node = data?.nodes?.[requested] || data?.[requested] || null;
        if (node && typeof node === 'object') {
          edges = {
            incoming_strong: Array.isArray(node.incoming_strong) ? node.incoming_strong : [],
            incoming_weak:   Array.isArray(node.incoming_weak)   ? node.incoming_weak   : [],
            outgoing_strong: Array.isArray(node.outgoing_strong) ? node.outgoing_strong : [],
            outgoing_weak:   Array.isArray(node.outgoing_weak)   ? node.outgoing_weak   : [],
          };
        }
      }
    } catch {}
    const affectedCount = edges.incoming_strong.length + edges.outgoing_strong.length;
    res.status(200).json({ ok: true, path: requested, ...edges, affectedCount, impactGeneratedAt });
  });

  app.post('/api/kb/refresh', express.json(), (req, res) => {
    const targetPath = typeof req.body?.path === 'string' ? req.body.path : null;
    const result = kbStore.refresh('manual', targetPath);
    res.status(200).json({ ok: true, generatedAt: result.generatedAt, reason: result.reason });
  });

  // Resolve drift per path. Body accepts either { path } or { paths: [] }.
  //   POST /api/kb/sync/import    — accept disk into DB
  //   POST /api/kb/sync/restore   — overwrite disk from DB
  function readPathsFromBody(body) {
    if (!body) return [];
    if (Array.isArray(body.paths)) return body.paths.filter((p) => typeof p === 'string' && p.length > 0);
    if (typeof body.path === 'string' && body.path.length > 0) return [body.path];
    return [];
  }
  app.post('/api/kb/sync/import', express.json(), (req, res) => {
    const paths = readPathsFromBody(req.body);
    if (paths.length === 0) { res.status(400).json({ ok: false, error: 'paths required' }); return; }
    const results = kbStore.syncMany('import', paths);
    const ok = results.every((r) => r.ok);
    res.status(ok ? 200 : 207).json({ ok, results });
  });
  app.post('/api/kb/sync/restore', express.json(), (req, res) => {
    const paths = readPathsFromBody(req.body);
    if (paths.length === 0) { res.status(400).json({ ok: false, error: 'paths required' }); return; }
    const results = kbStore.syncMany('restore', paths);
    const ok = results.every((r) => r.ok);
    res.status(ok ? 200 : 207).json({ ok, results });
  });

  app.get('/api/kb/drift', (req, res) => {
    const filterRoot = typeof req.query.root === 'string' && req.query.root ? req.query.root : null;
    try {
      const entries = kbStore.detectDrift(filterRoot);
      const summary = {
        total: entries.length,
        diskOnly:    entries.filter((e) => e.state === 'disk-only').length,
        dbOnly:      entries.filter((e) => e.state === 'db-only').length,
        contentDiff: entries.filter((e) => e.state === 'content-diff').length,
      };
      res.status(200).json({ ok: true, generatedAt: new Date().toISOString(), summary, entries });
    } catch (error) {
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'drift detection failed' });
    }
  });

  // Dumb file-tree browser. Lists immediate child directories of `path`,
  // skipping obvious junk dirs. No content probing — user picks, server
  // imports, user waits.
  app.get('/api/kb/browse', (req, res) => {
    const requested = typeof req.query.path === 'string' ? req.query.path : '';
    const result = kbStore.browse(requested);
    if (!result.ok) { res.status(400).json(result); return; }
    res.status(200).json(result);
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
    const draftSlug = sanitizeDraftSlug(requestedIntentId || title);
    if (!draftSlug || draftSlug.length < 3) {
      return res.status(400).json({
        ok: false,
        error: 'Draft slug required (min 3 characters after normalization)',
      });
    }

    const args = [
      'intent', 'draft',
      draftSlug,
      '--title', String(title).trim(),
      ...(focus ? ['--focus', String(focus).trim()] : []),
      ...(next_action ? ['--next-action', String(next_action).trim()] : []),
      ...(decision_summary ? ['--decision-summary', String(decision_summary).trim()] : []),
      '--json'
    ];

    const result = await commandRunner('kbx intent draft --json', args, {
      expectJson: true,
      timeoutMs: 15000,
    });

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        error: 'Create draft intent failed',
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
        { timestamp: new Date().toISOString(), step: 'create_draft_intent', status: 'pass' },
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

    if (Object.prototype.hasOwnProperty.call(fields, 'title')) {
      args.push('--title', String(fields.title ?? '').trim());
      updateFields.push('title');
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'focus')) {
      args.push('--focus', String(fields.focus ?? '').trim());
      updateFields.push('focus');
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'next_action')) {
      args.push('--next-action', String(fields.next_action ?? '').trim());
      updateFields.push('next_action');
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'decision_summary')) {
      args.push('--decision-summary', String(fields.decision_summary ?? '').trim());
      updateFields.push('decision_summary');
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'goal_text')) {
      args.push('--goal', String(fields.goal_text ?? '').trim());
      updateFields.push('goal_text');
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'close_condition')) {
      args.push('--close-condition', String(fields.close_condition ?? '').trim());
      updateFields.push('close_condition');
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'state')) {
      args.push('--state', String(fields.state ?? '').trim());
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
  // Global error logging
  process.on('uncaughtException', (error) => {
    console.error('[bridge] UNCAUGHT EXCEPTION:', error.message);
    console.error(error.stack);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[bridge] UNHANDLED REJECTION:', reason?.message || reason);
    if (reason?.stack) console.error(reason.stack);
  });

  app.listen(port, () => {
    console.log(`kbx-ui bridge listening on http://${uiHost}:${port}`);
  });
}
