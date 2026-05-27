'use strict';

/**
 * Build a KBX-shaped materialization plan from a compiled DNA manifest.
 *
 * This stage is intentionally declarative:
 * - it does not write files
 * - it does not execute downstream runtime setup
 * - it describes what a future generator should materialize
 */

const fs = require('fs');
const path = require('path');

const {
  compileDnaAtSpecRoot,
  compileLoadedDna,
  compileValidatedDna,
} = require('./compile-dna');

const KBX_MATERIALIZATION_PLAN_VERSION = '0.1.0';

function resolveTargetRoot(targetRoot, cwd = process.cwd()) {
  if (!targetRoot) {
    return path.resolve(cwd, 'out', 'generated-kbx');
  }
  return path.resolve(cwd, targetRoot);
}

function relativeFromCwd(filePath) {
  return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
}

function buildPlannedDirectories() {
  return [
    {
      path: '.kb',
      kind: 'workspace-metadata',
      reason: 'Runtime metadata and generated operator artifacts.',
    },
    {
      path: 'knowledge-base',
      kind: 'knowledge-root',
      reason: 'Primary downstream knowledge workspace.',
    },
    {
      path: 'knowledge-base/intents',
      kind: 'governance-workspace',
      reason: 'Intent lifecycle storage for downstream KBX usage.',
    },
    {
      path: 'knowledge-base/generated',
      kind: 'generated-knowledge',
      reason: 'Generated DNA-derived indexes and operator references.',
    },
    {
      path: 'graph',
      kind: 'graph-profile',
      reason: 'Graph adapter/profile artifacts selected by the DNA.',
    },
    {
      path: 'docs',
      kind: 'documents',
      reason: 'Human-facing generated documentation and templates.',
    },
  ];
}

function buildPlannedFiles(manifest) {
  return [
    {
      path: '.kb/dna-manifest.compiled.json',
      kind: 'compiled-dna-manifest',
      source: manifest.source.files.dna,
      required: true,
      reason: 'Persist the normalized compiled manifest for downstream tooling.',
    },
    {
      path: '.kb/dna-materialization-plan.json',
      kind: 'materialization-plan',
      source: 'svfactory-materializer',
      required: true,
      reason: 'Persist the filesystem generation plan before execution.',
    },
    {
      path: 'knowledge-base/generated/ontology-catalog.json',
      kind: 'ontology-catalog',
      source: manifest.source.files.ontology,
      required: true,
      reason: 'Expose entity, edge, and glossary catalogs to KBX runtime/UI.',
    },
    {
      path: 'knowledge-base/generated/governance-catalog.json',
      kind: 'governance-catalog',
      source: manifest.source.files.governance,
      required: true,
      reason: 'Expose rules, gates, pipelines, and evidence policy to KBX runtime/UI.',
    },
    {
      path: 'graph/profile.json',
      kind: 'graph-profile',
      source: 'dna graph profile or adapter defaults',
      required: false,
      reason: 'Declare which graph/storage profile this KBX instance expects.',
    },
    {
      path: 'docs/dna-release.json',
      kind: 'release-metadata',
      source: manifest.source.files.release,
      required: true,
      reason: 'Keep release compatibility and package metadata with the generated KBX.',
    },
  ];
}

function collectTemplatePlan(dnaRoot) {
  const templateRoot = path.join(dnaRoot, 'templates');
  const templateEntries = [
    {
      id: 'knowledge-base',
      path: path.join(templateRoot, 'knowledge-base'),
    },
    {
      id: 'documents',
      path: path.join(templateRoot, 'documents'),
    },
  ];

  return templateEntries.map(entry => ({
    id: entry.id,
    source: relativeFromCwd(entry.path),
    exists: fs.existsSync(entry.path),
  }));
}

function collectBindingPlan(dnaRoot) {
  const bindingsRoot = path.join(dnaRoot, 'bindings');
  const bindingEntries = [
    {
      id: 'terminology',
      path: path.join(bindingsRoot, 'terminology.js'),
    },
    {
      id: 'state-guards',
      path: path.join(bindingsRoot, 'state-guards.js'),
    },
    {
      id: 'runtime-profile',
      path: path.join(bindingsRoot, 'runtime-profile.js'),
    },
  ];

  return bindingEntries.map(entry => ({
    id: entry.id,
    source: relativeFromCwd(entry.path),
    exists: fs.existsSync(entry.path),
  }));
}

