'use strict';

// ---------------------------------------------------------------------------
// LLM Module — Config resolver
//
// Priority: explicit overrides → env vars → defaults
// Supports any provider; adapter-specific fields (e.g. azureDeployment) are
// passed through as-is.
// ---------------------------------------------------------------------------

const { z } = require('zod');

const PROVIDERS = ['anthropic', 'openai', 'azure', 'openrouter', 'ollama', 'gemini', 'deepseek'];

const ConfigSchema = z.object({
  provider:   z.string().min(1),
  model:      z.string().nullable().default(null),
  apiKey:     z.string().nullable().default(null),
  endpoint:   z.string().url().nullable().default(null),
  maxTokens:  z.number().int().positive().default(4096),
  timeoutMs:  z.number().int().positive().default(30000),
}).passthrough(); // allow adapter-specific extra fields

function resolveConfig(overrides = {}) {
  const raw = {
    provider:  overrides.provider  || process.env.KBX_LLM_PROVIDER  || 'anthropic',
    model:     overrides.model     || process.env.KBX_LLM_MODEL      || null,
    apiKey:    overrides.apiKey    || process.env.KBX_LLM_API_KEY    || null,
    endpoint:  overrides.endpoint  || process.env.KBX_LLM_ENDPOINT   || null,
    maxTokens: overrides.maxTokens || parseInt(process.env.KBX_LLM_MAX_TOKENS || '4096', 10),
    timeoutMs: overrides.timeoutMs || parseInt(process.env.KBX_LLM_TIMEOUT_MS || '30000', 10),
    ...overrides, // passthrough adapter-specific fields (azureDeployment, azureApiVersion, etc.)
  };

  const result = ConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`LLM config invalid: ${issues}`);
  }
  return result.data;
}

module.exports = { resolveConfig, PROVIDERS };
