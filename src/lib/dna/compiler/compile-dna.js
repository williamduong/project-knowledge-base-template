'use strict';

/**
 * Compile a validated DNA contract set into a normalized manifest.
 *
 * This is the boundary between:
 * - raw declarative contract files
 * - downstream materialization logic
 *
 * The compiled manifest is still declarative, but it is easier for later
 * compiler/materializer stages to consume without reparsing contract shape.
 */

const path = require('path');

const { loadDna } = require('./load-dna');
const { validateDnaAtSpecRoot, validateLoadedDna } = require('./validate-dna');

const COMPILED_DNA_MANIFEST_VERSION = '0.1.0';

function indexById(items, getId) {
  const index = {};
  for (const item of items) {
    const id = getId(item);
    index[id] = item;
  }
  return index;
}

function normalizePipelineStep(step) {
  if (typeof step === 'string') {
    return {
      id: step,
      uses_gates: [],
      emits: [],
      description: null,
    };
  }

  return {
    id: step.id,
    uses_gates: Array.isArray(step.uses_gates) ? [...step.uses_gates] : [],
    emits: Array.isArray(step.emits) ? [...step.emits] : [],
    description: step.description || null,
  };
}

function compileValidatedDna(validation) {
  if (!validation || validation.ok !== true || !validation.parsed || !validation.loaded) {
    const errors = validation && Array.isArray(validation.errors) ? validation.errors.join('; ') : 'unknown validation failure';
    throw new Error(`Cannot compile DNA: ${errors}`);
  }

  const { parsed, loaded } = validation;
  const entityNames = Object.keys(parsed.ontology.entities);
  const edgeNames = Object.keys(parsed.ontology.edges);
  const glossaryTerms = parsed.ontology.glossary.map(entry => entry.term);
  const ruleIds = parsed.governance.rules.map(rule => rule.id);
  const gateIds = parsed.governance.gates.map(gate => gate.id);

  const compiledPipelines = parsed.governance.pipelines.map(pipeline => {
    const normalizedSteps = pipeline.steps.map(normalizePipelineStep);
    return {
      id: pipeline.id,
      description: pipeline.description || null,
      steps: normalizedSteps,
      step_ids: normalizedSteps.map(step => step.id),
      referenced_gates: [...new Set(normalizedSteps.flatMap(step => step.uses_gates))],
      emitted_entity_types: [...new Set(normalizedSteps.flatMap(step => step.emits))],
    };
  });

  return {
    manifest_version: COMPILED_DNA_MANIFEST_VERSION,
    compiled_at: new Date().toISOString(),
    identity: {
      dna_id: parsed.dna.dna_id,
      name: parsed.dna.name,
      version: parsed.dna.version,
      kind: parsed.dna.kind,
      extends: parsed.dna.extends || null,
      description: parsed.dna.description || null,
    },
    source: {
      spec_root: loaded.specRoot,
      files: {
        dna: path.relative(process.cwd(), loaded.files.dna).replace(/\\/g, '/'),
        ontology: path.relative(process.cwd(), loaded.files.ontology).replace(/\\/g, '/'),
        governance: path.relative(process.cwd(), loaded.files.governance).replace(/\\/g, '/'),
        release: path.relative(process.cwd(), loaded.files.release).replace(/\\/g, '/'),
      },
    },
    contracts: {
      dna: parsed.dna,
      ontology: parsed.ontology,
      governance: parsed.governance,
      release: parsed.release,
    },
    catalogs: {
      entities: {
        names: entityNames,
        by_name: parsed.ontology.entities,
      },
      edges: {
        names: edgeNames,
        by_name: parsed.ontology.edges,
      },
      glossary: {
        terms: glossaryTerms,
        by_term: indexById(parsed.ontology.glossary, entry => entry.term),
      },
      rules: {
        ids: ruleIds,
        by_id: indexById(parsed.governance.rules, rule => rule.id),
      },
      gates: {
        ids: gateIds,
        by_id: indexById(parsed.governance.gates, gate => gate.id),
      },
      pipelines: {
        ids: compiledPipelines.map(pipeline => pipeline.id),
        by_id: indexById(compiledPipelines, pipeline => pipeline.id),
      },
    },
    summary: {
      entity_count: entityNames.length,
      edge_count: edgeNames.length,
      glossary_count: glossaryTerms.length,
      rule_count: ruleIds.length,
      gate_count: gateIds.length,
      pipeline_count: compiledPipelines.length,
      artifact_count: Array.isArray(parsed.release.artifacts) ? parsed.release.artifacts.length : 0,
    },
  };
}

function compileLoadedDna(loaded) {
  const validation = validateLoadedDna(loaded);
  return compileValidatedDna(validation);
}

function compileDnaAtSpecRoot(specRoot, options = {}) {
  const validation = validateDnaAtSpecRoot(specRoot, options);
  return compileValidatedDna(validation);
}

function loadValidateAndCompileDna(specRoot, options = {}) {
  const loaded = loadDna(specRoot, options);
  return compileLoadedDna(loaded);
}

module.exports = {
  COMPILED_DNA_MANIFEST_VERSION,
  indexById,
  normalizePipelineStep,
  compileValidatedDna,
  compileLoadedDna,
  compileDnaAtSpecRoot,
  loadValidateAndCompileDna,
};
