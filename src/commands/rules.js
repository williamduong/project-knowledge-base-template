'use strict';

const path = require('path');
const { loadRules, runRules: engineRunRules, runRule } = require('../lib/rule-engine');

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

/**
 * kbx rules help
 */
function runRulesHelp() {
  console.log('kbx rules — KB governance rule engine\n');
  console.log('Commands:');
  console.log('  kbx rules lint [--json]            Run all rules against the KB. Exit 1 if errors found.');
  console.log('  kbx rules check <rule-id> [--json] Run a single rule by ID.');
  console.log('  kbx rules list [--json]            List all registered rules.');
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
  } else if (subcommand === 'help' || subcommand === '--help' || subcommand === '-h') {
    runRulesHelp();
  } else {
    console.error(`Unknown rules subcommand: ${subcommand}. Run 'kbx rules help' for usage.`);
    process.exitCode = 1;
  }
}

module.exports = { runRules: runRulesCommand };
