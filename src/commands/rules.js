'use strict';

const fs = require('fs');
const path = require('path');
const { loadRules, runRules: engineRunRules, runRule } = require('../lib/rule-engine');
const {
  SEVERITY,
  OWNER_LAYER,
  ENFORCEABILITY,
  RUNTIME_STATUS,
  RULE_DOMAIN_CONFIG,
  getRuleDomainConfig,
  suggestNextRuleId,
  buildRuleScaffold,
} = require('../lib/rules/registry');
const { readState, setRuleLifecycle, readHistory, exportGraphIngest } = require('../lib/rule-lifecycle');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Parse common flags: --json, --rule <id>
 */
function parseArgs(args = []) {
  const options = { json: false, ruleId: null, errors: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') {
      options.json = true;
    } else if ((arg === '--rule' || arg === '-r') && args[i + 1]) {
      options.ruleId = args[++i];
    } else if (arg.startsWith('--')) {
      options.errors.push(`Unknown option: ${arg}`);
    }
  }
  return options;
}

function parseLifecycleArgs(args = []) {
  const options = {
    json: false,
    status: null,
    state: null,
    note: null,
    limit: 50,
    out: null,
    errors: [],
  };

  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      options.json = true;
    } else if (arg.startsWith('--status=')) {
      options.status = arg.slice('--status='.length).trim();
    } else if (arg.startsWith('--state=')) {
      options.state = arg.slice('--state='.length).trim();
    } else if (arg.startsWith('--note=')) {
      options.note = arg.slice('--note='.length).trim();
    } else if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.slice('--limit='.length).trim());
      if (Number.isFinite(parsed) && parsed >= 0) {
        options.limit = parsed;
      } else {
        options.errors.push(`Invalid --limit value: ${arg}`);
      }
    } else if (arg.startsWith('--out=')) {
      options.out = arg.slice('--out='.length).trim();
    } else if (arg.startsWith('--')) {
      options.errors.push(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  return { options, positional };
}

function parseAuthoringArgs(args = []) {
  const options = {
    json: false,
    title: null,
    description: null,
    sourceDoc: null,
    sinceVersion: null,
    severity: SEVERITY.WARN,
    ownerLayer: OWNER_LAYER.SHARED,
    enforceability: ENFORCEABILITY.AUTO,
    runtimeStatus: RUNTIME_STATUS.PLANNED,
    out: null,
    append: false,
    errors: [],
  };

  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      options.json = true;
    } else if (arg.startsWith('--title=')) {
      options.title = arg.slice('--title='.length).trim();
    } else if (arg.startsWith('--description=')) {
      options.description = arg.slice('--description='.length).trim();
    } else if (arg.startsWith('--source-doc=')) {
      options.sourceDoc = arg.slice('--source-doc='.length).trim();
    } else if (arg.startsWith('--since-version=')) {
      options.sinceVersion = arg.slice('--since-version='.length).trim();
    } else if (arg.startsWith('--severity=')) {
      options.severity = arg.slice('--severity='.length).trim();
    } else if (arg.startsWith('--owner-layer=')) {
      options.ownerLayer = arg.slice('--owner-layer='.length).trim();
    } else if (arg.startsWith('--enforceability=')) {
      options.enforceability = arg.slice('--enforceability='.length).trim();
    } else if (arg.startsWith('--runtime-status=')) {
      options.runtimeStatus = arg.slice('--runtime-status='.length).trim();
    } else if (arg.startsWith('--out=')) {
      options.out = arg.slice('--out='.length).trim();
    } else if (arg === '--append') {
      options.append = true;
    } else if (arg.startsWith('--')) {
      options.errors.push(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  return { options, positional };
}

function indentBlock(text, spaces) {
  const prefix = ' '.repeat(spaces);
  return String(text || '')
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

function appendRuleSnippetToModule(modulePath, snippet) {
  const original = fs.readFileSync(modulePath, 'utf8');

  const registerArrayMarker = 'registerRules([';
  const registerArrayEnd = '\n]);';
  const rulesArrayMarker = 'const rules = [';
  const rulesArrayEnd = '\n];';

  if (original.includes(registerArrayMarker) && original.includes(registerArrayEnd)) {
    const insertAt = original.lastIndexOf(registerArrayEnd);
    if (insertAt < 0) {
      throw new Error(`Unable to locate registerRules array terminator in ${modulePath}`);
    }
    const indentedSnippet = indentBlock(snippet, 2);
    return `${original.slice(0, insertAt)},\n\n${indentedSnippet}${original.slice(insertAt)}`;
  }

  if (original.includes(rulesArrayMarker) && original.includes(rulesArrayEnd)) {
    const insertAt = original.indexOf(rulesArrayEnd, original.indexOf(rulesArrayMarker));
    if (insertAt < 0) {
      throw new Error(`Unable to locate rules array terminator in ${modulePath}`);
    }
    const indentedSnippet = indentBlock(snippet, 2);
    return `${original.slice(0, insertAt)},\n${indentedSnippet}${original.slice(insertAt)}`;
  }

  throw new Error(`Unsupported rule module shape for append: ${modulePath}`);
}

function isKnownEnumValue(value, enumObject) {
  return Object.values(enumObject).includes(value);
}

function normalizeDomain(domain) {
  return String(domain || '').trim().toUpperCase();
}

function validateAuthoringOptions(domain, options) {
  const errors = [...options.errors];
  const normalizedDomain = normalizeDomain(domain);
  if (!getRuleDomainConfig(normalizedDomain)) {
    errors.push(`Unknown rule domain: ${domain}. Supported: ${Object.keys(RULE_DOMAIN_CONFIG).join(', ')}`);
  }
  if (!options.title) errors.push('Missing required option: --title');
  if (!options.description) errors.push('Missing required option: --description');
  if (!options.sourceDoc) errors.push('Missing required option: --source-doc');
  if (!options.sinceVersion) errors.push('Missing required option: --since-version');
  if (!isKnownEnumValue(options.severity, SEVERITY)) {
    errors.push(`Invalid --severity value: ${options.severity}`);
  }
  if (!isKnownEnumValue(options.ownerLayer, OWNER_LAYER)) {
    errors.push(`Invalid --owner-layer value: ${options.ownerLayer}`);
  }
  if (!isKnownEnumValue(options.enforceability, ENFORCEABILITY)) {
    errors.push(`Invalid --enforceability value: ${options.enforceability}`);
  }
  if (!isKnownEnumValue(options.runtimeStatus, RUNTIME_STATUS)) {
    errors.push(`Invalid --runtime-status value: ${options.runtimeStatus}`);
  }
  if (options.sourceDoc) {
    const sourceDocPath = path.join(PROJECT_ROOT, options.sourceDoc);
    if (!fs.existsSync(sourceDocPath)) {
      errors.push(`source_doc path not found: ${options.sourceDoc}`);
    }
  }
  return errors;
}

/**
 * kbx rules lint [--json]
 * Run all rules against the current KB and report violations.
 */
async function runLint({ args = [], cwd = process.cwd() } = {}) {
  const options = parseArgs(args);
  if (options.errors.length > 0) {
    for (const e of options.errors) console.error(e);
    process.exitCode = 1;
    return;
  }

  const kbPath = cwd;
  const { violations, rulesRun } = engineRunRules(kbPath);

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx rules lint',
      kbPath,
      rulesRun,
      violationCount: violations.length,
      violations,
    }, null, 2));
  } else {
    const errors = violations.filter(v => v.severity === 'error');
    const warns = violations.filter(v => v.severity === 'warn');
    console.log(`Rules run: ${rulesRun}   Violations: ${violations.length} (${errors.length} error, ${warns.length} warn)`);
    if (violations.length === 0) {
      console.log('No violations found.');
    } else {
      for (const v of violations) {
        const loc = v.file ? `  ${v.file}` : '';
        console.log(`  [${v.severity.toUpperCase()}] ${v.rule_id}${loc}: ${v.message}`);
      }
    }
  }

  if (violations.filter(v => v.severity === 'error').length > 0) {
    process.exitCode = 1;
  }
}

