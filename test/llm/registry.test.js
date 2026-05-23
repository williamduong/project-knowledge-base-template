'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

// Require registry directly (not index.js) so tests don't share built-in state
const { register, createProvider, listProviders, hasProvider } = require('../../src/llm/registry');

// Isolated registry state via a fresh require each test — but since Node caches
// modules we just use unique provider names per test instead.

const FAKE_ADAPTER = (config) => ({ config, complete: async () => {}, extract: async () => ({}) });

describe('register', () => {
  it('registers a provider and it appears in listProviders', () => {
    register('test-reg-a', FAKE_ADAPTER);
    assert.ok(listProviders().includes('test-reg-a'));
  });

  it('overwrites a previously registered provider', () => {
    const v1 = () => ({ version: 1 });
    const v2 = () => ({ version: 2 });
    register('test-overwrite', v1);
    register('test-overwrite', v2);
    const p = createProvider({ provider: 'test-overwrite' });
    assert.equal(p.version, 2);
  });

  it('throws on empty name', () => {
    assert.throws(() => register('', FAKE_ADAPTER), /non-empty string/);
  });

  it('throws when factory is not a function', () => {
    assert.throws(() => register('test-bad', 'notafunction'), /must be a function/);
  });
});

describe('createProvider', () => {
  it('calls the registered factory with config and returns result', () => {
    register('test-factory', (cfg) => ({ marker: cfg.marker }));
    const p = createProvider({ provider: 'test-factory', marker: 'hello' });
    assert.equal(p.marker, 'hello');
  });

  it('throws for unknown provider', () => {
    assert.throws(() => createProvider({ provider: 'does-not-exist-xyz' }), /Unknown LLM provider/);
  });

  it('throws when config.provider is missing', () => {
    assert.throws(() => createProvider({}), /config\.provider is required/);
  });
});

describe('hasProvider', () => {
  it('returns true for registered provider', () => {
    register('test-has-yes', FAKE_ADAPTER);
    assert.ok(hasProvider('test-has-yes'));
  });

  it('returns false for unregistered provider', () => {
    assert.ok(!hasProvider('test-has-no-xyz'));
  });
});
