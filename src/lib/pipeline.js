'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const yaml = require('js-yaml');

const PIPELINE_RELATIVE_PATH = path.join('.kb', 'release-pipeline.yaml');
const INTERPOLATION_TOKEN_REGEX = /\$\{\{\s*([^}]+?)\s*\}\}/g;
const UNSAFE_INTERPOLATION_PATTERN = /[;&|`$<>()\n\r]/;
const DANGEROUS_COMMAND_PATTERNS = [
  { pattern: /(^|\s)rm\s+-rf\s+(\/|\.\/|~\/|\$HOME|\$\{HOME\})/i, reason: 'destructive recursive delete' },
  { pattern: /(^|\s)del\s+\/f\s+\/s\s+\/q\b/i, reason: 'destructive Windows delete' },
  { pattern: /(^|\s)(curl|wget)[^\n\r|]*\|\s*(sh|bash|zsh|pwsh|powershell)\b/i, reason: 'remote script pipe execution' },
  { pattern: /(^|\s)(sudo\s+)?chmod\s+-R\s+777\b/i, reason: 'unsafe recursive permissions' },
  { pattern: /(^|\s)git\s+push\s+[^\n\r]*--force\b/i, reason: 'force push' },
  { pattern: /(^|\s)(mkfs|format)\b/i, reason: 'filesystem formatting' },
  { pattern: /(^|\s)shutdown\b/i, reason: 'system shutdown command' },
];

function pipelineFilePath(contentRoot) {
  return path.join(contentRoot, PIPELINE_RELATIVE_PATH);
}

function readPipeline(contentRoot, options = {}) {
  const opts = {
    required: false,
    ...options,
  };

  const filePath = opts.filePath || pipelineFilePath(contentRoot);
  if (!fs.existsSync(filePath)) {
    if (opts.required) {
      throw new Error(`Pipeline file not found: ${filePath}`);
    }
    return null;
  }

  return loadPipelineFromFile(filePath);
}

function loadPipelineFromFile(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Unable to read pipeline file: ${filePath}. ${err.message}`);
  }

  let parsed;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new Error(`Invalid pipeline YAML in ${filePath}: ${err.message}`);
  }

  const validated = validatePipelineSchema(parsed);
  if (!validated.ok) {
    throw new Error(`Invalid pipeline schema: ${validated.errors.join('; ')}`);
  }

  return parsed;
}