/**
 * kbx rules check <rule-id> [--json]
 * Run a single rule by ID and report result.
 */
async function runCheck({ args = [], cwd = process.cwd() } = {}) {
  // First non-flag arg is the rule id
  const nonFlags = args.filter(a => !a.startsWith('--'));
  const options = parseArgs(args.filter(a => a.startsWith('--')));

  const ruleId = nonFlags[0];
  if (!ruleId) {
    console.error('Usage: kbx rules check <rule-id> [--json]');
    process.exitCode = 1;
    return;
  }

  const kbPath = cwd;
  const { found, violations } = runRule(kbPath, ruleId);

  if (!found) {
    if (options.json) {
      console.log(JSON.stringify({ rule_id: ruleId, found: false }));
    } else {
      console.error(`Rule not found: ${ruleId}`);
    }
    process.exitCode = 1;
    return;
  }

  const passed = violations.length === 0;
  if (options.json) {
    console.log(JSON.stringify({ rule_id: ruleId, found: true, passed, violations }));
  } else {
    if (passed) {
      console.log(`[PASS] ${ruleId}: no violations`);
    } else {
      console.log(`[FAIL] ${ruleId}: ${violations.length} violation(s)`);
      for (const v of violations) {
        const loc = v.file ? `  ${v.file}` : '';
        console.log(`  [${v.severity.toUpperCase()}]${loc}: ${v.message}`);
      }
      process.exitCode = 1;
    }
  }
}

