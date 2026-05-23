'use strict';

// ---------------------------------------------------------------------------
// LLM Adapter — DeepSeek
//
// DeepSeek's API is fully OpenAI-compatible (Chat Completions).
// This adapter is a thin preset over the OpenAI adapter with DeepSeek's
// endpoint and default model pre-configured.
//
// Models: deepseek-chat (V3), deepseek-reasoner (R1)
// Docs: https://platform.deepseek.com/api-docs
// ---------------------------------------------------------------------------

const { createAdapter: createOpenAIAdapter } = require('./openai');

const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com';
const DEFAULT_MODEL     = 'deepseek-chat';

function createAdapter(config) {
  return createOpenAIAdapter({
    ...config,
    provider:  'deepseek',
    endpoint:  config.endpoint || DEEPSEEK_ENDPOINT,
    model:     config.model    || DEFAULT_MODEL,
  });
}

module.exports = { createAdapter };
