'use strict';

/**
 * Reference state guard descriptors for the KBX DNA.
 *
 * These are not executable global SVFactory laws yet. They are the
 * KBX DNA's preferred guard hints for future governance/runtime binding.
 */

const stateGuards = [
  {
    id: 'intent-needs-goal-link',
    subject: 'Intent',
    when: 'before-implementation',
    requires: ['Goal'],
  },
  {
    id: 'decision-needs-principle-link',
    subject: 'Decision',
    when: 'before-release',
    requires: ['Principle'],
  },
  {
    id: 'lesson-needs-traceability',
    subject: 'Lesson',
    when: 'after-delivery',
    requires: ['Intent', 'Decision'],
  },
];

function getStateGuardDescriptors() {
  return stateGuards;
}

module.exports = {
  stateGuards,
  getStateGuardDescriptors,
};
