'use strict';

// ---------------------------------------------------------------------------
// LLM Module — Public API
//
// Usage (consumer code):
//   const { createProvider, resolveConfig } = require('../llm');
//   const cfg      = resolveConfig({ provider: 'ollama', model: 'llama3.2' });
//   const provider = createProvider(cfg);
//   const result   = await provider.complete([{ role: 'user', content: 'hello' }]);
//
// Register a custom adapter (enterprise / downstream):
//   const { register } = require('../llm');
//   register('my-provider', require('./my-adapter').createAdapter);
// ---------------------------------------------------------------------------

const { resolveConfig, PROVIDERS } = require('./config');
const { register, createProvider, listProviders, hasProvider } = require('./registry');

// Register built-in adapters
register('anthropic',  require('./adapters/anthropic').createAdapter);
register('openai',     require('./adapters/openai').createAdapter);
register('azure',      require('./adapters/openai').createAdapter); // same adapter, Azure config path
register('openrouter', require('./adapters/openai').createAdapter); // OpenAI-compatible
register('ollama',     require('./adapters/ollama').createAdapter);

module.exports = {
  // Core
  resolveConfig,
  createProvider,

  // Registry (for custom adapters)
  register,
  listProviders,
  hasProvider,

  // Constants
  PROVIDERS, // built-in provider names
};
