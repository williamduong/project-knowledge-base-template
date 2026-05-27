'use strict';

/**
 * Legacy ontology compatibility aggregator.
 *
 * The original mixed-boundary implementation has been split so that:
 * - structurally generic compatibility validators live in `src/lib/dna/*`
 * - KBX worldview and governance behavior live in `dna/kbx/bindings/*`
 *
 * This file preserves the old import surface while callers are migrated.
 */

const compatibilityContracts = require('../../src/lib/dna/ontology-contract');
const legacyTerminology = require('../kbx/bindings/legacy-terminology');
const legacyGovernance = require('../kbx/bindings/legacy-governance');

function createOntologyValidator(schemaType) {
  const validators = {
    SaaSNodeDNA: legacyGovernance.validateSaaSNode,
    IntentSchema: legacyGovernance.validateIntent,
    OntologyContract: compatibilityContracts.validateOntologyContract,
    Terminology: legacyTerminology.validateTerminology,
    Glossary: legacyTerminology.validateGlossary,
  };

  const validator = validators[schemaType];
  if (!validator) {
    return () => ({ valid: false, errors: [`Unknown schema type: ${schemaType}`] });
  }

  return validator;
}

module.exports = {
  ...legacyGovernance,
  ...compatibilityContracts,
  ...legacyTerminology,
  createOntologyValidator,
};
