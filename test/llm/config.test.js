'use strict';

const assert = require('node:assert/strict');
const { describe, it, beforeEach, afterEach } = require('node:test');
const { resolveConfig, PROVIDERS } = require('../../src/llm/config');

// Save/restore env vars around each test
const ENV_KEYS = [
  'KBX_LLM_PROVIDER', 'KBX_LLM_MODEL', 'KBX_LLM_API_KEY',
  'KBX_LLM_ENDPOINT', 'KBX_LLM_MAX_TOKENS', 'KBX_LLM_TIMEOUT_MS',
];

describe('resolveConfig', () => {
  let saved;

  beforeEach(() => {
    saved = {};
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('returns defaults when no env vars or overrides', () => {
    const cfg = resolveConfig();
    assert.equal(cfg.provider,  'anthropic');
    assert.equal(cfg.model,     null);
    assert.equal(cfg.apiKey,    null);
    assert.equal(cfg.endpoint,  null);
    assert.equal(cfg.maxTokens, 4096);
    assert.equal(cfg.timeoutMs, 30000);
  });

  it('reads provider from env var', () => {
    process.env.KBX_LLM_PROVIDER = 'ollama';
    assert.equal(resolveConfig().provider, 'ollama');
  });

  it('reads model from env var', () => {
    process.env.KBX_LLM_MODEL = 'llama3.2';
    assert.equal(resolveConfig().model, 'llama3.2');
  });

  it('reads apiKey from env var', () => {
    process.env.KBX_LLM_API_KEY = 'sk-test-1234';
    assert.equal(resolveConfig().apiKey, 'sk-test-1234');
  });

  it('reads endpoint from env var', () => {
    process.env.KBX_LLM_ENDPOINT = 'http://localhost:11434';
    assert.equal(resolveConfig().endpoint, 'http://localhost:11434');
  });

  it('reads maxTokens from env var', () => {
    process.env.KBX_LLM_MAX_TOKENS = '2048';
    assert.equal(resolveConfig().maxTokens, 2048);
  });

  it('overrides take precedence over env vars', () => {
    process.env.KBX_LLM_PROVIDER = 'openai';
    const cfg = resolveConfig({ provider: 'ollama' });
    assert.equal(cfg.provider, 'ollama');
  });

  it('passthrough of extra fields (adapter-specific)', () => {
    const cfg = resolveConfig({ provider: 'azure', azureDeployment: 'my-deploy', azureApiVersion: '2024-01-01' });
    assert.equal(cfg.azureDeployment, 'my-deploy');
    assert.equal(cfg.azureApiVersion, '2024-01-01');
  });

  it('throws on invalid endpoint URL', () => {
    assert.throws(() => resolveConfig({ endpoint: 'not-a-url' }), /LLM config invalid/);
  });
});

describe('PROVIDERS', () => {
  it('is an array of built-in provider names', () => {
    assert.ok(Array.isArray(PROVIDERS));
    assert.ok(PROVIDERS.includes('anthropic'));
    assert.ok(PROVIDERS.includes('openai'));
    assert.ok(PROVIDERS.includes('ollama'));
  });
});
