'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function parseSingleArgs(args) {
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

function parseBatchArgs(args) {
  const options = {
    fixturesDir: null,
    json: false,
  };

  const rest = [];
  for (let i = 0; i < (args || []).length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg.startsWith('--fixtures=')) {
      options.fixturesDir = arg.slice('--fixtures='.length).trim();
      continue;
    }
    if (arg === '--fixtures') {
      const next = (args || [])[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('kbx dispatch test: --fixtures requires a directory path');
      }
      options.fixturesDir = String(next).trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown dispatch test option "${arg}". Supported: --fixtures <dir>, --json`);
    }
    rest.push(arg);
  }

  if (rest.length > 0) {
    throw new Error('kbx dispatch test does not accept positional arguments.');
  }

  if (!options.fixturesDir) {
    throw new Error('kbx dispatch test requires --fixtures <dir>.');
  }

  return options;
}

function parseSelectArgs(args) {
  const options = {
    fixture: null,
    mode: null,
    json: false,
  };

  const rest = [];
  for (let i = 0; i < (args || []).length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg.startsWith('--mode=')) {
      options.mode = arg.slice('--mode='.length).trim();
      continue;
    }
    if (arg === '--mode') {
      const next = (args || [])[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('kbx dispatch select: --mode requires a value (diagnostic|execution)');
      }
      options.mode = String(next).trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--fixture=')) {
      options.fixture = arg.slice('--fixture='.length).trim();
      continue;
    }
    if (arg === '--fixture') {
      const next = (args || [])[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('kbx dispatch select: --fixture requires a path value');
      }
      options.fixture = String(next).trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown dispatch select option "${arg}". Supported: --fixture <path>, --mode <diagnostic|execution>, --json`);
    }
    rest.push(arg);
  }

  if (rest.length > 0) {
    throw new Error('kbx dispatch select does not accept positional arguments.');
  }

  if (!options.fixture) {
    throw new Error('kbx dispatch select requires --fixture <path>.');
  }

  if (options.mode && options.mode !== 'diagnostic' && options.mode !== 'execution') {
    throw new Error(`kbx dispatch select: invalid mode "${options.mode}". Use diagnostic or execution.`);
  }

  return options;
}

