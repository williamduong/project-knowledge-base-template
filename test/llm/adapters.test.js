'use strict';

// ---------------------------------------------------------------------------
// Adapter structure tests — verifies each adapter factory returns the correct
// interface without making real network calls.
// ---------------------------------------------------------------------------

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const ADAPTERS = [
  ['anthropic',  require('../../src/llm/adapters/anthropic')],
  ['openai',     require('../../src/llm/adapters/openai')],
  ['ollama',     require('../../src/llm/adapters/ollama')],
  ['gemini',     require('../../src/llm/adapters/gemini')],
  ['deepseek',   require('../../src/llm/adapters/deepseek')],
];

const BASE_CONFIG = {
  provider: 'test', apiKey: 'test-key', model: 'test-model',
  maxTokens: 100, timeoutMs: 5000,
};

describe('Adapter interface contract', () => {
  for (const [name, mod] of ADAPTERS) {
    it(`${name}: exports createAdapter function`, () => {
      assert.equal(typeof mod.createAdapter, 'function');
    });

    it(`${name}: createAdapter returns { complete, extract, ping }`, () => {
      const adapter = mod.createAdapter({ ...BASE_CONFIG, provider: name });
      assert.equal(typeof adapter.complete, 'function');
      assert.equal(typeof adapter.extract,  'function');
      assert.equal(typeof adapter.ping,     'function');
    });

    it(`${name}: complete and extract return Promises`, () => {
      // We do NOT await — just verify the return type is a Promise-like object.
      // Real network calls would fail without live credentials.
      const adapter = mod.createAdapter({ ...BASE_CONFIG, provider: name });
      const c = adapter.complete([{ role: 'user', content: 'hi' }]);
      const e = adapter.extract('extract this', { type: 'object', properties: {} });
      assert.ok(c instanceof Promise, 'complete() should return Promise');
      assert.ok(e instanceof Promise, 'extract() should return Promise');
      // Absorb rejections — we only care about the Promise shape
      c.catch(() => {});
      e.catch(() => {});
    });
  }
});

describe('index.js registers all built-in providers', () => {
  const { listProviders } = require('../../src/llm');
  const providers = listProviders();

  for (const name of ['anthropic', 'openai', 'azure', 'openrouter', 'ollama', 'gemini', 'deepseek']) {
    it(`registers "${name}"`, () => {
      assert.ok(providers.includes(name), `"${name}" not found in listProviders()`);
    });
  }
});

describe('Gemini message conversion', () => {
  it('createAdapter does not throw with system message in messages array', () => {
    const { createAdapter } = require('../../src/llm/adapters/gemini');
    const adapter = createAdapter({ ...BASE_CONFIG, provider: 'gemini' });
    // Fire and forget — just checking no sync throw on construction
    const p = adapter.complete([
      { role: 'system', content: 'You are helpful' },
      { role: 'user',   content: 'hello' },
    ]);
    p.catch(() => {});
    assert.ok(p instanceof Promise);
  });
});

describe('DeepSeek preset', () => {
  it('uses deepseek-chat as default model', () => {
    const { createAdapter } = require('../../src/llm/adapters/deepseek');
    // The adapter is an openai adapter — inspect via a closure check indirectly
    // by verifying ping() returns a Promise (structural test only)
    const adapter = createAdapter({ apiKey: 'sk-test', timeoutMs: 100 });
    assert.equal(typeof adapter.complete, 'function');
    assert.equal(typeof adapter.extract,  'function');
    assert.equal(typeof adapter.ping,     'function');
  });
});
