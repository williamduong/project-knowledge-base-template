'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function parseArgs(args) {
  const options = {
    fixture: null,
    dryRun: false,
    json: false,
  };

  const rest = [];
  for (let i = 0; i < (args || []).length; i += 1) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg.startsWith('--fixture=')) {
      options.fixture = arg.slice('--fixture='.length).trim();
      continue;
    }
    if (arg === '--fixture') {
      const next = (args || [])[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('kbx dispatch: --fixture requires a path value');
      }
      options.fixture = String(next).trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown dispatch option "${arg}". Supported: --fixture <path>, --dry-run, --json`);
    }
    rest.push(arg);
  }

  if (rest.length > 0) {
    throw new Error('kbx dispatch does not accept positional arguments.');
  }

  if (!options.fixture) {
    throw new Error('kbx dispatch requires --fixture <path>.');
  }

  if (!options.dryRun) {
    throw new Error('kbx dispatch currently supports dry-run only. Pass --dry-run.');
  }

  return options;
}

function normalizeList(list) {
  if (!Array.isArray(list)) return [];
  return Array.from(new Set(list.map((item) => String(item)))).sort();
}

function sortOutput(output) {
  return {
    primary_pipe: output.primary_pipe === null ? null : String(output.primary_pipe),
    applicable_rules: normalizeList(output.applicable_rules),
    required_gates: normalizeList(output.required_gates),
    allowed_actions: normalizeList(output.allowed_actions),
    verification_requirements: normalizeList(output.verification_requirements),
    fallback_or_escalation: output.fallback_or_escalation === null ? null : String(output.fallback_or_escalation),
  };
}

function resolvePipe(tuple) {
  const isHumanGate = (
    tuple.risk_level === 'high'
    || tuple.risk_level === 'irreversible'
    || tuple.target_scope === 'release'
    || tuple.target_scope === 'package'
    || tuple.mutation_class === 'source-changing'
    || tuple.mutation_class === 'release-changing'
    || tuple.evidence_state === 'none'
    || (tuple.actor_mode === 'agent-autonomous' && tuple.mutation_class !== 'docs-only')
  );

  if (isHumanGate) {
    return { primary_pipe: null, fallback_or_escalation: 'HumanGateRequired' };
  }

  if (tuple.intent_type === 'recover' || tuple.evidence_state === 'conflicting') {
    return { primary_pipe: 'PipeRecovery', fallback_or_escalation: null };
  }

  if (tuple.mutation_class === 'read-only') {
    return { primary_pipe: 'PipeReadOnly', fallback_or_escalation: null };
  }

  if (
    tuple.mutation_class === 'docs-only'
    && tuple.evidence_state === 'sufficient'
    && (tuple.risk_level === 'low' || tuple.risk_level === 'medium')
  ) {
    return { primary_pipe: 'PipeDocsFast', fallback_or_escalation: null };
  }

  return { primary_pipe: 'PipeStandard', fallback_or_escalation: null };
}

function resolveOutput(tuple) {
  const branch = resolvePipe(tuple);
  const docsScope = tuple.target_scope === 'docs' || tuple.target_scope === 'template';

  if (branch.fallback_or_escalation === 'HumanGateRequired') {
    const applicable = ['KBX-M001', 'KBX-M002', 'KBX-M003'];
    if (docsScope) applicable.push('KBX-GB001');

    return sortOutput({
      primary_pipe: null,
      applicable_rules: applicable,
      required_gates: ['P2', 'P10', 'P20'],
      allowed_actions: ['request-human-gate'],
      verification_requirements: ['human-approval-required'],
      fallback_or_escalation: 'HumanGateRequired',
    });
  }

  if (branch.primary_pipe === 'PipeRecovery') {
    return sortOutput({
      primary_pipe: 'PipeRecovery',
      applicable_rules: ['KBX-M001', 'KBX-M002', 'KBX-M003', 'KBX-V001', 'KBX-V002', 'KBX-WF011'],
      required_gates: ['P2', 'P19'],
      allowed_actions: ['collect-evidence', 'request-recheck'],
      verification_requirements: ['conflict-resolution-required'],
      fallback_or_escalation: null,
    });
  }

  if (branch.primary_pipe === 'PipeReadOnly') {
    const applicable = ['KBX-M001', 'KBX-M002', 'KBX-M003', 'KBX-M004'];
    if (docsScope) {
      applicable.push('KBX-AX003', 'KBX-PR025');
    }

    return sortOutput({
      primary_pipe: 'PipeReadOnly',
      applicable_rules: applicable,
      required_gates: ['P2'],
      allowed_actions: ['inspect', 'summarize'],
      verification_requirements: ['traceable-source'],
      fallback_or_escalation: null,
    });
  }

  if (branch.primary_pipe === 'PipeDocsFast') {
    const applicable = ['KBX-M001', 'KBX-M002', 'KBX-M003', 'KBX-M004', 'KBX-GB001'];
    if (docsScope) {
      applicable.push('KBX-AX003', 'KBX-PR025');
    }

    const action = tuple.target_scope === 'template' ? 'update-index' : 'update-link';

    return sortOutput({
      primary_pipe: 'PipeDocsFast',
      applicable_rules: applicable,
      required_gates: ['P2', 'P10'],
      allowed_actions: ['edit-doc', action],
      verification_requirements: ['audit-log-required', 'evidence-present'],
      fallback_or_escalation: null,
    });
  }

  return sortOutput({
    primary_pipe: 'PipeStandard',
    applicable_rules: ['KBX-M001', 'KBX-M002', 'KBX-M003', 'KBX-GB001', 'KBX-I001', 'KBX-I002', 'KBX-V001', 'KBX-WF008'],
    required_gates: ['P2', 'P10', 'P19'],
    allowed_actions: ['update-contract', 'register-routing'],
    verification_requirements: ['evidence-gap-noted', 'rule-chain-pass'],
    fallback_or_escalation: null,
  });
}

function parseFixtureYaml(fixturePath) {
  const raw = fs.readFileSync(fixturePath, 'utf8');
  const parsed = yaml.load(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Fixture YAML must be an object.');
  }
  if (!parsed.dispatch_tuple || typeof parsed.dispatch_tuple !== 'object' || Array.isArray(parsed.dispatch_tuple)) {
    throw new Error('Fixture YAML missing dispatch_tuple object.');
  }
  if (!parsed.expected_output || typeof parsed.expected_output !== 'object' || Array.isArray(parsed.expected_output)) {
    throw new Error('Fixture YAML missing expected_output object.');
  }
  return parsed;
}

function buildMismatch(expected, actual) {
  const keys = [
    'primary_pipe',
    'applicable_rules',
    'required_gates',
    'allowed_actions',
    'verification_requirements',
    'fallback_or_escalation',
  ];

  const fields = [];
  for (const key of keys) {
    if (JSON.stringify(expected[key]) !== JSON.stringify(actual[key])) {
      fields.push(key);
    }
  }
  return fields;
}

function printJson(payload) {
  console.log(JSON.stringify(payload, null, 2));
}

function runDispatch({ args, cwd }) {
  const options = parseArgs(args);
  const fixturePath = path.resolve(cwd, options.fixture);

  if (!fs.existsSync(fixturePath)) {
    const payload = {
      command: 'kbx dispatch',
      ok: false,
      error: `Fixture file not found: ${fixturePath}`,
    };
    printJson(payload);
    process.exitCode = 1;
    return;
  }

  let fixture;
  try {
    fixture = parseFixtureYaml(fixturePath);
  } catch (error) {
    const payload = {
      command: 'kbx dispatch',
      ok: false,
      error: `Invalid fixture YAML: ${error.message}`,
      fixture: fixturePath,
    };
    printJson(payload);
    process.exitCode = 1;
    return;
  }

  const tuple = fixture.dispatch_tuple;
  const actualOutput = resolveOutput(tuple);
  const expectedOutput = sortOutput(fixture.expected_output);
  const mismatchFields = buildMismatch(expectedOutput, actualOutput);

  const result = {
    command: 'kbx dispatch',
    fixture: fixturePath,
    dry_run: true,
    case_id: fixture.case_id || null,
    dispatch_tuple: tuple,
    expected_output: expectedOutput,
    actual_output: actualOutput,
    match: mismatchFields.length === 0,
    mismatch_fields: mismatchFields,
  };

  printJson(result);
  if (!result.match) {
    process.exitCode = 1;
  }
}

module.exports = {
  parseArgs,
  resolveOutput,
  runDispatch,
  sortOutput,
};
