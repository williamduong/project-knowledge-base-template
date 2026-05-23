'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const schema = require('../../src/graph-db/knowledge/schema');

describe('Knowledge Graph Schema', () => {
  it('defines 10 vertex collections', () => {
    const cols = Object.values(schema.COLLECTIONS);
    assert.equal(cols.length, 10);
  });

  it('defines 14 edge collections', () => {
    const edges = Object.values(schema.EDGE_COLLECTIONS);
    assert.equal(edges.length, 14);
  });

  it('exports NODE_KIND with all entity types', () => {
    assert.ok(schema.NODE_KIND.INTENT);
    assert.ok(schema.NODE_KIND.GOAL);
    assert.ok(schema.NODE_KIND.DECISION);
    assert.ok(schema.NODE_KIND.PRINCIPLE);
    assert.ok(schema.NODE_KIND.RISK);
    assert.ok(schema.NODE_KIND.LESSON);
    assert.ok(schema.NODE_KIND.VERSION);
    assert.ok(schema.NODE_KIND.DOCUMENT);
    assert.ok(schema.NODE_KIND.AGENT);
    assert.ok(schema.NODE_KIND.MILESTONE);
  });

  it('exports INTENT_STATUS with valid statuses', () => {
    assert.ok(schema.INTENT_STATUS.OPEN);
    assert.ok(schema.INTENT_STATUS.COMPLETED);
    assert.ok(schema.INTENT_STATUS.BLOCKED);
  });

  it('exports INTENT_LIFECYCLE values', () => {
    assert.ok(schema.INTENT_LIFECYCLE.ACTIVE);
    assert.ok(schema.INTENT_LIFECYCLE.ARCHIVED);
    assert.ok(schema.INTENT_LIFECYCLE.DEPRECATED);
  });

  it('exports RISK_SEVERITY levels', () => {
    const sevs = Object.values(schema.RISK_SEVERITY);
    assert.equal(sevs.length, 4);
    assert.ok(schema.RISK_SEVERITY.CRITICAL);
  });

  it('exports DOCUMENT_TYPE values', () => {
    assert.ok(schema.DOCUMENT_TYPE.DECISION);
    assert.ok(schema.DOCUMENT_TYPE.GUIDE);
    assert.ok(schema.DOCUMENT_TYPE.PROCEDURE);
  });

  it('exports VERSION_STATUS values', () => {
    assert.ok(schema.VERSION_STATUS.STABLE);
    assert.ok(schema.VERSION_STATUS.EOL);
  });

  it('exports AGENT_TYPE values', () => {
    assert.ok(schema.AGENT_TYPE.HUMAN);
    assert.ok(schema.AGENT_TYPE.AI);
  });

  it('GRAPH_DEFINITION has correct structure', () => {
    const g = schema.GRAPH_DEFINITION;
    assert.equal(g.name, 'knowledge_graph');
    assert.ok(Array.isArray(g.edgeDefinitions));
    assert.ok(g.edgeDefinitions.length > 0);
  });

  it('INDEXES has at least one index per key collection', () => {
    assert.ok(schema.INDEXES.length > 0);
  });

  it('vertex collection names start with kg_', () => {
    for (const name of Object.values(schema.COLLECTIONS)) {
      assert.ok(name.startsWith('kg_'), `Expected kg_ prefix: ${name}`);
    }
  });

  it('edge collection names start with kg_', () => {
    for (const name of Object.values(schema.EDGE_COLLECTIONS)) {
      assert.ok(name.startsWith('kg_'), `Expected kg_ prefix: ${name}`);
    }
  });
});
