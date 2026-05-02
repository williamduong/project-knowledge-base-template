'use strict';

const fs = require('fs');
const path = require('path');

function readPlanFile(planPath) {
  const absolutePath = path.resolve(planPath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON plan file: ${absolutePath}`);
  }
  return { absolutePath, parsed };
}

function ensureString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function ensureStringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    throw new Error(`${label} must be a non-empty string array`);
  }
}

function normalizeStep(step, index) {
  if (!step || typeof step !== 'object') {
    throw new Error(`steps[${index}] must be an object`);
  }

  ensureString(step.id, `steps[${index}].id`);
  ensureString(step.executor, `steps[${index}].executor`);
  ensureString(step.workingDir, `steps[${index}].workingDir`);
  ensureStringArray(step.allowedRoots, `steps[${index}].allowedRoots`);

  if (typeof step.command !== 'string' || step.command.trim() === '') {
    throw new Error(`steps[${index}].command must be a non-empty string`);
  }

  if (step.args !== undefined) {
    if (!Array.isArray(step.args) || step.args.some((arg) => typeof arg !== 'string')) {
      throw new Error(`steps[${index}].args must be a string array when provided`);
    }
  }

  const retryPolicy = step.retryPolicy || {};
  const maxAttempts = Number.isInteger(retryPolicy.maxAttempts) && retryPolicy.maxAttempts > 0
    ? retryPolicy.maxAttempts
    : 1;
  const backoffMs = Number.isInteger(retryPolicy.backoffMs) && retryPolicy.backoffMs >= 0
    ? retryPolicy.backoffMs
    : 0;

  const timeouts = step.timeouts || {};
  const timeoutMs = Number.isInteger(timeouts.timeoutMs) && timeouts.timeoutMs > 0
    ? timeouts.timeoutMs
    : 120000;

  return {
    id: step.id,
    executor: step.executor,
    command: step.command,
    args: Array.isArray(step.args) ? step.args : null,
    workingDir: step.workingDir,
    allowedRoots: step.allowedRoots,
    retryPolicy: { maxAttempts, backoffMs },
    timeoutMs,
    assert: step.assert || {},
  };
}

function loadPlan(planPath) {
  const { absolutePath, parsed } = readPlanFile(planPath);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Plan root must be an object');
  }

  ensureString(parsed.id, 'plan.id');

  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error('plan.steps must be a non-empty array');
  }

  const steps = parsed.steps.map((step, index) => normalizeStep(step, index));

  return {
    id: parsed.id,
    planPath: absolutePath,
    steps,
  };
}

module.exports = {
  loadPlan,
};