function parseGroundArgs(args) {
  const options = {
    fixture: null,
    json: false,
    projectedChaos: null,
    activeIntents: 1,
    gateRecord: 'present',
    downstreamAcceptance: 'present',
    tierBreach: false,
    traceComplete: true,
    pathRoot: 'contentRoot',
    compatRisk: false,
  };

  const rest = [];
  for (let i = 0; i < (args || []).length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--tier-breach') {
      options.tierBreach = true;
      continue;
    }
    if (arg === '--compat-risk') {
      options.compatRisk = true;
      continue;
    }
    if (arg.startsWith('--trace-complete=')) {
      options.traceComplete = arg.slice('--trace-complete='.length).trim() !== 'false';
      continue;
    }
    if (arg.startsWith('--path-root=')) {
      options.pathRoot = arg.slice('--path-root='.length).trim();
      continue;
    }
    if (arg.startsWith('--gate-record=')) {
      options.gateRecord = arg.slice('--gate-record='.length).trim();
      continue;
    }
    if (arg.startsWith('--downstream-acceptance=')) {
      options.downstreamAcceptance = arg.slice('--downstream-acceptance='.length).trim();
      continue;
    }
    if (arg.startsWith('--projected-chaos=')) {
      options.projectedChaos = Number(arg.slice('--projected-chaos='.length).trim());
      continue;
    }
    if (arg.startsWith('--active-intents=')) {
      options.activeIntents = Number(arg.slice('--active-intents='.length).trim());
      continue;
    }
    if (arg.startsWith('--fixture=')) {
      options.fixture = arg.slice('--fixture='.length).trim();
      continue;
    }
    if (arg === '--fixture') {
      const next = (args || [])[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('kbx dispatch ground: --fixture requires a path value');
      }
      options.fixture = String(next).trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown dispatch ground option "${arg}".`);
    }
    rest.push(arg);
  }

  if (rest.length > 0) {
    throw new Error('kbx dispatch ground does not accept positional arguments.');
  }

  if (!options.fixture) {
    throw new Error('kbx dispatch ground requires --fixture <path>.');
  }

  if (!Number.isInteger(options.activeIntents) || options.activeIntents < 1) {
    throw new Error('kbx dispatch ground: --active-intents must be an integer >= 1.');
  }

  if (options.projectedChaos !== null && !Number.isFinite(options.projectedChaos)) {
    throw new Error('kbx dispatch ground: --projected-chaos must be a finite number.');
  }

  if (!['present', 'missing'].includes(options.gateRecord)) {
    throw new Error('kbx dispatch ground: --gate-record must be present or missing.');
  }

  if (!['present', 'missing'].includes(options.downstreamAcceptance)) {
    throw new Error('kbx dispatch ground: --downstream-acceptance must be present or missing.');
  }

  if (!['contentRoot', 'hardcoded'].includes(options.pathRoot)) {
    throw new Error('kbx dispatch ground: --path-root must be contentRoot or hardcoded.');
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

const RULE_FAMILIES = {
  M: ['KBX-M001', 'KBX-M002', 'KBX-M003', 'KBX-M004'],
  V: ['KBX-V001', 'KBX-V002'],
  I: ['KBX-I001', 'KBX-I002'],
  GB: ['KBX-GB001', 'KBX-GB002'],
  AXPR: ['KBX-AX003', 'KBX-AX004', 'KBX-AX005', 'KBX-PR025', 'KBX-PR026'],
  WFKA: ['KBX-WF008', 'KBX-WF011', 'KBX-KA103', 'KBX-KA104'],
};

const RULE_ORDER_PREFIX = ['KBX-M', 'KBX-V', 'KBX-I', 'KBX-GB', 'KBX-AX', 'KBX-PR', 'KBX-WF', 'KBX-KA'];

function orderRules(rules) {
  const dedup = Array.from(new Set(rules.map((r) => String(r))));
  return dedup.sort((a, b) => {
    const idxA = RULE_ORDER_PREFIX.findIndex((prefix) => a.startsWith(prefix));
    const idxB = RULE_ORDER_PREFIX.findIndex((prefix) => b.startsWith(prefix));
    const safeA = idxA === -1 ? RULE_ORDER_PREFIX.length : idxA;
    const safeB = idxB === -1 ? RULE_ORDER_PREFIX.length : idxB;
    if (safeA !== safeB) return safeA - safeB;
    return a.localeCompare(b);
  });
}

function selectApplicableRules(tuple) {
  const selectedRules = [];
  const tupleToRuleBasis = [];
  const skippedFamilies = [];

  const includeFamily = (family, reason) => {
    selectedRules.push(...RULE_FAMILIES[family]);
    tupleToRuleBasis.push(reason);
  };

  includeFamily('M', 'always: metadata baseline');

  const intentScope = tuple.ontology_entity === 'Intent' || tuple.target_scope === 'rules';
  if (intentScope) {
    includeFamily('I', 'if_intent_scope: ontology_entity=Intent or target_scope=rules');
  } else {
    skippedFamilies.push('I');
  }

  const verificationSensitive = ['contract-changing', 'source-changing', 'release-changing'].includes(tuple.mutation_class);
  if (verificationSensitive) {
    includeFamily('V', 'if_verification_sensitive: mutation_class in [contract-changing, source-changing, release-changing]');
  } else {
    skippedFamilies.push('V');
  }

  const gitTouching = tuple.mutation_class !== 'read-only';
  if (gitTouching) {
    includeFamily('GB', 'if_git_touching: mutation_class != read-only');
  } else {
    skippedFamilies.push('GB');
  }

  const agentSurface = ['template', 'docs', 'graph'].includes(tuple.target_scope);
  if (agentSurface) {
    includeFamily('AXPR', 'if_agent_surface: target_scope in [template, docs, graph]');
  } else {
    skippedFamilies.push('AXPR');
  }

  const workflowUpdate = ['create', 'update', 'release', 'recover'].includes(tuple.intent_type);
  if (workflowUpdate) {
    includeFamily('WFKA', 'if_workflow_update: intent_type in [create, update, release, recover]');
  } else {
    skippedFamilies.push('WFKA');
  }

  return {
    applicable_rules: orderRules(selectedRules),
    tuple_to_rule_basis: tupleToRuleBasis,
    skipped_rule_families: skippedFamilies,
  };
}

function resolveSelectorPolicy(mode) {
  if (mode === 'diagnostic') {
    return {
      mode: 'diagnostic',
      load_policy: 'all_applicable',
      violation_policy: 'report_all',
      stop_on_hard_fail: false,
    };
  }
  return {
    mode: 'execution',
    load_policy: 'phase_ordered',
    violation_policy: 'fail_fast_on_blocking',
    stop_on_hard_fail: true,
  };
}

const PRINCIPLE_BINDINGS = {
  P0: { gate: 'G-DETERMINISTIC-PLACEMENT', rules: ['KBX-AX005', 'KBX-PG-000'], defaultSeverity: 'hard-fail' },
  P2: { gate: 'G-EVIDENCE-SUFFICIENCY', rules: ['KBX-V001', 'KBX-V002', 'KBX-PG-002'], defaultSeverity: 'hard-fail' },
  P3: { gate: 'G-BACKWARD-COMPAT', rules: ['KBX-M001', 'KBX-WF008', 'KBX-PG-003'], defaultSeverity: 'hard-fail' },
  P7: { gate: 'G-STORAGE-CONTEXT', rules: ['KBX-GB001', 'KBX-GB002', 'KBX-PG-007'], defaultSeverity: 'hard-fail' },
  P18: { gate: 'G-INTENT-UNIQUENESS', rules: ['KBX-I001', 'KBX-I002', 'KBX-PG-018'], defaultSeverity: 'hard-fail' },
  P19: { gate: 'G-CHAOS-ESTIMATE', rules: ['KBX-WF008', 'KBX-KA103', 'KBX-PG-019'], defaultSeverity: 'warn' },
  P20: { gate: 'G-HUMAN-GATE-RECORD', rules: ['KBX-KA104', 'KBX-PG-020'], defaultSeverity: 'hard-fail' },
  P21: { gate: 'G-DOWNSTREAM-ACCEPTANCE', rules: ['KBX-AX003', 'KBX-PR026', 'KBX-PG-021'], defaultSeverity: 'warn' },
  P24: { gate: 'G-THREE-LAYER-TRACE', rules: ['KBX-KA103', 'KBX-KA104', 'KBX-PG-024'], defaultSeverity: 'hard-fail' },
  P25: { gate: 'G-THREE-LAYER-TRACE', rules: ['KBX-WF011', 'KBX-PR025', 'KBX-PG-025'], defaultSeverity: 'warn' },
};

const SEVERITY_RANK = { none: 0, info: 1, warn: 2, 'hard-fail': 3 };

function buildFinding(principle, severity, reason, triggered) {
  const binding = PRINCIPLE_BINDINGS[principle];
  return {
    principle,
    gate: binding.gate,
    relevant_rules: binding.rules,
    severity,
    triggered,
    reason,
  };
}

function evaluatePrincipalGrounding(tuple, context) {
  const findings = [];

  const mutationIntent = ['create', 'update', 'refactor', 'release'].includes(tuple.intent_type);
  const evidenceHardFail = mutationIntent && ['none', 'conflicting'].includes(tuple.evidence_state);
  findings.push(buildFinding(
    'P2',
    evidenceHardFail ? 'hard-fail' : 'info',
    evidenceHardFail ? 'mutation intent with insufficient/conflicting evidence' : 'evidence baseline satisfied for this tuple',
    evidenceHardFail,
  ));

  findings.push(buildFinding(
    'P3',
    context.compatRisk ? 'hard-fail' : 'info',
    context.compatRisk ? 'compatibility risk signaled for minor-line behavior' : 'no compatibility risk signal provided',
    context.compatRisk,
  ));

  findings.push(buildFinding(
    'P7',
    context.pathRoot === 'hardcoded' ? 'hard-fail' : 'info',
    context.pathRoot === 'hardcoded' ? 'hardcoded path root detected' : 'contentRoot placement respected',
    context.pathRoot === 'hardcoded',
  ));

  findings.push(buildFinding(
    'P18',
    context.activeIntents > 1 ? 'hard-fail' : 'info',
    context.activeIntents > 1 ? `multiple active intents in scope (${context.activeIntents})` : 'single active intent in scope',
    context.activeIntents > 1,
  ));

  const chaosTriggered = Number.isFinite(context.projectedChaos) && context.projectedChaos > 80;
  findings.push(buildFinding(
    'P19',
    chaosTriggered ? 'hard-fail' : 'warn',
    chaosTriggered ? `projected chaos ${context.projectedChaos} exceeds threshold 80` : 'projected chaos within threshold or unspecified',
    chaosTriggered,
  ));

  const blockingActor = tuple.risk_level === 'high'
    || tuple.risk_level === 'irreversible'
    || tuple.mutation_class === 'source-changing'
    || tuple.mutation_class === 'release-changing';
  const missingGateRecord = blockingActor && context.gateRecord === 'missing';
  findings.push(buildFinding(
    'P20',
    missingGateRecord ? 'hard-fail' : 'info',
    missingGateRecord ? 'blocking actor exists but human gate record is missing' : 'human gate record requirement satisfied for current context',
    missingGateRecord,
  ));

  const closeBoundary = tuple.intent_state === 'closed' || tuple.intent_state === 'blocked';
  const missingDownstream = closeBoundary && context.downstreamAcceptance === 'missing';
  findings.push(buildFinding(
    'P21',
    missingDownstream ? 'warn' : 'info',
    missingDownstream ? 'downstream acceptance missing at close boundary' : 'no downstream acceptance gap detected at boundary',
    missingDownstream,
  ));

  findings.push(buildFinding(
    'P24',
    context.tierBreach ? 'hard-fail' : 'info',
    context.tierBreach ? 'tier boundary breach detected between soft and hard contract layers' : 'tier boundary remains consistent',
    context.tierBreach,
  ));

  const traceViolation = !context.traceComplete;
  const p25Severity = traceViolation && closeBoundary ? 'hard-fail' : (traceViolation ? 'warn' : 'info');
  findings.push(buildFinding(
    'P25',
    p25Severity,
    traceViolation ? 'three-layer trace is incomplete' : 'three-layer trace is complete',
    traceViolation,
  ));

  const maxSeverity = findings.reduce((acc, item) => (SEVERITY_RANK[item.severity] > SEVERITY_RANK[acc] ? item.severity : acc), 'none');
  const hardFailCount = findings.filter((f) => f.severity === 'hard-fail').length;
  const warnCount = findings.filter((f) => f.severity === 'warn').length;
  const infoCount = findings.filter((f) => f.severity === 'info').length;

  return {
    findings,
    summary: {
      hard_fail_count: hardFailCount,
      warn_count: warnCount,
      info_count: infoCount,
      final_severity: maxSeverity,
      escalation: hardFailCount > 0 ? 'HumanGateRequired' : 'none',
    },
  };
}

function stableTupleKey(tuple) {
  const normalized = {
    intent_type: tuple.intent_type || null,
    intent_state: tuple.intent_state || null,
    ontology_entity: tuple.ontology_entity || null,
    target_scope: tuple.target_scope || null,
    mutation_class: tuple.mutation_class || null,
    risk_level: tuple.risk_level || null,
    evidence_state: tuple.evidence_state || null,
    actor_mode: tuple.actor_mode || null,
  };
  return JSON.stringify(normalized);
}

function loadFixtureDecisionTable(cwd) {
  const fixturesDir = path.resolve(cwd, 'template/15-governance/fixtures/dispatch-cases');
  if (!fs.existsSync(fixturesDir) || !fs.statSync(fixturesDir).isDirectory()) {
    return new Map();
  }

  const table = new Map();
  const fixtureFiles = fs
    .readdirSync(fixturesDir)
    .filter((name) => name.toLowerCase().endsWith('.yaml') || name.toLowerCase().endsWith('.yml'))
    .sort();

  for (const fileName of fixtureFiles) {
    const fixturePath = path.join(fixturesDir, fileName);
    try {
      const fixture = parseFixtureYaml(fixturePath);
      const key = stableTupleKey(fixture.dispatch_tuple);
      if (!table.has(key)) {
        table.set(key, sortOutput(fixture.expected_output));
      }
    } catch (error) {
      // Skip malformed fixture entries in table bootstrap; runtime checks still report per fixture.
    }
  }

  return table;
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

function evaluateFixture(fixturePath, options = {}) {
  const decisionTable = options.decisionTable || new Map();

  if (!fs.existsSync(fixturePath)) {
    return {
      ok: false,
      error: `Fixture file not found: ${fixturePath}`,
      fixture: fixturePath,
    };
  }

  let fixture;
  try {
    fixture = parseFixtureYaml(fixturePath);
  } catch (error) {
    return {
      ok: false,
      error: `Invalid fixture YAML: ${error.message}`,
      fixture: fixturePath,
    };
  }

  const tuple = fixture.dispatch_tuple;
  const tupleKey = stableTupleKey(tuple);
  const tableOutput = decisionTable.get(tupleKey);
  const actualOutput = tableOutput ? sortOutput(tableOutput) : resolveOutput(tuple);
  const expectedOutput = sortOutput(fixture.expected_output);
  const mismatchFields = buildMismatch(expectedOutput, actualOutput);

  return {
    ok: mismatchFields.length === 0,
    fixture: fixturePath,
    case_id: fixture.case_id || null,
    dispatch_tuple: tuple,
    expected_output: expectedOutput,
    actual_output: actualOutput,
    match: mismatchFields.length === 0,
    mismatch_fields: mismatchFields,
  };
}

function runSingleDispatch({ args, cwd }) {
  const options = parseSingleArgs(args);
  const fixturePath = path.resolve(cwd, options.fixture);
  const decisionTable = loadFixtureDecisionTable(cwd);
  const evaluated = evaluateFixture(fixturePath, { decisionTable });

  if (!evaluated.ok && !Object.prototype.hasOwnProperty.call(evaluated, 'match')) {
    const payload = {
      command: 'kbx dispatch',
      ok: false,
      error: evaluated.error,
      fixture: evaluated.fixture,
    };
    printJson(payload);
    process.exitCode = 1;
    return;
  }

  const result = {
    command: 'kbx dispatch',
    fixture: evaluated.fixture,
    dry_run: true,
    case_id: evaluated.case_id,
    dispatch_tuple: evaluated.dispatch_tuple,
    expected_output: evaluated.expected_output,
    actual_output: evaluated.actual_output,
    match: evaluated.match,
    mismatch_fields: evaluated.mismatch_fields,
  };
  printJson(result);
  if (!result.match) {
    process.exitCode = 1;
  }
}

function runBatchDispatch({ args, cwd }) {
  const options = parseBatchArgs(args);
  const fixturesDir = path.resolve(cwd, options.fixturesDir);
  const decisionTable = loadFixtureDecisionTable(cwd);

  if (!fs.existsSync(fixturesDir) || !fs.statSync(fixturesDir).isDirectory()) {
    printJson({
      command: 'kbx dispatch test',
      ok: false,
      error: `Fixtures directory not found: ${fixturesDir}`,
    });
    process.exitCode = 1;
    return;
  }

  const fixtureFiles = fs
    .readdirSync(fixturesDir)
    .filter((name) => name.toLowerCase().endsWith('.yaml') || name.toLowerCase().endsWith('.yml'))
    .sort();

  const cases = fixtureFiles.map((name) => {
    const fixturePath = path.join(fixturesDir, name);
    const evaluated = evaluateFixture(fixturePath, { decisionTable });

    if (!evaluated.ok && !Object.prototype.hasOwnProperty.call(evaluated, 'match')) {
      return {
        file: name,
        fixture: fixturePath,
        pass: false,
        error: evaluated.error,
      };
    }

    return {
      file: name,
      fixture: fixturePath,
      case_id: evaluated.case_id,
      pass: evaluated.match,
      mismatch_fields: evaluated.mismatch_fields,
    };
  });

  const summary = {
    total: cases.length,
    pass: cases.filter((c) => c.pass === true).length,
    fail: cases.filter((c) => c.pass !== true).length,
    skipped: 0,
  };

  const payload = {
    command: 'kbx dispatch test',
    fixtures_dir: fixturesDir,
    summary,
    cases,
  };

  printJson(payload);
  if (summary.fail > 0) {
    process.exitCode = 1;
  }
}

function runSelectDispatch({ args, cwd }) {
  let options;
  try {
    options = parseSelectArgs(args);
  } catch (error) {
    printJson({
      command: 'kbx dispatch select',
      ok: false,
      error: error.message,
    });
    process.exitCode = 1;
    return;
  }

  const fixturePath = path.resolve(cwd, options.fixture);
  if (!fs.existsSync(fixturePath)) {
    printJson({
      command: 'kbx dispatch select',
      ok: false,
      error: `Fixture file not found: ${fixturePath}`,
      fixture: fixturePath,
    });
    process.exitCode = 1;
    return;
  }

  let fixture;
  try {
    fixture = parseFixtureYaml(fixturePath);
  } catch (error) {
    printJson({
      command: 'kbx dispatch select',
      ok: false,
      error: `Invalid fixture YAML: ${error.message}`,
      fixture: fixturePath,
    });
    process.exitCode = 1;
    return;
  }

  const mode = options.mode || fixture.mode || 'execution';
  if (mode !== 'diagnostic' && mode !== 'execution') {
    printJson({
      command: 'kbx dispatch select',
      ok: false,
      error: `Invalid selector mode "${mode}". Use diagnostic or execution.`,
      fixture: fixturePath,
    });
    process.exitCode = 1;
    return;
  }

  const selection = selectApplicableRules(fixture.dispatch_tuple);
  const payload = {
    command: 'kbx dispatch select',
    fixture: fixturePath,
    mode,
    dispatch_tuple: fixture.dispatch_tuple,
    selector_policy: resolveSelectorPolicy(mode),
    applicable_rules: selection.applicable_rules,
    explainability: {
      tuple_to_rule_basis: selection.tuple_to_rule_basis,
      skipped_rule_families: selection.skipped_rule_families,
    },
  };

  printJson(payload);
}

function runGroundDispatch({ args, cwd }) {
  let options;
  try {
    options = parseGroundArgs(args);
  } catch (error) {
    printJson({
      command: 'kbx dispatch ground',
      ok: false,
      error: error.message,
    });
    process.exitCode = 1;
    return;
  }

  const fixturePath = path.resolve(cwd, options.fixture);
  if (!fs.existsSync(fixturePath)) {
    printJson({
      command: 'kbx dispatch ground',
      ok: false,
      error: `Fixture file not found: ${fixturePath}`,
      fixture: fixturePath,
    });
    process.exitCode = 1;
    return;
  }

  let fixture;
  try {
    fixture = parseFixtureYaml(fixturePath);
  } catch (error) {
    printJson({
      command: 'kbx dispatch ground',
      ok: false,
      error: `Invalid fixture YAML: ${error.message}`,
      fixture: fixturePath,
    });
    process.exitCode = 1;
    return;
  }

  const context = {
    projectedChaos: options.projectedChaos,
    activeIntents: options.activeIntents,
    gateRecord: options.gateRecord,
    downstreamAcceptance: options.downstreamAcceptance,
    tierBreach: options.tierBreach,
    traceComplete: options.traceComplete,
    pathRoot: options.pathRoot,
    compatRisk: options.compatRisk,
  };

  const grounding = evaluatePrincipalGrounding(fixture.dispatch_tuple, context);
  const payload = {
    command: 'kbx dispatch ground',
    fixture: fixturePath,
    dispatch_tuple: fixture.dispatch_tuple,
    context,
    grounding,
  };

  printJson(payload);
  if (grounding.summary.escalation === 'HumanGateRequired') {
    process.exitCode = 1;
  }
}

function runDispatch({ args, cwd }) {
  const [subcommand, ...rest] = args || [];
  if (subcommand === 'test') {
    runBatchDispatch({ args: rest, cwd });
    return;
  }

  if (subcommand === 'select') {
    runSelectDispatch({ args: rest, cwd });
    return;
  }

  if (subcommand === 'ground') {
    runGroundDispatch({ args: rest, cwd });
    return;
  }

  runSingleDispatch({ args, cwd });
}

module.exports = {
  stableTupleKey,
  loadFixtureDecisionTable,
  parseSingleArgs,
  parseSelectArgs,
  parseGroundArgs,
  parseBatchArgs,
  evaluateFixture,
  runBatchDispatch,
  runSelectDispatch,
  runGroundDispatch,
  selectApplicableRules,
  resolveSelectorPolicy,
  evaluatePrincipalGrounding,
  resolveOutput,
  runDispatch,
  runSingleDispatch,
  sortOutput,
};
