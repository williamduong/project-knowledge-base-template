'use strict';

const fs = require('fs');
const path = require('path');

const { resolveOutput, selectApplicableRules, resolveSelectorPolicy } = require('./dispatch');

function parseInspectArgs(args) {
  const options = {
    targetPath: null,
    json: false,
  };

  const positional = [];
  for (let i = 0; i < (args || []).length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg.startsWith('--path=')) {
      options.targetPath = arg.slice('--path='.length).trim();
      continue;
    }
    if (arg === '--path') {
      const next = (args || [])[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('kbx inspect: --path requires a file or directory path');
      }
      options.targetPath = String(next).trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(`Unknown inspect option "${arg}". Supported: --path <file-or-folder>, --json`);
    }
    positional.push(arg);
  }

  if (positional.length > 0) {
    throw new Error('kbx inspect does not accept positional arguments. Use --path <file-or-folder>.');
  }

  if (!options.targetPath) {
    throw new Error('kbx inspect requires --path <file-or-folder>.');
  }

  return options;
}

function classifyTargetScope(relativePath, kind) {
  const rel = String(relativePath || '').replace(/\\/g, '/').toLowerCase();
  const base = path.posix.basename(rel);

  if (rel.includes('/.kb/graph-ingest/') || rel.endsWith('/.kb/graph-ingest') || rel.endsWith('/.kb/graph-ingest/')) {
    return {
      targetScope: 'graph',
      reasons: ['path under graph-ingest lane artifacts'],
      confidence: 'high',
    };
  }

  if (
    base === 'package.json'
    || base === 'pnpm-lock.yaml'
    || base === 'package-lock.json'
    || base === 'yarn.lock'
    || base === 'npm-shrinkwrap.json'
  ) {
    return {
      targetScope: 'package',
      reasons: ['package manifest or lockfile detected'],
      confidence: 'high',
    };
  }

  if (rel.includes('/release/') || base === 'changelog.md' || base.startsWith('release-')) {
    return {
      targetScope: 'release',
      reasons: ['release path marker or release artifact name detected'],
      confidence: 'medium',
    };
  }

  if (rel.startsWith('src/') || rel.startsWith('bin/') || rel.startsWith('scripts/') || rel.startsWith('test/')) {
    return {
      targetScope: 'source',
      reasons: ['path in executable/runtime source area'],
      confidence: 'high',
    };
  }

  if (rel.startsWith('src/lib/rules/') || rel.includes('/rules/')) {
    return {
      targetScope: 'rules',
      reasons: ['rule engine path marker detected'],
      confidence: 'high',
    };
  }

  if (rel.startsWith('template/15-governance/')) {
    const isRuleLike = /rule|dispatch|gate|contract|tuple|selector/.test(base);
    if (isRuleLike) {
      return {
        targetScope: 'rules',
        reasons: ['governance contract artifact detected'],
        confidence: 'medium',
      };
    }
  }

  if (rel.startsWith('template/')) {
    return {
      targetScope: 'template',
      reasons: ['path under template content root'],
      confidence: 'high',
    };
  }

  if (rel.startsWith('knowledge-base/')) {
    return {
      targetScope: 'docs',
      reasons: ['path under knowledge-base content root'],
      confidence: 'high',
    };
  }

  if (kind === 'directory') {
    return {
      targetScope: 'docs',
      reasons: ['directory target defaults to docs scope'],
      confidence: 'low',
    };
  }

  return {
    targetScope: 'docs',
    reasons: ['fallback classification defaults to docs scope'],
    confidence: 'low',
  };
}

function classifyMutationClass(targetScope) {
  if (targetScope === 'release') return 'release-changing';
  if (targetScope === 'source' || targetScope === 'package') return 'source-changing';
  if (targetScope === 'rules' || targetScope === 'template') return 'contract-changing';
  if (targetScope === 'graph') return 'docs-only';
  return 'docs-only';
}

function inferOntologyEntity(targetScope) {
  if (targetScope === 'rules') return 'Rule';
  if (targetScope === 'release') return 'Release';
  if (targetScope === 'source' || targetScope === 'package') return 'Module';
  if (targetScope === 'graph') return 'Artifact';
  return 'Artifact';
}

