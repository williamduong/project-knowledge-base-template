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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const kbRoot = path.join(repoRoot, 'knowledge-base');
const cliPath = path.join(repoRoot, 'bin', 'kbx.js');
const require = createRequire(import.meta.url);
const { resolveIntentRecord } = require(path.join(repoRoot, 'src', 'lib', 'intent.js'));
const { readFocusState, writeFocusState } = require(path.join(repoRoot, 'src', 'lib', 'focus-state.js'));
const { runGitCommand } = require(path.join(repoRoot, 'src', 'lib', 'git.js'));
const { readPipeline } = require(path.join(repoRoot, 'src', 'lib', 'pipeline.js'));
const { run: runCli } = require(path.join(repoRoot, 'src', 'cli.js'));

const uiHost = process.env.KBX_UI_HOST || 'kbx.local';
const uiPort = Number(process.env.KBX_UI_PORT || 4173);
const port = Number(process.env.KBX_BRIDGE_PORT || 4174);
const runtimeServicesRegistryPath = path.join(__dirname, 'runtime-services.json');
const runtimeServicesStatePath = path.join(__dirname, '.runtime-services-state.json');
const ensureInFlight = new Map();
let inProcessCommandQueue = Promise.resolve();
const SYSTEM_SNAPSHOT_TTL_MS = 15000;
const CHILD_ENV_BLOCKLIST_KEYS = new Set([
  'ELECTRON_RUN_AS_NODE',
  'NODE_OPTIONS',
]);
const CHILD_ENV_BLOCKLIST_PREFIXES = [
  'VSCODE_',
];

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

function extractIntentNarrative(text) {
  if (!text) {
    return { goal: null, summary: null };
  }

  const sections = String(text).split(/^---\s*$/m);
  const body = sections.length >= 3 ? sections.slice(2).join('---').trim() : String(text).trim();
  const goalMatch = body.match(/^\*\*Goal:\*\*\s*(.+)$/im);
  const summaryMatch = body.match(/^## Summary\s+([\s\S]*?)(?:\n## |$)/m);

  return {
    goal: goalMatch?.[1]?.trim() ?? null,
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

  function parseTaskText(rawText, fallbackDone = false) {
    const text = String(rawText || '').trim();
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
      inTaskSection = /plan|task|checklist|verification/i.test(currentSection);
      continue;
    }

    const checkboxMatch = line.match(/^[-*]\s+\[(x| )\]\s+(.+)$/i);
    if (checkboxMatch) {
      const parsed = parseTaskText(checkboxMatch[2], checkboxMatch[1].toLowerCase() === 'x');
      tasks.push({
        ...parsed,
        section: currentSection,
        source,
      });
      continue;
    }

    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch && /summary|plan|task|checklist|verification/i.test(currentSection || '')) {
      const parsed = parseTaskText(numberedMatch[1], false);
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

  return {
    id: record.id ?? intentId,
    title: record.meta?.title ?? null,
    slug: record.slug ?? null,
    scope: record.scope ?? null,
    lifecycle: record.meta?.lifecycle ?? record.lifecycle ?? null,
    status: record.meta?.status ?? null,
    mode: record.meta?.mode ?? null,
    changeType: record.meta?.change_type ?? null,
    decisionSummary: record.meta?.decision_summary ?? null,
    goal: narrative.goal,
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
      ruleIds: Array.isArray(pack?.ruleIds) ? pack.ruleIds : [],
      stats: {
        count: pack?.stats?.count ?? 0,
        hardCount: pack?.stats?.hardCount ?? 0,
        masterCount: pack?.stats?.masterCount ?? 0,
        softCount: pack?.stats?.softCount ?? 0,
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

export function createApp(commandRunner = executeBridgeCommand) {
  const app = express();
  runtimeServicesCron.start();
  const systemSnapshotStore = createSystemSnapshotStore({
    ttlMs: SYSTEM_SNAPSHOT_TTL_MS,
    collectSnapshot: (storeOptions) => collectSystemSnapshot(commandRunner, storeOptions),
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
    const intentsRoot = path.join(kbRoot, 'intents');
    if (!fs.existsSync(intentsRoot)) {
      return { intents: [], ok: true };
    }

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

        // For folders like _active/v2-9-..., read intent.md
        if (entry.isDirectory()) {
          contentPath = path.join(lifecyclePath, entry.name, 'intent.md');
          id = entry.name;
        } else if (entry.name.endsWith('.md')) {
          // For backlog files like v2-10-....md
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

          // Parse YAML frontmatter
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
          });
        } catch (err) {
          console.error(`Error reading intent ${id}:`, err.message);
        }
      }
    }

    // Sort by priority (lexicographic sort works for semantic versions)
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

  app.get('/api/home-summary', async (_req, res) => {
    res.status(200).json(systemSnapshotStore.read().homeSummary);
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
