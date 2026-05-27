'use strict';

/**
 * Load a DNA contract set from a spec directory on disk.
 *
 * This module is intentionally small and deterministic:
 * - read `dna.json`
 * - resolve relative refs
 * - load sibling contract files
 *
 * Validation belongs to `validate-dna.js`.
 */

const fs = require('fs');
const path = require('path');

const { CONTRACT_FILE_NAMES } = require('../contract-schema');

function ensureFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`DNA contract file not found: ${filePath}`);
  }
}

function readJsonFile(filePath) {
  ensureFileExists(filePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse JSON at ${filePath}: ${err.message}`);
  }
}

function resolveSpecRoot(specRoot, cwd = process.cwd()) {
  if (!specRoot || typeof specRoot !== 'string') {
    throw new Error('specRoot is required');
  }
  return path.resolve(cwd, specRoot);
}

function resolveContractRef(specRoot, relativeRef) {
  if (!relativeRef || typeof relativeRef !== 'string') {
    throw new Error(`Invalid contract ref: ${relativeRef}`);
  }
  return path.resolve(specRoot, relativeRef);
}

function loadDna(input, options = {}) {
  const specRoot = typeof input === 'string'
    ? resolveSpecRoot(input, options.cwd)
    : resolveSpecRoot(input && input.specRoot, input && input.cwd);

  const dnaPath = path.join(specRoot, CONTRACT_FILE_NAMES.DNA);
  const dna = readJsonFile(dnaPath);

  const ontologyPath = resolveContractRef(specRoot, dna.ontology_ref);
  const governancePath = resolveContractRef(specRoot, dna.governance_ref);
  const releasePath = resolveContractRef(specRoot, dna.release_ref);

  return {
    specRoot,
    files: {
      dna: dnaPath,
      ontology: ontologyPath,
      governance: governancePath,
      release: releasePath,
    },
    contracts: {
      dna,
      ontology: readJsonFile(ontologyPath),
      governance: readJsonFile(governancePath),
      release: readJsonFile(releasePath),
    },
  };
}

module.exports = {
  ensureFileExists,
  readJsonFile,
  resolveSpecRoot,
  resolveContractRef,
  loadDna,
};
