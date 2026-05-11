const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { resolveOutput, selectApplicableRules, resolveSelectorPolicy } = require('./dispatch');

function parsePreviewArgs(args) {
  const options = {
    subcommand: 'preview',
    request: null,
    dryRun: false,
    json: false,
  };

  const positional = [];
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
    if (arg.startsWith('--request=')) {
      options.request = arg.slice('--request='.length).trim();
      continue;
    }
    if (arg === '--request') {
      const next = (args || [])[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('kbx plan: --request requires a text value');
      }
      options.request = String(next).trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown plan option "${arg}" for preview mode.`);
    }
    positional.push(arg);
  }

  if (positional.length > 0) {
    throw new Error('kbx plan preview does not accept positional arguments. Use --request "..." --dry-run [--json].');
  }

  if (!options.request) {
    throw new Error('kbx plan preview requires --request "...".');
  }

  if (!options.dryRun) {
    throw new Error('kbx plan preview currently supports dry-run only. Pass --dry-run.');
  }

  return options;
}

function detectIntentType(request) {
  const text = String(request || '').toLowerCase();
  if (/\brelease\b|\bpublish\b|\bversion\b/.test(text)) return 'release';
  if (/\brecover\b|\brollback\b|\brestore\b/.test(text)) return 'recover';
  if (/\bverify\b|\bvalidate\b|\bcheck\b|\btest\b/.test(text)) return 'verify';
  if (/\bcreate\b|\bnew\b|\badd\b|\bintroduce\b/.test(text)) return 'create';
  if (/\bimplement\b|\bfix\b|\bupdate\b|\bchange\b/.test(text)) return 'update';
  if (/\brefactor\b|\brename\b|\brestructure\b/.test(text)) return 'refactor';
  if (/\bexplain\b|\banalyze\b|\binspect\b/.test(text)) return 'explain';
  return 'update';
}

function detectTargetScope(request) {
  const text = String(request || '').toLowerCase();

  if (/\bgraph\b|\bingest\b|\blane\b/.test(text)) return 'graph';
  if (/\brule\b|\bpolicy\b|\bprinciple\b|\bcontract\b|\bgate\b/.test(text)) return 'rules';
  if (/\brelease\b|\btag\b|\bnotes\b/.test(text)) return 'release';
  if (/\bpackage\.json\b|\bdependency\b|\bdeps\b|\blockfile\b/.test(text)) return 'package';
  if (/\btemplate\b|\bprompt\b|\bagent\.md\b|\bcopilot-instructions\b/.test(text)) return 'template';
  if (/\bsrc\b|\bcli\b|\bcommand\b|\bruntime\b|\bcode\b|\bimplement\b|\bbug\b|\bfix\b/.test(text)) return 'source';
  return 'docs';
}

function detectMutationClass(scope, request) {
  const text = String(request || '').toLowerCase();
  if (scope === 'release') return 'release-changing';
  if (scope === 'source' || scope === 'package') return 'source-changing';
  if (scope === 'rules' || scope === 'template') return 'contract-changing';
  if (/read-only|analy[sz]e|inspect|explain/.test(text)) return 'read-only';
  return 'docs-only';
}

function inferOntologyEntity(scope) {
  if (scope === 'rules') return 'Rule';
  if (scope === 'release') return 'Release';
  if (scope === 'source' || scope === 'package') return 'Module';
  return 'Artifact';
}

function inferRiskLevel(mutationClass) {
  if (mutationClass === 'release-changing' || mutationClass === 'source-changing') return 'high';
  if (mutationClass === 'contract-changing') return 'medium';
  return 'low';
}

function inferEvidenceState(mutationClass) {
  if (mutationClass === 'read-only') return 'sufficient';
  if (mutationClass === 'docs-only') return 'sufficient';
  return 'partial';
}

function previewPathsForScope(scope) {
  if (scope === 'source') return ['src/**', 'test/**', 'bin/**'];
  if (scope === 'rules') return ['src/lib/rules/**', 'template/15-governance/**', 'test/lib/**'];
  if (scope === 'template') return ['template/**', '.github/**'];
  if (scope === 'release') return ['knowledge-base/16-release-pipelines/**', 'CHANGELOG.md', '.kb/catalog.json'];
  if (scope === 'package') return ['package.json', 'pnpm-lock.yaml', 'package-lock.json'];
  if (scope === 'graph') return ['knowledge-base/.kb/graph-ingest/**', 'src/commands/graph.js'];
  return ['knowledge-base/**', 'template/**'];
}

function previewChecksForScope(scope) {
  if (scope === 'source' || scope === 'rules') {
    return [
      'node --test test/commands/dispatch.test.js',
      'node --test test/commands/inspect.test.js',
    ];
  }
  if (scope === 'release') {
    return [
      'node ./bin/kbx.js release plan --json',
      'node ./bin/kbx.js doctor --json',
    ];
  }
  return [
    'node ./bin/kbx.js verify --all --json',
    'node ./bin/kbx.js status --json',
  ];
}

function buildPreviewPlan(request) {
  const intentType = detectIntentType(request);
  const targetScope = detectTargetScope(request);
  const mutationClass = detectMutationClass(targetScope, request);

  const tuple = {
    intent_type: intentType,
    intent_state: 'active',
    ontology_entity: inferOntologyEntity(targetScope),
    target_scope: targetScope,
    mutation_class: mutationClass,
    risk_level: inferRiskLevel(mutationClass),
    evidence_state: inferEvidenceState(mutationClass),
    actor_mode: 'agent-assisted',
  };

  const selected = selectApplicableRules(tuple);
  const dispatch = resolveOutput(tuple);

  return {
    mode: 'preview',
    dry_run: true,
    write_intent: false,
    request,
    classification: {
      intent_type: intentType,
      target_scope: targetScope,
      mutation_class: mutationClass,
    },
    suggestion: {
      dispatch_tuple: tuple,
      selector_policy: resolveSelectorPolicy('execution'),
      primary_pipe: dispatch.primary_pipe,
      applicable_rules: selected.applicable_rules,
      required_gates: dispatch.required_gates,
      allowed_actions: dispatch.allowed_actions,
      verification_requirements: dispatch.verification_requirements,
      fallback_or_escalation: dispatch.fallback_or_escalation,
      explainability: {
        tuple_to_rule_basis: selected.tuple_to_rule_basis,
        skipped_rule_families: selected.skipped_rule_families,
      },
    },
    proposed_patch_plan: {
      target_paths: previewPathsForScope(targetScope),
      planned_steps: [
        'Capture current state and constraints from request.',
        'Prepare minimal patch set scoped to classified target paths.',
        'Run focused verification commands and collect deterministic output.',
      ],
      verification_commands: previewChecksForScope(targetScope),
      write_operations: [],
    },
  };
}

function parseArgs(args) {
  if ((args || []).some((arg) => arg === '--request' || String(arg).startsWith('--request='))) {
    return parsePreviewArgs(args);
  }

  const [subcommand = 'list', ...rest] = args;

  if (subcommand === 'add') {
    const text = rest.join(' ').trim();
    if (!text) {
      throw new Error('Usage: kbx plan add "<description>" [--owner <name>] [--priority P0|P1|P2]');
    }

    const options = { subcommand: 'add', text, owner: 'knowledge-management', priority: 'P1' };
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '--owner' && rest[i + 1]) {
        options.owner = rest[i + 1];
        i++;
      } else if (rest[i] === '--priority' && rest[i + 1]) {
        options.priority = rest[i + 1];
        i++;
      }
    }

    // text is everything before first --flag
    const textEnd = rest.findIndex((r) => r.startsWith('--'));
    options.text = (textEnd === -1 ? rest : rest.slice(0, textEnd)).join(' ').trim();
    if (!options.text) {
      throw new Error('kbx plan add requires a non-empty description.');
    }

    return options;
  }

  if (subcommand === 'list') {
    return { subcommand: 'list' };
  }

  throw new Error(`Unknown plan subcommand "${subcommand}". Use: kbx plan add "<text>" | kbx plan list`);
}

function resolvePlanPath(cwd) {
  const context = resolveExistingState({ workspaceRoot: cwd });
  const strategicPath = path.join(context.contentRoot, '00-start-here', 'strategic-backlog.md');
  const legacyPath = path.join(context.contentRoot, '00-start-here', 'finalization-plan.md');

  if (fs.existsSync(strategicPath)) {
    return strategicPath;
  }
  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }

  // Default path for freshly initialized or not-yet-created queues.
  return strategicPath;
}

function nextId(content) {
  const matches = [...content.matchAll(/\|\s*(KB-\d+)\s*\|/g)];
  if (matches.length === 0) {
    return 'KB-100';
  }

  const nums = matches
    .map((m) => parseInt(m[1].replace('KB-', ''), 10))
    .filter((n) => !Number.isNaN(n));

  const max = Math.max(...nums);
  return `KB-${String(max + 1).padStart(3, '0')}`;
}

function addPlanItem({ planPath, text, owner, priority }) {
  if (!fs.existsSync(planPath)) {
    throw new Error(`Queue file not found at: ${planPath}. Expected strategic-backlog.md (or legacy finalization-plan.md). Run kbx init first.`);
  }

  const content = fs.readFileSync(planPath, 'utf8');
  const id = nextId(content);
  const today = new Date().toISOString().slice(0, 10);
  const newRow = `| ${id} | ${text} | ${owner} | ${priority} | ${today} | todo | |`;

  // Insert before the first "## Add / Edit / Delete" section or at end of last table row
  const insertMarker = '## Add / Edit / Delete';
  if (content.includes(insertMarker)) {
    const updated = content.replace(insertMarker, `${newRow}\n\n${insertMarker}`);
    fs.writeFileSync(planPath, updated, 'utf8');
  } else {
    // Append to end of file
    const updated = content.trimEnd() + '\n' + newRow + '\n';
    fs.writeFileSync(planPath, updated, 'utf8');
  }

  return id;
}

function listPlanItems({ planPath }) {
  if (!fs.existsSync(planPath)) {
    throw new Error(`Queue file not found at: ${planPath}. Expected strategic-backlog.md (or legacy finalization-plan.md). Run kbx init first.`);
  }

  const content = fs.readFileSync(planPath, 'utf8');
  const rows = [];

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\|\s*(KB-\d+)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|/);
    if (!match) continue;
    const [, id, item, owner, priority, due, status] = match;
    if (id === 'ID') continue; // header row
    rows.push({ id, item, owner, priority, due, status: status.trim() });
  }

  return rows;
}

async function runPlan({ args, cwd }) {
  const options = parseArgs(args);

  if (options.subcommand === 'preview') {
    const payload = {
      command: 'kbx plan',
      ...buildPreviewPlan(options.request),
    };

    if (options.json) {
      console.log(JSON.stringify(payload, null, 2));
    } else {
      console.log('kbx plan preview (dry-run)');
      console.log(`  request: ${payload.request}`);
      console.log(`  target_scope: ${payload.classification.target_scope}`);
      console.log(`  mutation_class: ${payload.classification.mutation_class}`);
      console.log(`  primary_pipe: ${payload.suggestion.primary_pipe || 'null'}`);
      console.log(`  fallback_or_escalation: ${payload.suggestion.fallback_or_escalation || 'none'}`);
      console.log(`  target_paths: ${payload.proposed_patch_plan.target_paths.join(', ')}`);
    }

    if (payload.suggestion.fallback_or_escalation === 'HumanGateRequired') {
      process.exitCode = 1;
    }
    return;
  }

  if (options.subcommand === 'add') {
    const planPath = resolvePlanPath(cwd);
    const id = addPlanItem({ planPath, text: options.text, owner: options.owner, priority: options.priority });
    console.log(`Added: ${id} — ${options.text}`);
    return;
  }

  if (options.subcommand === 'list') {
    const planPath = resolvePlanPath(cwd);
    const items = listPlanItems({ planPath });

    if (items.length === 0) {
      console.log('No plan items found.');
      return;
    }

    const pending = items.filter((r) => r.status !== 'done');
    const done = items.filter((r) => r.status === 'done');
    console.log(`\nPending (${pending.length}):`);
    for (const r of pending) {
      console.log(`  [${r.priority}] ${r.id} — ${r.item} (${r.status})`);
    }

    if (done.length > 0) {
      console.log(`\nDone (${done.length}):`);
      for (const r of done) {
        console.log(`  ${r.id} — ${r.item}`);
      }
    }
  }
}

module.exports = {
  parseArgs,
  parsePreviewArgs,
  buildPreviewPlan,
  runPlan,
};
