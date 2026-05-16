'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function parseArgs(args = []) {
  const options = {
    json: false,
    include: [],
  };
  let subcommand = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--include' && args[index + 1]) {
      options.include.push(args[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith('--include=')) {
      options.include.push(arg.slice('--include='.length));
      continue;
    }
    if (!subcommand && !arg.startsWith('-')) {
      subcommand = arg;
      continue;
    }
    throw new Error(`Unknown ui option "${arg}".`);
  }

  return { subcommand, options };
}

function emit(result, options) {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (!result.ok) {
    console.error(`kbx ui start: ${result.error}`);
    if (result.details) {
      console.error(result.details);
    }
    return;
  }

  console.log(`UI runtime OK — ${result.summary.healthyCount}/${result.summary.registeredCount} services healthy.`);
  for (const service of result.summary.services) {
    const status = service.healthy ? 'healthy' : service.running ? 'degraded' : 'offline';
    const location = service.port ? `http://${service.host}:${service.port}` : service.host;
    console.log(`  ${service.id}  [${status}]  ${location}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function resolveUiRuntimeRoot(cwd) {
  const candidates = [
    path.resolve(cwd),
    path.resolve(__dirname, '..', '..'),
  ];

  for (const candidate of candidates) {
    const bridgePath = path.join(candidate, 'site', 'kbx-ui', 'server.mjs');
    const registryPath = path.join(candidate, 'site', 'kbx-ui', 'runtime-services.json');
    if (fs.existsSync(bridgePath) && fs.existsSync(registryPath)) {
      return {
        workspaceRoot: candidate,
        bridgePath,
        registryPath,
      };
    }
  }

  return null;
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return { ok: response.ok, status: response.status, parsed, text };
}

async function getRuntimeSnapshot(baseUrl) {
  return fetchJson(`${baseUrl}/api/runtime-services`, { method: 'GET' });
}

async function ensureRuntimeService(baseUrl, serviceId) {
  return fetchJson(`${baseUrl}/api/runtime-services/${encodeURIComponent(serviceId)}/ensure`, { method: 'POST' });
}

async function ensureBridge(runtimeRoot) {
  const baseUrl = 'http://127.0.0.1:4174';
  const snapshot = await getRuntimeSnapshot(baseUrl).catch(() => null);
  if (snapshot && snapshot.ok) {
    return { ok: true, action: 'already-running', baseUrl };
  }

  const child = spawn(process.execPath, [runtimeRoot.bridgePath], {
    cwd: path.dirname(runtimeRoot.bridgePath),
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env },
  });
  child.unref();

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await sleep(250);
    const next = await getRuntimeSnapshot(baseUrl).catch(() => null);
    if (next && next.ok) {
      return { ok: true, action: 'started', baseUrl, pid: child.pid ?? null };
    }
  }

  return {
    ok: false,
    error: 'bridge_unhealthy_after_start',
    details: `Bridge did not become reachable after starting ${runtimeRoot.bridgePath}`,
  };
}

function collectRequiredServiceIds(registry, options) {
  const services = Array.isArray(registry?.services) ? registry.services : [];
  const required = new Set(['bridge']);
  for (const service of services) {
    if (!service || !service.id) continue;
    if (service.id === 'uiv2') required.add(service.id);
    if (service.autoStart === true) required.add(service.id);
  }
  for (const serviceId of options.include || []) {
    if (serviceId) required.add(serviceId);
  }
  return services.map((service) => service.id).filter((serviceId) => required.has(serviceId));
}

async function startUiRuntime({ cwd, options }) {
  const runtimeRoot = resolveUiRuntimeRoot(cwd);
  if (!runtimeRoot) {
    return {
      ok: false,
      error: 'ui_runtime_not_available',
      details: 'Expected site/kbx-ui/server.mjs and site/kbx-ui/runtime-services.json in the current workspace or package root.',
    };
  }

  const registry = tryReadJson(runtimeRoot.registryPath);
  if (!registry || !Array.isArray(registry.services)) {
    return {
      ok: false,
      error: 'ui_registry_invalid',
      details: `Unable to read runtime registry at ${runtimeRoot.registryPath}`,
    };
  }

  const bridgeResult = await ensureBridge(runtimeRoot);
  if (!bridgeResult.ok) {
    return bridgeResult;
  }

  const requiredIds = collectRequiredServiceIds(registry, options);
  const baseUrl = bridgeResult.baseUrl;
  const actions = [{ serviceId: 'bridge', action: bridgeResult.action }];

  for (const serviceId of requiredIds) {
    if (serviceId === 'bridge') continue;
    const result = await ensureRuntimeService(baseUrl, serviceId);
    if (!result.ok || !result.parsed?.ok) {
      return {
        ok: false,
        error: 'service_ensure_failed',
        details: `Service ${serviceId} failed to start: ${result.parsed?.error || result.text || `HTTP ${result.status}`}`,
        serviceId,
      };
    }
    actions.push({ serviceId, action: result.parsed.action || 'started' });
  }

  const snapshot = await getRuntimeSnapshot(baseUrl);
  if (!snapshot.ok || !snapshot.parsed?.summary) {
    return {
      ok: false,
      error: 'runtime_snapshot_unavailable',
      details: snapshot.text || `HTTP ${snapshot.status}`,
    };
  }

  return {
    ok: true,
    command: 'kbx ui start',
    source_doc: 'site/kbx-ui/runtime-services.json',
    summary: snapshot.parsed.summary,
    actions,
  };
}

async function runUi({ args, cwd }) {
  const { subcommand, options } = parseArgs(args || []);

  switch (subcommand) {
    case 'start': {
      const result = await startUiRuntime({ cwd, options });
      emit(result, options);
      if (!result.ok) {
        process.exitCode = 1;
      }
      return;
    }
    case undefined:
    case null:
    case 'help':
      console.log('Usage:');
      console.log('  kbx ui start [--include <service-id>] [--json]');
      console.log('');
      console.log('Deterministically start the registered local UI runtime services via the bridge registry.');
      return;
    default:
      console.error(`kbx ui: unknown subcommand "${subcommand}". Try: start`);
      process.exitCode = 1;
  }
}

module.exports = {
  runUi,
  parseArgs,
  resolveUiRuntimeRoot,
  collectRequiredServiceIds,
};