/**
 * kbx rules list [--json]
 * List all registered rules with metadata.
 */
function runList({ args = [] } = {}) {
  const options = parseArgs(args);
  const rules = loadRules();

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx rules list',
      count: rules.length,
      rules: rules.map(r => ({
        id: r.id,
        title: r.title,
        severity: r.severity,
        description: r.description,
        owner_layer: r.owner_layer,
        enforceability: r.enforceability,
        runtime_status: r.runtime_status,
        since_version: r.since_version,
        source_doc: r.source_doc || null,
      })),
    }, null, 2));
  } else {
    console.log(`Registered rules: ${rules.length}`);
    for (const r of rules) {
      console.log(`  ${r.id}  [${r.severity}]  ${r.description}`);
      if (r.source_doc) console.log(`    source: ${r.source_doc}`);
    }
  }
}

function runNextId({ args = [] } = {}) {
  const { options, positional } = parseAuthoringArgs(args);
  const domain = normalizeDomain(positional[0]);
  const domainConfig = getRuleDomainConfig(domain);

  if (options.errors.length > 0 || !domainConfig) {
    const errors = [...options.errors];
    if (!domainConfig) {
      errors.push(`Usage: kbx rules next-id <domain> [--json]`);
      errors.push(`Supported domains: ${Object.keys(RULE_DOMAIN_CONFIG).join(', ')}`);
    }
    for (const error of errors) console.error(error);
    process.exitCode = 1;
    return;
  }

  const nextRuleId = suggestNextRuleId(loadRules(), domain);
  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx rules next-id',
      domain,
      next_rule_id: nextRuleId,
      module_path: domainConfig.module_path,
    }, null, 2));
    return;
  }

  console.log(`Next rule ID for ${domain}: ${nextRuleId}`);
  console.log(`Module: ${domainConfig.module_path}`);
}