function validatePipelineSchema(pipeline) {
  const errors = [];

  if (!pipeline || typeof pipeline !== 'object' || Array.isArray(pipeline)) {
    return { ok: false, errors: ['pipeline must be a YAML object'] };
  }

  if (!(pipeline.inputs === undefined || isPlainObject(pipeline.inputs))) {
    errors.push('inputs must be an object when provided');
  }

  if (!Array.isArray(pipeline.steps) || pipeline.steps.length === 0) {
    errors.push('steps must be a non-empty array');
  } else {
    const seenNames = new Set();
    for (let i = 0; i < pipeline.steps.length; i += 1) {
      const step = pipeline.steps[i];
      const stepErrors = validateStep(step, i);
      for (const err of stepErrors) errors.push(err);

      if (step && typeof step.name === 'string') {
        const name = step.name.trim();
        if (name) {
          if (seenNames.has(name)) {
            errors.push(`steps[${i}].name duplicates another step`);
          }
          seenNames.add(name);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

function validateStep(step, index) {
  const errors = [];
  const prefix = `steps[${index}]`;

  if (!step || typeof step !== 'object' || Array.isArray(step)) {
    return [`${prefix} must be an object`];
  }

  checkNonEmptyString(step.name, `${prefix}.name`, errors);
  checkNonEmptyString(step.run, `${prefix}.run`, errors);

  if (!(step.description === undefined || isNonEmptyString(step.description))) {
    errors.push(`${prefix}.description must be non-empty string when provided`);
  }

  if (!(step.when === undefined || isNonEmptyString(step.when))) {
    errors.push(`${prefix}.when must be non-empty string when provided`);
  }

  if (!(step.confirm === undefined || typeof step.confirm === 'boolean')) {
    errors.push(`${prefix}.confirm must be boolean when provided`);
  }

  if (!(step.fail_on_nonzero === undefined || typeof step.fail_on_nonzero === 'boolean')) {
    errors.push(`${prefix}.fail_on_nonzero must be boolean when provided`);
  }

  if (!(step.outputs === undefined || isPlainObject(step.outputs))) {
    errors.push(`${prefix}.outputs must be an object when provided`);
  }

  return errors;
}

function interpolateTemplate(template, context = {}) {
  if (typeof template !== 'string') {
    throw new Error('Template must be a string');
  }

  return template.replace(INTERPOLATION_TOKEN_REGEX, (_full, rawExpression) => {
    const expression = String(rawExpression || '').trim();
    const resolved = resolveInterpolationExpression(expression, context);
    const value = normalizeInterpolationValue(resolved, expression);
    rejectUnsafeInterpolationValue(value, expression);
    return value;
  });
}

function resolveInterpolationExpression(expression, context = {}) {
  const parts = String(expression || '').split('.').filter((part) => part !== '');
  if (parts.length < 2) {
    throw new Error(`Invalid interpolation expression: ${expression}`);
  }

  if (parts[0] === 'inputs') {
    if (parts.length !== 2) {
      throw new Error(`Invalid inputs expression: ${expression}`);
    }
    const inputKey = parts[1];
    if (!isPlainObject(context.inputs) || !Object.prototype.hasOwnProperty.call(context.inputs, inputKey)) {
      throw new Error(`Unknown input in interpolation: ${expression}`);
    }
    return context.inputs[inputKey];
  }

  if (parts[0] === 'outputs') {
    if (parts.length < 3) {
      throw new Error(`Invalid outputs expression: ${expression}`);
    }

    const stepName = parts[1];
    const outputPath = parts.slice(2);
    const outputByStep = isPlainObject(context.outputs) ? context.outputs[stepName] : undefined;
    if (!isPlainObject(outputByStep)) {
      throw new Error(`Unknown output step in interpolation: ${expression}`);
    }

    const resolvedOutput = getNestedValue(outputByStep, outputPath);
    if (resolvedOutput === undefined) {
      throw new Error(`Unknown output key in interpolation: ${expression}`);
    }
    return resolvedOutput;
  }

  throw new Error(`Unsupported interpolation root: ${expression}`);
}

function getNestedValue(root, pathParts) {
  let current = root;
  for (const part of pathParts) {
    if (!isPlainObject(current) || !Object.prototype.hasOwnProperty.call(current, part)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function normalizeInterpolationValue(value, expression) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  throw new Error(`Interpolation value must be string/number/boolean: ${expression}`);
}

function rejectUnsafeInterpolationValue(value, expression) {
  const matched = value.match(UNSAFE_INTERPOLATION_PATTERN);
  if (!matched) return;
  throw new Error(
    `Unsafe interpolation value for ${expression}: contains shell metachar "${matched[0]}"`
  );
}

function detectDangerousCommand(command) {
  const text = String(command || '').trim();
  if (!text) return null;

  for (const rule of DANGEROUS_COMMAND_PATTERNS) {
    const matched = text.match(rule.pattern);
    if (matched) {
      return {
        reason: rule.reason,
        match: String(matched[0] || '').trim(),
      };
    }
  }

  return null;
}

function rejectDangerousCommand(command, stepName) {
  const match = detectDangerousCommand(command);
  if (!match) return;

  throw new Error(
    `Pipeline step rejected by security policy: ${stepName} (${match.reason}: ${match.match})`
  );
}

function executePipeline(pipeline, options = {}) {
  const opts = {
    cwd: process.cwd(),
    env: process.env,
    inputs: {},
    yes: false,
    confirmStep: null,
    executeCommand: runShellCommand,
    ...options,
  };

  const validated = validatePipelineSchema(pipeline);
  if (!validated.ok) {
    throw new Error(`Invalid pipeline schema: ${validated.errors.join('; ')}`);
  }

  const runtime = {
    inputs: { ...opts.inputs },
    outputs: {},
    steps: [],
  };

  for (let index = 0; index < pipeline.steps.length; index += 1) {
    const step = pipeline.steps[index];
    const stepResult = executeStep(step, {
      index,
      cwd: opts.cwd,
      env: opts.env,
      yes: opts.yes,
      confirmStep: opts.confirmStep,
      inputs: runtime.inputs,
      outputs: runtime.outputs,
      executeCommand: opts.executeCommand,
    });

    runtime.steps.push(stepResult);
    runtime.outputs[step.name] = stepResult.outputs;
  }

  return runtime;
}

function executeStep(step, options) {
  const context = {
    inputs: options.inputs,
    outputs: options.outputs,
  };

  const resolvedCommand = interpolateTemplate(step.run, context);
  rejectDangerousCommand(resolvedCommand, step.name);
  maybeConfirmStep(step, resolvedCommand, options);

  const execution = options.executeCommand(resolvedCommand, {
    cwd: options.cwd,
    env: options.env,
    step,
  });

  const normalized = normalizeExecutionResult(execution);
  const baseOutputs = {
    command: resolvedCommand,
    exit_code: normalized.exitCode,
    stdout: normalized.stdout,
    stderr: normalized.stderr,
  };

  const failOnNonZero = step.fail_on_nonzero !== false;
  if (normalized.exitCode !== 0 && failOnNonZero) {
    throw new Error(
      `Pipeline step failed: ${step.name} (exit ${normalized.exitCode})${
        normalized.stderr ? `: ${normalized.stderr}` : ''
      }`
    );
  }

  if (isPlainObject(step.outputs)) {
    const mappingContext = {
      inputs: options.inputs,
      outputs: {
        ...options.outputs,
        [step.name]: baseOutputs,
      },
    };

    for (const [key, value] of Object.entries(step.outputs)) {
      if (!isNonEmptyString(key)) continue;
      if (typeof value === 'string') {
        baseOutputs[key] = interpolateTemplate(value, mappingContext);
        continue;
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        baseOutputs[key] = value;
      }
    }
  }

  return {
    name: step.name,
    command: resolvedCommand,
    exitCode: normalized.exitCode,
    outputs: baseOutputs,
  };
}

function maybeConfirmStep(step, command, options) {
  if (step.confirm !== true) return;
  if (options.yes === true) return;

  if (typeof options.confirmStep !== 'function') {
    throw new Error(
      `Pipeline step requires confirmation but no confirm handler provided: ${step.name}`
    );
  }

  const decision = options.confirmStep({
    step,
    command,
    index: options.index,
  });

  if (decision !== true) {
    throw new Error(`Pipeline step cancelled by user: ${step.name}`);
  }
}

function normalizeExecutionResult(result) {
  const source = isPlainObject(result) ? result : {};
  const exitCode = Number(source.exitCode);
  return {
    exitCode: Number.isInteger(exitCode) ? exitCode : 0,
    stdout: String(source.stdout || '').trim(),
    stderr: String(source.stderr || '').trim(),
  };
}

function runShellCommand(command, options = {}) {
  const result = spawnSync(command, {
    cwd: options.cwd,
    env: options.env,
    shell: true,
    encoding: 'utf8',
  });

  if (result.error && result.status === null) {
    return {
      exitCode: 1,
      stdout: result.stdout || '',
      stderr: result.error.message || result.stderr || '',
    };
  }

  return {
    exitCode: typeof result.status === 'number' ? result.status : 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function checkNonEmptyString(value, label, errors) {
  if (!isNonEmptyString(value)) {
    errors.push(`${label} must be non-empty string`);
  }
}

module.exports = {
  DANGEROUS_COMMAND_PATTERNS,
  INTERPOLATION_TOKEN_REGEX,
  PIPELINE_RELATIVE_PATH,
  UNSAFE_INTERPOLATION_PATTERN,
  detectDangerousCommand,
  executePipeline,
  interpolateTemplate,
  loadPipelineFromFile,
  pipelineFilePath,
  readPipeline,
  rejectDangerousCommand,
  resolveInterpolationExpression,
  runShellCommand,
  validatePipelineSchema,
};
