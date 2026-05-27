'use strict';

/**
 * Reference runtime profile for the KBX DNA.
 *
 * This describes the expected downstream shape without turning it into a
 * factory-core assumption.
 */

const runtimeProfile = {
  profile_id: 'kbx-reference-runtime',
  ui_surfaces: ['rules', 'flow', 'goals', 'decisions', 'principles'],
  graph_mode: 'dual-graph',
  evidence_defaults: ['document-ref', 'decision-record'],
};

function getRuntimeProfile() {
  return runtimeProfile;
}

module.exports = {
  runtimeProfile,
  getRuntimeProfile,
};
