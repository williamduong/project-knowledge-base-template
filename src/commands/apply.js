'use strict';

const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { buildPreviewPlan } = require('./plan');

function parseApplyArgs(args) {
  const options = {
    request: null,
    dryRun: false,
    execute: false,
    json: false,
    yes: false,
  };

  const positional = [];
  for (let i = 0; i < (args || []).length; i += 1) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--execute') {
      options.execute = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--yes' || arg === '-y') {
      options.yes = true;
      continue;
    }
    if (arg.startsWith('--request=')) {
      options.request = arg.slice('--request='.length).trim();
      continue;
    }
    if (arg === '--request') {
      const next = (args || [])[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('kbx apply: --request requires a text value');
      }
      options.request = String(next).trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown apply option "${arg}".`);
    }
    positional.push(arg);
  }

  if (positional.length > 0) {
    throw new Error('kbx apply does not accept positional arguments. Use --request "...".');
  }

  if (!options.request) {
    throw new Error('kbx apply requires --request "...".');
  }

  if (options.dryRun && options.execute) {
    throw new Error('kbx apply: choose only one mode, either --dry-run or --execute.');
  }

  if (!options.dryRun && !options.execute) {
    throw new Error('kbx apply requires one mode flag: --dry-run or --execute.');
  }

  if (options.execute && !options.yes) {
    throw new Error('kbx apply --execute requires --yes.');
  }

  return options;
}

function buildGateDecision(preview) {
  const fallback = preview.suggestion.fallback_or_escalation;
  if (fallback === 'HumanGateRequired') {
    return {
      decision: 'blocked',
      reason: 'human-gate-required',
      requires_human_gate: true,
      allowed_to_write: false,
    };
  }

  const mutationClass = preview.classification.mutation_class;
  if (mutationClass !== 'read-only' && mutationClass !== 'docs-only') {
    return {
      decision: 'blocked',
      reason: 'mutation-class-out-of-safe-scope',
      requires_human_gate: true,
      allowed_to_write: false,
    };
  }

  return {
    decision: 'allow',
    reason: 'safe-scope',
    requires_human_gate: false,
    allowed_to_write: true,
  };
}

function slugifyRequest(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48) || 'request';
}

function writeApplyReceipt({ contentRoot, preview }) {
  const stamp = new Date().toISOString();
  const stampCompact = stamp.replace(/[-:.TZ]/g, '').slice(0, 14);
  const slug = slugifyRequest(preview.request);

  const applyRoot = path.join(contentRoot, '.kb', 'apply');
  const receiptsRoot = path.join(applyRoot, 'receipts');
  const receiptName = `${stampCompact}-${slug}.json`;
  const receiptPath = path.join(receiptsRoot, receiptName);
  const ledgerPath = path.join(applyRoot, 'ledger.jsonl');

  const receipt = {
    schema: 'kbx-apply-receipt-v1',
    applied_at: stamp,
    request: preview.request,
    classification: preview.classification,
    suggestion: {
      primary_pipe: preview.suggestion.primary_pipe,
      required_gates: preview.suggestion.required_gates,
      fallback_or_escalation: preview.suggestion.fallback_or_escalation,
    },
    write_operations: [],
    status: 'applied-safe-noop',
  };

  fs.mkdirSync(receiptsRoot, { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  fs.appendFileSync(ledgerPath, `${JSON.stringify({
    applied_at: stamp,
    receipt: path.relative(contentRoot, receiptPath).replace(/\\/g, '/'),
    request: preview.request,
    target_scope: preview.classification.target_scope,
    mutation_class: preview.classification.mutation_class,
    status: receipt.status,
  })}\n`, 'utf8');

  return {
    receipt_path: receiptPath,
    ledger_path: ledgerPath,
    status: receipt.status,
  };
}

function runApply({ args, cwd }) {
  let options;
  try {
    options = parseApplyArgs(args);
  } catch (error) {
    console.log(JSON.stringify({
      command: 'kbx apply',
      ok: false,
      error: error.message,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const preview = buildPreviewPlan(options.request);
  const gate = buildGateDecision(preview);
  const mode = options.dryRun ? 'dry-run' : 'execute';

  if (mode === 'dry-run') {
    console.log(JSON.stringify({
      command: 'kbx apply',
      mode,
      request: options.request,
      gate,
      preview,
      write_result: null,
    }, null, 2));

    if (gate.decision !== 'allow') {
      process.exitCode = 1;
    }
    return;
  }

  if (gate.decision !== 'allow') {
    console.log(JSON.stringify({
      command: 'kbx apply',
      mode,
      request: options.request,
      gate,
      preview,
      write_result: null,
      ok: false,
      error: 'Apply blocked by gate policy.',
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  let ctx;
  try {
    ctx = resolveExistingState({ workspaceRoot: cwd });
  } catch (error) {
    console.log(JSON.stringify({
      command: 'kbx apply',
      mode,
      request: options.request,
      gate,
      preview,
      write_result: null,
      ok: false,
      error: error.message,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const writeResult = writeApplyReceipt({
    contentRoot: ctx.contentRoot,
    preview,
  });

  console.log(JSON.stringify({
    command: 'kbx apply',
    mode,
    request: options.request,
    gate,
    preview,
    write_result: writeResult,
    ok: true,
  }, null, 2));
}

module.exports = {
  parseApplyArgs,
  buildGateDecision,
  runApply,
};
