'use strict';

// ---------------------------------------------------------------------------
// LLM Module — Provider registry
//
// Built-in adapters are registered in index.js.
// Enterprise / downstream users register custom adapters via register().
//
// Each adapter factory: (config) => { complete, extract }
//   complete(messages, options?) → { text, usage: { input, output } }
//   extract(prompt, jsonSchema, options?) → object
// ---------------------------------------------------------------------------

const registry = new Map();

function register(name, factory) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Provider name must be a non-empty string');
  }
  if (typeof factory !== 'function') {
    throw new Error(`Provider factory for "${name}" must be a function`);
  }
  registry.set(name, factory);
}

function createProvider(config) {
  if (!config || !config.provider) {
    throw new Error('config.provider is required');
  }
  const factory = registry.get(config.provider);
  if (!factory) {
    const known = [...registry.keys()].join(', ');
    throw new Error(`Unknown LLM provider "${config.provider}". Registered providers: ${known}`);
  }
  return factory(config);
}

function listProviders() {
  return [...registry.keys()];
}

function hasProvider(name) {
  return registry.has(name);
}

module.exports = { register, createProvider, listProviders, hasProvider };
