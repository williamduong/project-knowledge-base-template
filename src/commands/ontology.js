'use strict';

const {
  SaaSNodeDNA,
  IntentSchema,
  TerminologyRegistry,
  StateTransitionGuards,
  validateIntent,
  validateSaaSNode,
  resolveTerminology,
  checkCrossRepoGrant,
  verifyMutation,
  CypherTemplates,
  validateGlossary,
  auditNaturalLanguageTerms,
} = require('../lib/ontology');

/**
 * Parse command-line arguments for ontology commands
 */
function parseArgs(args = []) {
  const options = {
    json: false,
    input: null,
    output: null,
    graphState: null,
    glossary: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--input' && args[i + 1]) {
      options.input = args[++i];
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (arg === '--graph-state' && args[i + 1]) {
      options.graphState = args[++i];
    } else if (arg === '--glossary' && args[i + 1]) {
      options.glossary = args[++i];
    }
  }

  return options;
}

/**
 * Command: kbx ontology show
 * Display ontology schema in human-readable format
 */
function showOntology(options = {}) {
  const sections = [];

  // Header
  sections.push('=== KB Ontology Schema (v2.6) ===\n');

  // Terminology Registry
  sections.push('## Terminology Registry (10 Core Entities)\n');
  Object.entries(TerminologyRegistry).forEach(([name, entry]) => {
    sections.push(`\n### ${entry.canonical_name}`);
    sections.push(`- Repo Origin: ${entry.repo_origin}`);
    sections.push(`- Aliases: ${entry.aliases.join(', ')}`);
    if (entry.microsoft_cdm_mapping) {
      sections.push(`- CDM Mapping: ${entry.microsoft_cdm_mapping}`);
    }
  });

  // State Machine
  sections.push('\n\n## Intent Lifecycle (5-State Machine)\n');
  sections.push('States: DRAFT → PROPOSED → VERIFIED → EXECUTED → COMMITTED\n');
  Object.entries(StateTransitionGuards).forEach(([state, guard]) => {
    sections.push(`\n### ${state}`);
    if (guard.allowedTo.length > 0) {
      sections.push(`- Allowed to: ${guard.allowedTo.join(', ')}`);
    } else {
      sections.push('- Allowed to: (final state)');
    }
  });

  // Schema Info
  sections.push('\n\n## Schema Definitions\n');
  sections.push('### Intent Node Type');
  sections.push('- id (UUID, required)');
  sections.push('- repo_origin (Enum, required): [billing, auth, gateway, infrastructure]');
  sections.push('- canonical_name (String, required)');
  sections.push('- lifecycle (Enum, required): [DRAFT, PROPOSED, VERIFIED, EXECUTED, COMMITTED]');
  sections.push('- title (String, required)');
  sections.push('- riskLevel (Enum, required): [Low, Medium, High, Critical]');
  sections.push('- evidenceLinks (String[], optional): URIs to Document/Claim IDs');
  sections.push('- commitAllowed (Boolean, default: false)');
  sections.push('- governanceThreshold (Float 0-1, optional)');
  sections.push('- reasoningTrace (String, optional)');

  sections.push('\n\n## Validation Rules (Hard-Fail)');
  sections.push('1. Missing repo_origin → exit code 1');
  sections.push('2. Invalid lifecycle state → exit code 1');
  sections.push('3. DRAFT→PROPOSED without evidenceLinks → exit code 1');
  sections.push('4. VERIFIED→EXECUTED with commitAllowed≠true → exit code 1');
  sections.push('5. Cross-repo mutation without CROSS_REPO_GRANT → exit code 1');
  sections.push('6. Unresolved terminology alias → exit code 1');
  sections.push('7. Cross-repo target mutation without grant/evidence path → exit code 1');

  sections.push('\n\n## Action Guard Middleware (Phase 2 Contract)\n');
  sections.push('- Middleware: ToolCallInterceptor(intent, targetEntity, graphState)');
  sections.push('- Guard 1: Evidence path must exist for target mutation');
  sections.push('- Guard 2: Cross-repo mutation requires CROSS_REPO_GRANT edge');
  sections.push('- Deterministic behavior: allow (exit 0) or deny (exit 1) only');

  sections.push('\n\n## Governed Glossary + NL Audit (Phase 3 Contract)\n');
  sections.push('- Glossary schema: term_id, canonical_name, definition, aliases, source_refs');
  sections.push('- Glossary validation: duplicate canonical_name + unresolved alias hard-fail');
  sections.push('- NL audit: maps text candidates into canonical terms + flags ambiguous claim/document prose');

  sections.push('\n\n## Cypher Templates\n');
  sections.push(`- evidence_path_check: ${CypherTemplates.evidence_path_check}`);
  sections.push(`- cross_repo_grant_check: ${CypherTemplates.cross_repo_grant_check}`);
  sections.push(`- claim_threshold_check: ${CypherTemplates.claim_threshold_check}`);

  const output = sections.join('\n');

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          schema: output,
          version: 'v2.6',
        },
        null,
        2
      )
    );
  } else {
    console.log(output);
  }

  return { exitCode: 0 };
}

