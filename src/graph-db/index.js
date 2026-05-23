'use strict';

// ---------------------------------------------------------------------------
// graph-db — top-level exports
// Each sub-module is a separate named graph with its own schema + client.
// ---------------------------------------------------------------------------

const codeGraph = require('./code');

module.exports = {
  code: codeGraph,
};
