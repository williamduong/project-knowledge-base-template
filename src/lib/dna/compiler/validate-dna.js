'use strict';

/**
 * Validate a loaded DNA contract set.
 *
 * This module applies neutral core schemas and a few cross-file checks.
 * It does not execute generation or runtime behavior.
 */

const path = require('path');
const { ZodError } = require('zod');

const {
  DnaContractSchema,
  ReleaseContractSchema,
  CONTRACT_FILE_NAMES,
} = require('../contract-schema');
const { OntologyContractSchema } = require('../ontology-contract');
const { GovernanceContractSchema } = require('../governance-primitives');
const { loadDna } = require('./load-dna');

function formatZodErrors(error, label) {
  if (!(error instanceof ZodError)) {
    return [`${label}: ${error.message}`];
  }

  return error.errors.map(issue => {
    const issuePath = issue.path && issue.path.length > 0 ? issue.path.join('.') : '<root>';
    return `${label}.${issuePath}: ${issue.message}`;
  });
}

function runCrossChecks(loaded) {
  const errors = [];
  const { contracts, files } = loaded;

  if (contracts.dna.version !== contracts.release.version) {
    errors.push(
      `dna.version (${contracts.dna.version}) must match release.version (${contracts.release.version})`
    );
  }

  const expectedRefs = {
    ontology_ref: `./${path.basename(files.ontology)}`,
    governance_ref: `./${path.basename(files.governance)}`,
    release_ref: `./${path.basename(files.release)}`,
  };

  if (contracts.dna.ontology_ref !== expectedRefs.ontology_ref) {
    errors.push(`dna.ontology_ref must resolve to ${expectedRefs.ontology_ref}`);
  }
  if (contracts.dna.governance_ref !== expectedRefs.governance_ref) {
    errors.push(`dna.governance_ref must resolve to ${expectedRefs.governance_ref}`);
  }
  if (contracts.dna.release_ref !== expectedRefs.release_ref) {
    errors.push(`dna.release_ref must resolve to ${expectedRefs.release_ref}`);
  }

  if (contracts.dna.extends && contracts.dna.extends === contracts.dna.dna_id) {
    errors.push('dna.extends must not equal dna.dna_id');
  }

  const requiredArtifactPaths = new Set([
    path.join('spec', CONTRACT_FILE_NAMES.DNA).replace(/\\/g, '/'),
    path.join('spec', CONTRACT_FILE_NAMES.ONTOLOGY).replace(/\\/g, '/'),
    path.join('spec', CONTRACT_FILE_NAMES.GOVERNANCE).replace(/\\/g, '/'),
    path.join('spec', CONTRACT_FILE_NAMES.RELEASE).replace(/\\/g, '/'),
  ]);

  for (const requiredPath of requiredArtifactPaths) {
    const found = (contracts.release.artifacts || []).some(artifact => artifact.path === requiredPath);
    if (!found) {
      errors.push(`release.artifacts must include ${requiredPath}`);
    }
  }

  return errors;
}

function validateLoadedDna(loaded) {
  const errors = [];
  const parsed = {};

  try {
    parsed.dna = DnaContractSchema.parse(loaded.contracts.dna);
  } catch (err) {
    errors.push(...formatZodErrors(err, 'dna'));
  }

  try {
    parsed.ontology = OntologyContractSchema.parse(loaded.contracts.ontology);
  } catch (err) {
    errors.push(...formatZodErrors(err, 'ontology'));
  }

  try {
    parsed.governance = GovernanceContractSchema.parse(loaded.contracts.governance);
  } catch (err) {
    errors.push(...formatZodErrors(err, 'governance'));
  }

  try {
    parsed.release = ReleaseContractSchema.parse(loaded.contracts.release);
  } catch (err) {
    errors.push(...formatZodErrors(err, 'release'));
  }

  if (errors.length === 0) {
    errors.push(...runCrossChecks(loaded));
  }

  return {
    ok: errors.length === 0,
    errors,
    loaded,
    parsed: errors.length === 0 ? parsed : null,
    summary: {
      dna_id: loaded.contracts.dna && loaded.contracts.dna.dna_id,
      specRoot: loaded.specRoot,
      filesChecked: Object.keys(loaded.files).length,
    },
  };
}

function validateDnaAtSpecRoot(specRoot, options = {}) {
  const loaded = loadDna(specRoot, options);
  return validateLoadedDna(loaded);
}

module.exports = {
  formatZodErrors,
  runCrossChecks,
  validateLoadedDna,
  validateDnaAtSpecRoot,
};
