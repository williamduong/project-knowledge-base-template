'use strict';

/**
 * Reference terminology binding for the KBX DNA.
 *
 * This stays in the DNA layer because it reflects how KBX names
 * domain concepts, not what SVFactory core believes universally.
 */

const legacyTerminology = require('./legacy-terminology');

const terminology = {
  Intent: legacyTerminology.TerminologyRegistry.Intent.aliases,
  Principle: ['Rule', 'Policy'],
  Lesson: ['Learning'],
  Policy: legacyTerminology.TerminologyRegistry.Policy.aliases,
  Evidence: legacyTerminology.TerminologyRegistry.Evidence.aliases,
};

function getTerminologyBinding() {
  return terminology;
}

module.exports = {
  ...legacyTerminology,
  terminology,
  getTerminologyBinding,
};