function collectGraphArtifacts(dnaRoot) {
  const graphRoot = path.join(dnaRoot, 'graph');
  const graphEntries = [
    {
      id: 'schema',
      path: path.join(graphRoot, 'schema.json'),
    },
    {
      id: 'entities',
      path: path.join(graphRoot, 'entities.json'),
    },
    {
      id: 'graph-profile',
      path: path.join(graphRoot, 'graph-profile.json'),
    },
  ];

  return graphEntries.map(entry => ({
    id: entry.id,
    source: relativeFromCwd(entry.path),
    exists: fs.existsSync(entry.path),
  }));
}

function buildWarnings({ templates, bindings, graphArtifacts }) {
  const warnings = [];

  for (const template of templates.filter(entry => !entry.exists)) {
    warnings.push(`Template scaffold not found yet: ${template.source}`);
  }

  for (const binding of bindings.filter(entry => !entry.exists)) {
    warnings.push(`DNA binding not found yet: ${binding.source}`);
  }

  for (const graphArtifact of graphArtifacts.filter(entry => !entry.exists)) {
    warnings.push(`Graph artifact not found yet: ${graphArtifact.source}`);
  }

  return warnings;
}

function materializeCompiledManifestToKbxPlan(manifest, options = {}) {
  if (!manifest || !manifest.identity || !manifest.catalogs || !manifest.contracts) {
    throw new Error('A compiled DNA manifest is required');
  }

  const targetRoot = resolveTargetRoot(options.targetRoot, options.cwd);
  const specRoot = path.resolve(manifest.source.spec_root);
  const dnaRoot = path.dirname(specRoot);
  const templates = collectTemplatePlan(dnaRoot);
  const bindings = collectBindingPlan(dnaRoot);
  const graphArtifacts = collectGraphArtifacts(dnaRoot);

  return {
    plan_version: KBX_MATERIALIZATION_PLAN_VERSION,
    planned_at: new Date().toISOString(),
    identity: {
      dna_id: manifest.identity.dna_id,
      name: manifest.identity.name,
      version: manifest.identity.version,
      kind: manifest.identity.kind,
      package_name: manifest.contracts.release.package_name,
      display_name: manifest.contracts.release.display_name,
    },
    source: {
      spec_root: manifest.source.spec_root,
      dna_root: relativeFromCwd(dnaRoot),
      compiled_manifest_version: manifest.manifest_version,
    },
    target: {
      kind: 'kbx-workspace-plan',
      root: relativeFromCwd(targetRoot),
      layout: 'design-scaffold',
      execution_mode: 'plan-only',
    },
    filesystem: {
      directories: buildPlannedDirectories(),
      files: buildPlannedFiles(manifest),
    },
    runtime: {
      ontology: {
        entities: manifest.catalogs.entities.names,
        edges: manifest.catalogs.edges.names,
        glossary_terms: manifest.catalogs.glossary.terms,
      },
      governance: {
        rule_ids: manifest.catalogs.rules.ids,
        gate_ids: manifest.catalogs.gates.ids,
        pipelines: manifest.catalogs.pipelines.ids,
      },
      evidence_policy: manifest.contracts.governance.evidence_policy,
    },
    dna_assets: {
      templates,
      bindings,
      graph: graphArtifacts,
    },
    summary: {
      planned_directory_count: buildPlannedDirectories().length,
      planned_file_count: buildPlannedFiles(manifest).length,
      entity_count: manifest.summary.entity_count,
      edge_count: manifest.summary.edge_count,
      rule_count: manifest.summary.rule_count,
      gate_count: manifest.summary.gate_count,
      pipeline_count: manifest.summary.pipeline_count,
      warning_count: buildWarnings({ templates, bindings, graphArtifacts }).length,
    },
    warnings: buildWarnings({ templates, bindings, graphArtifacts }),
  };
}

function materializeValidatedDnaToKbxPlan(validation, options = {}) {
  return materializeCompiledManifestToKbxPlan(compileValidatedDna(validation), options);
}

function materializeLoadedDnaToKbxPlan(loaded, options = {}) {
  return materializeCompiledManifestToKbxPlan(compileLoadedDna(loaded), options);
}

function materializeDnaAtSpecRoot(specRoot, options = {}) {
  return materializeCompiledManifestToKbxPlan(compileDnaAtSpecRoot(specRoot, options), options);
}

module.exports = {
  KBX_MATERIALIZATION_PLAN_VERSION,
  resolveTargetRoot,
  relativeFromCwd,
  buildPlannedDirectories,
  buildPlannedFiles,
  collectTemplatePlan,
  collectBindingPlan,
  collectGraphArtifacts,
  buildWarnings,
  materializeCompiledManifestToKbxPlan,
  materializeValidatedDnaToKbxPlan,
  materializeLoadedDnaToKbxPlan,
  materializeDnaAtSpecRoot,
};
