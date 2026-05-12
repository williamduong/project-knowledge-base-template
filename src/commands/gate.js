'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(args) {
  const options = {
    json: false,
    release: false,
  };

  for (const arg of args || []) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--release') {
      options.release = true;
      continue;
    }
    throw new Error(`Unknown gate option "${arg}". Supported: --json, --release`);
  }

  return options;
}

function parseJsonLoose(value) {
  if (!value) return null;
  try {
    return JSON.parse(String(value).trim());
  } catch {
    const text = String(value);
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function runKbx(cwd, args) {
  const cliPath = path.resolve(__dirname, '..', '..', 'bin', 'kbx.js');
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });

  return {
    command: `kbx ${args.join(' ')}`,
    ok: (result.status || 0) === 0,
    status: result.status || 0,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    parsed: parseJsonLoose(result.stdout || ''),
  };
}

function extractChaosScore(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const candidates = [
    parsed.score,
    parsed.chaosScore,
    parsed.chaos_result && parsed.chaos_result.score,
    parsed.chaosResult && parsed.chaosResult.score,
    parsed.observation && parsed.observation.chaosResult && parsed.observation.chaosResult.score,
  ];
  for (const c of candidates) {
    if (Number.isFinite(c)) return c;
  }
  return null;
}

async function runGate({ args, cwd }) {
  const options = parseArgs(args);

  const steps = [
    { name: 'doc_gate', args: ['verify', '--all', '--json'] },
    { name: 'ontology_build', args: ['ontology', 'build', '--json'] },
    { name: 'tests', args: ['test', '--sample', '20'] },
  ];

  const results = [];
  for (const step of steps) {
    const out = runKbx(cwd, step.args);
    results.push({ step: step.name, ...out });
    if (!out.ok) {
      break;
    }
  }

  if (results.every((r) => r.ok) && options.release) {
    const chaos = runKbx(cwd, ['chaos', '--estimate', '--json']);
    const score = extractChaosScore(chaos.parsed);
    const threshold = 50;
    const thresholdFail = Number.isFinite(score) && score > threshold;
    results.push({
      step: 'release_chaos_gate',
      ...chaos,
      threshold,
      score,
      ok: chaos.ok && !thresholdFail,
      thresholdFail,
      stderr: thresholdFail ? `Chaos score ${score} exceeds release threshold ${threshold}.` : chaos.stderr,
    });
  }

  const ok = results.every((r) => r.ok);

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx gate',
      release: options.release,
      ok,
      steps: results,
    }, null, 2));
  } else {
    console.log(`kbx gate: ${ok ? 'PASS' : 'FAIL'}`);
    for (const result of results) {
      console.log(`  - ${result.step}: ${result.ok ? 'PASS' : 'FAIL'} (${result.command})`);
      if (!result.ok && result.stderr) {
        console.log(`    ${result.stderr}`);
      }
    }
  }

  if (!ok) {
    process.exitCode = 1;
  }
}

module.exports = {
  runGate,
  parseArgs,
};