function runScaffold({ args = [] } = {}) {
  const { options, positional } = parseAuthoringArgs(args);
  const domain = normalizeDomain(positional[0]);
  const errors = validateAuthoringOptions(domain, options);
  const domainConfig = getRuleDomainConfig(domain);

  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    console.error('Usage: kbx rules scaffold <domain> --title="..." --description="..." --source-doc=path --since-version=vX.Y.Z [--severity=warn] [--owner-layer=shared] [--enforceability=auto] [--runtime-status=planned] [--out=path] [--json]');
    process.exitCode = 1;
    return;
  }

  const ruleId = suggestNextRuleId(loadRules(), domain);
  const snippet = buildRuleScaffold({
    ruleId,
    title: options.title,
    description: options.description,
    severity: options.severity,
    ownerLayer: options.ownerLayer,
    enforceability: options.enforceability,
    runtimeStatus: options.runtimeStatus,
    sinceVersion: options.sinceVersion,
    sourceDoc: options.sourceDoc,
  });

  const modulePath = path.join(PROJECT_ROOT, domainConfig.module_path);
  let appended = false;

  try {
    if (options.append) {
      const updatedModule = appendRuleSnippetToModule(modulePath, snippet);
      fs.writeFileSync(modulePath, updatedModule, 'utf8');
      appended = true;
    }

    if (options.out) {
      const outPath = path.isAbsolute(options.out) ? options.out : path.join(process.cwd(), options.out);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, `${snippet}\n`, 'utf8');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx rules scaffold',
      domain,
      rule_id: ruleId,
      module_path: domainConfig.module_path,
      appended,
      out: options.out || null,
      snippet,
    }, null, 2));
    return;
  }

  console.log(`Scaffolded ${ruleId}`);
  console.log(`Target module: ${domainConfig.module_path}`);
  if (appended) {
    console.log('Append: applied to canonical rule module');
  }
  if (options.out) {
    console.log(`Output file: ${options.out}`);
  }
  console.log('');
  console.log(snippet);
}

function runLifecycleStatus({ args = [], cwd = process.cwd() } = {}) {
  const { options } = parseLifecycleArgs(args);
  if (options.errors.length > 0) {
    for (const e of options.errors) console.error(e);
    process.exitCode = 1;
    return;
  }

  const snapshot = readState(cwd);
  const rules = Object.values(snapshot.state.rules || {}).sort((a, b) => a.rule_id.localeCompare(b.rule_id));

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx rules lifecycle status',
      count: rules.length,
      updated_at: snapshot.state.updated_at,
      rules,
    }, null, 2));
    return;
  }

  console.log(`Rule lifecycle records: ${rules.length}`);
  for (const record of rules) {
    console.log(`  ${record.rule_id}  status=${record.status}  state=${record.state}`);
  }
}

function runLifecycleSet({ args = [], cwd = process.cwd() } = {}) {
  const { options, positional } = parseLifecycleArgs(args);
  if (options.errors.length > 0) {
    for (const e of options.errors) console.error(e);
    process.exitCode = 1;
    return;
  }

  const ruleId = positional[0];
  if (!ruleId) {
    console.error('Usage: kbx rules lifecycle set <rule-id> [--status=...] [--state=...] [--note=...] [--json]');
    process.exitCode = 1;
    return;
  }

  if (!options.status && !options.state) {
    console.error('kbx rules lifecycle set requires --status and/or --state.');
    process.exitCode = 1;
    return;
  }

  const result = setRuleLifecycle(cwd, {
    ruleId,
    status: options.status || undefined,
    state: options.state || undefined,
    note: options.note || null,
  });

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx rules lifecycle set',
      rule: result.rule,
      event: result.event,
    }, null, 2));
    return;
  }

  console.log(`[OK] ${result.rule.rule_id} status=${result.rule.status} state=${result.rule.state}`);
}

function runLifecycleHistory({ args = [], cwd = process.cwd() } = {}) {
  const { options, positional } = parseLifecycleArgs(args);
  if (options.errors.length > 0) {
    for (const e of options.errors) console.error(e);
    process.exitCode = 1;
    return;
  }

  const ruleId = positional[0] || null;
  const events = readHistory(cwd, { ruleId, limit: options.limit });

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kbx rules lifecycle history',
      rule_id: ruleId,
      count: events.length,
      events,
    }, null, 2));
    return;
  }

  console.log(`Rule lifecycle history: ${events.length}`);
  for (const event of events) {
    console.log(`  ${event.ts}  ${event.rule_id}  ${event.from_status}->${event.to_status}  ${event.from_state}->${event.to_state}`);
  }
}

