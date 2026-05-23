'use strict';

// ---------------------------------------------------------------------------
// graph-db — top-level exports
// Each sub-module is a separate named graph with its own schema + client.
// ---------------------------------------------------------------------------

const codeGraph      = require('./code');
const knowledgeGraph = require('./knowledge');

module.exports = {
  code:      codeGraph,
  knowledge: knowledgeGraph,
};
