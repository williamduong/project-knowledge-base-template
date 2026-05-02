'use strict';

const path = require('path');
const { loadPlan } = require('./planner');
const { validateStepScope } = require('./scope-guard');
const { runShellStep } = require('./executor/shell');
const { runKbCliStep } = require('./executor/kb-cli');
const { writeReport } = require('./reporter');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function evaluateAssertions(step, result) {
  const checks = [];
  const assertion = step.assert || {};

  if (assertion.exitCode !== undefined) {
    checks.push({
      name: 'exitCode',
      pass: result.exitCode === assertion.exitCode,
      expected: assertion.exitCode,
      actual: result.exitCode,
    });
  }

  if (Array.isArray(assertion.stdoutContains)) {
    for (const token of assertion.stdoutContains) {
      checks.push({
        name: `stdoutContains:${token}`,
        pass: result.stdout.includes(token),
      });
    }
  }

  if (Array.isArray(assertion.stdoutNotContains)) {
    for (const token of assertion.stdoutNotContains) {
      checks.push({
        name: `stdoutNotContains:${token}`,
        pass: !result.stdout.includes(token),
      });
    }
  }

  if (assertion.jsonEquals && typeof assertion.jsonEquals === 'object') {
    let parsed = null;
    try {
      parsed = JSON.parse(result.stdout);
    } catch (error) {
      checks.push({ name: 'jsonParse', pass: false, error: 'stdout is not valid JSON' });
    }

    if (parsed) {
      for (const [dotPath, expected] of Object.entries(assertion.jsonEquals)) {
        const actual = dotPath.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), parsed);
        checks.push({
          name: `jsonEquals:${dotPath}`,
          pass: actual === expected,
          expected,
          actual,
        });
      }
    }
  }

  return checks;
}

async function runStep(step, workspaceRoot, dryRun) {
  const startedAt = new Date().toISOString();
  const attempts = [];

  let resolved;
  try {
    resolved = validateStepScope(step, workspaceRoot);
  } catch (error) {
    return {
      id: step.id,
      executor: step.executor,
      state: 'BLOCKED_SCOPE',
      startedAt,
      endedAt: new Date().toISOString(),
      attempts,
      error: error.message,
    };
  }

  if (dryRun) {
    return {
      id: step.id,
      executor: step.executor,
      state: 'DONE',
      startedAt,
      endedAt: new Date().toISOString(),
      attempts,
      dryRun: true,
    };
  }

  for (let attemptNo = 1; attemptNo <= step.retryPolicy.maxAttempts; attemptNo += 1) {
    let result;
    try {
      if (step.executor === 'shell') {
        result = await runShellStep(step, resolved.resolvedWorkingDir);
      } else if (step.executor === 'kb-cli') {
        result = await runKbCliStep(step, resolved.resolvedWorkingDir);
      } else {
        throw new Error(`Unknown executor: ${step.executor}`);
      }
    } catch (error) {
      result = {
        exitCode: null,
        stdout: '',
        stderr: String(error.message || error),
        durationMs: 0,
        timedOut: false,
      };
    }

    const assertions = evaluateAssertions(step, result);
    const assertionPass = assertions.every((check) => check.pass);
    const attemptState = result.timedOut
      ? 'TIMEOUT'
      : result.exitCode === 0 && assertionPass
        ? 'DONE'
        : 'FAILED';

    attempts.push({
      n: attemptNo,
      state: attemptState,
      ...result,
      assertions,
    });

    if (attemptState === 'DONE') {
      return {
        id: step.id,
        executor: step.executor,
        state: 'DONE',
        startedAt,
        endedAt: new Date().toISOString(),
        attempts,
      };
    }

    if (attemptState === 'TIMEOUT') {
      return {
        id: step.id,
        executor: step.executor,
        state: 'TIMEOUT',
        startedAt,
        endedAt: new Date().toISOString(),
        attempts,
      };
    }

    if (attemptNo < step.retryPolicy.maxAttempts && step.retryPolicy.backoffMs > 0) {
      await sleep(step.retryPolicy.backoffMs);
    }
  }

  return {
    id: step.id,
    executor: step.executor,
    state: 'FAILED',
    startedAt,
    endedAt: new Date().toISOString(),
    attempts,
  };
}

async function runPlan(planPath, options = {}) {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  const dryRun = Boolean(options.dryRun);
  const plan = loadPlan(planPath);

  const startedAt = new Date().toISOString();
  const steps = [];
  for (const step of plan.steps) {
    // v1: sequential-only to keep runs deterministic.
    // Parallel scheduling will be added in a later phase.
    // eslint-disable-next-line no-await-in-loop
    const result = await runStep(step, workspaceRoot, dryRun);
    steps.push(result);
  }
  const endedAt = new Date().toISOString();

  const summary = {
    total: steps.length,
    passed: steps.filter((step) => step.state === 'DONE').length,
    failed: steps.filter((step) => step.state === 'FAILED').length,
    timeout: steps.filter((step) => step.state === 'TIMEOUT').length,
    blocked: steps.filter((step) => step.state === 'BLOCKED_SCOPE').length,
  };

  const report = {
    planId: plan.id,
    planPath: path.resolve(plan.planPath),
    startedAt,
    endedAt,
    summary,
    steps,
  };

  const outputPath = writeReport(report, options.outputPath);

  return {
    report,
    outputPath,
    ok: summary.failed === 0 && summary.timeout === 0 && summary.blocked === 0,
  };
}

module.exports = {
  runPlan,
};