function runLifecycleExport({ args = [], cwd = process.cwd() } = {}) {
  const { options } = parseLifecycleArgs(args);
  if (options.errors.length > 0) {
    for (const e of options.errors) console.error(e);
    process.exitCode = 1;
    return;
  }

  const payload = exportGraphIngest(cwd, { includeHistory: true });

  if (options.out) {
    const outPath = path.isAbsolute(options.out) ? options.out : path.join(cwd, options.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
    if (!options.json) {
      console.log(`Graph ingest export written: ${outPath}`);
      return;
    }
  }

  if (options.json || !options.out) {
    console.log(JSON.stringify({
      command: 'kbx rules lifecycle export',
      ...payload,
    }, null, 2));
  }
}

function runLifecycle({ args = [], cwd = process.cwd() } = {}) {
  const [sub = 'status', ...rest] = args;
  if (sub === 'status') {
    runLifecycleStatus({ args: rest, cwd });
    return;
  }
  if (sub === 'set') {
    runLifecycleSet({ args: rest, cwd });
    return;
  }
  if (sub === 'history') {
    runLifecycleHistory({ args: rest, cwd });
    return;
  }
  if (sub === 'export') {
    runLifecycleExport({ args: rest, cwd });
    return;
  }
  console.error(`Unknown rules lifecycle subcommand: ${sub}. Use status | set | history | export.`);
  process.exitCode = 1;
}

/**
 * kbx rules help
 */
function runRulesHelp() {
  console.log('kbx rules — KB governance rule engine\n');
  console.log('Commands:');
  console.log('  kbx rules lint [--json]            Run all rules against the KB. Exit 1 if errors found.');
  console.log('  kbx rules check <rule-id> [--json] Run a single rule by ID.');
  console.log('  kbx rules list [--json]            List all registered rules.');
  console.log('  kbx rules next-id <domain> [--json]');
  console.log('                                    Suggest the next deterministic rule ID and target module.');
  console.log('  kbx rules scaffold <domain> --title="..." --description="..." --source-doc=path --since-version=vX.Y.Z [--severity=warn] [--owner-layer=shared] [--enforceability=auto] [--runtime-status=planned] [--out=path] [--append] [--json]');
  console.log('                                    Generate a canonical rule scaffold; optionally append it to the canonical rule module with guarded shape checks.');
  console.log('  kbx rules lifecycle status [--json]');
  console.log('                                    Show rule lifecycle state skeleton.');
  console.log('  kbx rules lifecycle set <rule-id> [--status=...] [--state=...] [--note=...] [--json]');
  console.log('                                    Update rule lifecycle status/state and append history event.');
  console.log('  kbx rules lifecycle history [rule-id] [--limit=N] [--json]');
  console.log('                                    Show lifecycle history events.');
  console.log('  kbx rules lifecycle export [--out=path] [--json]');
  console.log('                                    Export lifecycle graph payload for graph-ingest bridge.');
  console.log('  kbx rules help                     Show this help.');
  console.log('');
  console.log('Severity:');
  console.log('  error   Rule violation fails the lint check (exit 1).');
  console.log('  warn    Rule violation reported but does not fail exit code.');
}

/**
 * Main entrypoint: kbx rules <subcommand> [args]
 */
async function runRulesCommand({ args = [], cwd = process.cwd() } = {}) {
  const [subcommand = 'help', ...rest] = args;

  if (subcommand === 'lint') {
    await runLint({ args: rest, cwd });
  } else if (subcommand === 'check') {
    await runCheck({ args: rest, cwd });
  } else if (subcommand === 'list') {
    runList({ args: rest });
  } else if (subcommand === 'next-id') {
    runNextId({ args: rest });
  } else if (subcommand === 'scaffold') {
    runScaffold({ args: rest });
  } else if (subcommand === 'lifecycle') {
    runLifecycle({ args: rest, cwd });
  } else if (subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    runRulesHelp();
  } else {
    console.error(`Unknown rules subcommand: ${subcommand}. Run 'kbx rules help' for usage.`);
    process.exitCode = 1;
  }
}

module.exports = { runRules: runRulesCommand };
