'use strict';

// Contract registry. Adapters (HTTP, CLI) and codegen tool read this to
// discover every surface and its operations.

const common = require('./common');
const runtimeServices = require('./runtime-services.contract');
const focus = require('./focus.contract');
const goals = require('./goals.contract');
const intents = require('./intents.contract');

// Surface registry. Add new contracts here as they ship in Phase 1.
const surfaces = Object.freeze({
  'runtime-services': runtimeServices,
  focus,
  goals,
  intents,
  // Pending Phase 1 deliverables:
  //   rules:    require('./rules.contract'),
  //   kb-tree:  require('./kb-tree.contract'),
});

function listSurfaces() {
  return Object.keys(surfaces);
}

function getSurface(name) {
  const surface = surfaces[name];
  if (!surface) {
    throw new Error(`Unknown contract surface: ${name}. Known: ${listSurfaces().join(', ')}`);
  }
  return surface;
}

module.exports = {
  common,
  surfaces,
  listSurfaces,
  getSurface,
};
