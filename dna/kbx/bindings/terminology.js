'use strict';

/**
 * Reference terminology binding for the KBX DNA.
 *
 * This stays in the DNA layer because it reflects how KBX names
 * domain concepts, not what SVFactory core believes universally.
 */

const terminology = {
  Intent: ['Task', 'Proposal', 'Change'],
  Principle: ['Rule', 'Policy'],
  Lesson: ['Learning'],
};

function getTerminologyBinding() {
  return terminology;
}

module.exports = {
  terminology,
  getTerminologyBinding,
};