function inferRiskLevel(targetScope) {
  if (targetScope === 'release') return 'high';
  if (targetScope === 'source' || targetScope === 'package') return 'high';
  if (targetScope === 'rules' || targetScope === 'template') return 'medium';
  return 'low';
}

function inferEvidenceState(targetScope) {
  if (targetScope === 'docs' || targetScope === 'graph') return 'sufficient';
  return 'partial';
}

function buildInspectionTuple(targetScope, mutationClass) {
  return {
    intent_type: 'update',
    intent_state: 'active',
    ontology_entity: inferOntologyEntity(targetScope),
    target_scope: targetScope,
    mutation_class: mutationClass,
    risk_level: inferRiskLevel(targetScope),
    evidence_state: inferEvidenceState(targetScope),
    actor_mode: 'agent-assisted',
  };
}

function inspectTarget({ targetPath, cwd }) {
  const resolvedPath = path.resolve(cwd, targetPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Inspect target not found: ${resolvedPath}`);
  }

  const stat = fs.statSync(resolvedPath);
  const kind = stat.isDirectory() ? 'directory' : 'file';
  const relativePath = path.relative(cwd, resolvedPath).replace(/\\/g, '/');
  const scope = classifyTargetScope(relativePath, kind);
  const mutationClass = classifyMutationClass(scope.targetScope);
  const tuple = buildInspectionTuple(scope.targetScope, mutationClass);
  const selection = selectApplicableRules(tuple);
  const dispatchOutput = resolveOutput(tuple);

  return {
    command: 'kbx inspect',
    target: {
      input_path: targetPath,
      resolved_path: resolvedPath,
      workspace_relative_path: relativePath,
      kind,
    },
    classification: {
      target_scope: scope.targetScope,
      mutation_class: mutationClass,
      confidence: scope.confidence,
      reasons: scope.reasons,
    },
    suggestion: {
      dispatch_tuple: tuple,
      selector_policy: resolveSelectorPolicy('execution'),
      primary_pipe: dispatchOutput.primary_pipe,
      applicable_rules: selection.applicable_rules,
      required_gates: dispatchOutput.required_gates,
      allowed_actions: dispatchOutput.allowed_actions,
      verification_requirements: dispatchOutput.verification_requirements,
      fallback_or_escalation: dispatchOutput.fallback_or_escalation,
      explainability: {
        tuple_to_rule_basis: selection.tuple_to_rule_basis,
        skipped_rule_families: selection.skipped_rule_families,
      },
    },
  };
}

function runInspect({ args, cwd }) {
  let options;
  try {
    options = parseInspectArgs(args);
  } catch (error) {
    console.log(JSON.stringify({
      command: 'kbx inspect',
      ok: false,
      error: error.message,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  let payload;
  try {
    payload = inspectTarget({ targetPath: options.targetPath, cwd });
  } catch (error) {
    console.log(JSON.stringify({
      command: 'kbx inspect',
      ok: false,
      error: error.message,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    if (payload.suggestion.fallback_or_escalation === 'HumanGateRequired') {
      process.exitCode = 1;
    }
    return;
  }

  console.log(`kbx inspect: ${payload.target.workspace_relative_path}`);
  console.log(`  kind: ${payload.target.kind}`);
  console.log(`  target_scope: ${payload.classification.target_scope}`);
  console.log(`  mutation_class: ${payload.classification.mutation_class}`);
  console.log(`  suggested_pipe: ${payload.suggestion.primary_pipe || 'null'}`);
  console.log(`  fallback_or_escalation: ${payload.suggestion.fallback_or_escalation || 'none'}`);
  console.log(`  required_gates: ${payload.suggestion.required_gates.join(', ')}`);
  console.log(`  applicable_rules: ${payload.suggestion.applicable_rules.join(', ')}`);

  if (payload.suggestion.fallback_or_escalation === 'HumanGateRequired') {
    process.exitCode = 1;
  }
}

module.exports = {
  parseInspectArgs,
  classifyTargetScope,
  classifyMutationClass,
  inspectTarget,
  runInspect,
};