/**
 * Command: kbx ontology validate <file>
 * Validate intent/entity fixtures against schema + state guards
 */
function validateOntology(args = [], options = {}) {
  if (!options.input) {
    if (options.json) {
      console.error(
        JSON.stringify({ success: false, error: 'Missing --input <file>' }, null, 2)
      );
    } else {
      console.error('Usage: kbx ontology validate --input <file> [--json]');
    }
    return { exitCode: 1 };
  }

  let inputData;
  let graphState = null;
  let governedGlossary = null;
  try {
    const fs = require('fs');
    const content = fs.readFileSync(options.input, 'utf8');
    inputData = JSON.parse(content);

    if (options.graphState) {
      const graphStateContent = fs.readFileSync(options.graphState, 'utf8');
      graphState = JSON.parse(graphStateContent);
    }

    if (options.glossary) {
      const glossaryContent = fs.readFileSync(options.glossary, 'utf8');
      governedGlossary = JSON.parse(glossaryContent);
    }
  } catch (err) {
    const result = {
      success: false,
      error: `Failed to read or parse input file: ${err.message}`,
    };
    if (options.json) {
      console.error(JSON.stringify(result, null, 2));
    } else {
      console.error(result.error);
    }
    return { exitCode: 1 };
  }

  // Validate as Intent
  const validation = validateIntent(inputData);

  const embeddedGlossary = Array.isArray(inputData.glossary) ? inputData.glossary : null;
  const effectiveGlossary = governedGlossary || embeddedGlossary;
  if (effectiveGlossary) {
    const glossaryValidation = validateGlossary(effectiveGlossary);
    if (!glossaryValidation.valid) {
      const result = {
        success: false,
        error: 'Governed glossary validation failed',
        errors: glossaryValidation.errors,
      };
      if (options.json) {
        console.error(JSON.stringify(result, null, 2));
      } else {
        console.error(result.error);
        glossaryValidation.errors.forEach(err => console.error(`  - ${err}`));
      }
      return { exitCode: 1 };
    }
  }

  if (validation.valid) {
    // Additional checks
    const data = validation.data;

    // Check repo_origin
    if (!data.repo_origin) {
      const result = {
        success: false,
        error: 'repo_origin is required (mandatory DNA positioning)',
      };
      if (options.json) {
        console.error(JSON.stringify(result, null, 2));
      } else {
        console.error(result.error);
      }
      return { exitCode: 1 };
    }

    // Check terminology resolution
    if (data.canonical_name) {
      const resolved = resolveTerminology(data.canonical_name);
      if (!resolved) {
        const result = {
          success: false,
          error: `Unresolved terminology: ${data.canonical_name} not in TerminologyRegistry`,
          suggestion: `Available entities: ${Object.keys(TerminologyRegistry).join(', ')}`,
        };
        if (options.json) {
          console.error(JSON.stringify(result, null, 2));
        } else {
          console.error(result.error);
          console.error(result.suggestion);
        }
        return { exitCode: 1 };
      }
    }

    const targetEntity = inputData.targetEntity || null;
    if (targetEntity) {
      const mutationGuard = verifyMutation(data, targetEntity, graphState);
      if (!mutationGuard.allowed) {
        const result = {
          success: false,
          error: mutationGuard.reason || 'Mutation blocked by action guard',
          query: mutationGuard.query,
          params: mutationGuard.params,
        };
        if (options.json) {
          console.error(JSON.stringify(result, null, 2));
        } else {
          console.error(result.error);
          if (result.query) {
            console.error(`Guard query: ${result.query}`);
          }
        }
        return { exitCode: 1 };
      }
    }

    const result = {
      success: true,
      message: 'Validation passed',
      intent: {
        id: data.id,
        lifecycle: data.lifecycle,
        repo_origin: data.repo_origin,
        title: data.title,
      },
      glossary: effectiveGlossary
        ? {
            validated: true,
            entries: effectiveGlossary.length,
          }
        : null,
    };
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result.message);
      console.log(`  Intent: ${data.title}`);
      console.log(`  State: ${data.lifecycle}`);
      console.log(`  Origin: ${data.repo_origin}`);
    }
    return { exitCode: 0 };
  } else {
    const result = {
      success: false,
      errors: validation.errors,
    };
    if (options.json) {
      console.error(JSON.stringify(result, null, 2));
    } else {
      console.error('Validation failed:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
    }
    return { exitCode: 1 };
  }
}

