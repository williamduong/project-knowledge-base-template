'use strict';

// ---------------------------------------------------------------------------
// graph-db — top-level exports
// Each sub-module is a separate named graph with its own schema + client.
// ---------------------------------------------------------------------------

const codeGraph      = require('./code');
const knowledgeGraph = require('./knowledge');
const planningGraph  = require('./planning');

module.exports = {
  code:      codeGraph,
  knowledge: knowledgeGraph,
  planning:  planningGraph,
};