function auditOntology(args = [], options = {}) {
  if (!options.input) {
    if (options.json) {
      console.error(JSON.stringify({ success: false, error: 'Missing --input <file>' }, null, 2));
    } else {
      console.error('Usage: kbx ontology audit --input <file> [--glossary <file>] [--json]');
    }
    return { exitCode: 1 };
  }

  const fs = require('fs');
  let payload;
  let glossaryEntries = null;
  try {
    const content = fs.readFileSync(options.input, 'utf8');
    try {
      payload = JSON.parse(content);
    } catch {
      payload = { text: content };
    }

    if (options.glossary) {
      glossaryEntries = JSON.parse(fs.readFileSync(options.glossary, 'utf8'));
      const glossaryValidation = validateGlossary(glossaryEntries);
      if (!glossaryValidation.valid) {
        const result = {
          success: false,
          error: 'Governed glossary validation failed',
          errors: glossaryValidation.errors,
        };
        if (options.json) {
          console.error(JSON.stringify(result, null, 2));
        } else {
          console.error(result.error);
          glossaryValidation.errors.forEach(err => console.error(`  - ${err}`));
        }
        return { exitCode: 1 };
      }
    }
  } catch (err) {
    const result = {
      success: false,
      error: `Failed to read audit input: ${err.message}`,
    };
    if (options.json) {
      console.error(JSON.stringify(result, null, 2));
    } else {
      console.error(result.error);
    }
    return { exitCode: 1 };
  }

  const auditResult = auditNaturalLanguageTerms(payload, {
    glossaryEntries: glossaryEntries || payload.glossary || [],
  });

  const response = {
    success: auditResult.valid,
    audit: auditResult,
  };

  if (options.json) {
    (auditResult.valid ? console.log : console.error)(JSON.stringify(response, null, 2));
  } else {
    if (auditResult.valid) {
      console.log('NL audit passed');
    } else {
      console.error('NL audit failed');
    }
    console.log(`  mapped: ${auditResult.summary.mapped}`);
    console.log(`  unresolved: ${auditResult.summary.unresolved}`);
    console.log(`  ambiguous: ${auditResult.summary.ambiguous}`);
  }

  return { exitCode: auditResult.valid ? 0 : 1 };
}

/**
 * Command: kbx ontology build
 * Compile runtime ontology artifact (includes Terminology Registry + state guards)
 */
function buildOntology(options = {}) {
  const artifact = {
    version: '2.6.0',
    timestamp: new Date().toISOString(),
    terminologyRegistry: TerminologyRegistry,
    stateTransitionGuards: Object.keys(StateTransitionGuards).reduce((acc, state) => {
      acc[state] = {
        allowedTo: StateTransitionGuards[state].allowedTo,
      };
      return acc;
    }, {}),
    validations: {
      requiredFields: ['id', 'repo_origin', 'canonical_name', 'lifecycle', 'title', 'riskLevel'],
      repoOrigins: ['billing', 'auth', 'gateway', 'infrastructure'],
      lifecycleStates: ['DRAFT', 'PROPOSED', 'VERIFIED', 'EXECUTED', 'COMMITTED'],
      riskLevels: ['Low', 'Medium', 'High', 'Critical'],
    },
    actionGuard: {
      middleware: 'ToolCallInterceptor',
      cypherTemplates: CypherTemplates,
    },
  };

  const output = JSON.stringify(artifact, null, 2);

  if (options.output) {
    const fs = require('fs');
    const path = require('path');
    try {
      const dir = path.dirname(options.output);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(options.output, output, 'utf8');
      if (options.json) {
        console.log(
          JSON.stringify(
            {
              success: true,
              message: `Ontology artifact built to ${options.output}`,
              artifact,
            },
            null,
            2
          )
        );
      } else {
        console.log(`✓ Ontology artifact built to ${options.output}`);
      }
      return { exitCode: 0 };
    } catch (err) {
      const result = {
        success: false,
        error: `Failed to write artifact: ${err.message}`,
      };
      if (options.json) {
        console.error(JSON.stringify(result, null, 2));
      } else {
        console.error(result.error);
      }
      return { exitCode: 1 };
    }
  } else {
    console.log(output);
    return { exitCode: 0 };
  }
}

/**
 * Main ontology command router
 */
function runOntology({ packageJson, args = [] }) {
  const subcommand = args[0];
  const subargs = args.slice(1);
  const options = parseArgs(subargs);

  switch (subcommand) {
    case 'show':
      return showOntology(options);

    case 'validate':
      return validateOntology(subargs, options);

    case 'build':
      return buildOntology(options);

    case 'audit':
      return auditOntology(subargs, options);

    case 'help':
    default:
      console.log('Usage:');
      console.log('  kbx ontology show [--json]');
      console.log('  kbx ontology validate --input <file> [--json]');
      console.log('                       [--graph-state <graph-state.json>]');
      console.log('                       [--glossary <glossary.json>]');
      console.log('  kbx ontology audit --input <file> [--glossary <glossary.json>] [--json]');
      console.log('  kbx ontology build [--output <path>] [--json]');
      console.log('');
      console.log('Commands:');
      console.log('  show     Display ontology schema (terminology registry + state machine)');
      console.log('  validate Validate intent JSON fixture against schema + state guards');
      console.log('  audit    Audit natural-language payload against governed glossary');
      console.log('  build    Compile ontology runtime artifact (Terminology Registry + guards)');
      return { exitCode: subcommand === 'help' ? 0 : 1 };
  }
}

module.exports = runOntology;
