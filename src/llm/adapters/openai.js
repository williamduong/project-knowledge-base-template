'use strict';

// ---------------------------------------------------------------------------
// LLM Adapter — OpenAI-compatible (Chat Completions API)
//
// Handles: OpenAI, Azure OpenAI, OpenRouter, and any OpenAI-compatible server.
//
// Azure config extras:
//   config.azureDeployment  — deployment name (replaces model in URL)
//   config.azureApiVersion  — API version (default: 2024-02-01)
//
// OpenRouter:
//   config.provider = 'openrouter'
//   config.endpoint = 'https://openrouter.ai/api'
//   config.model    = 'anthropic/claude-sonnet-4-6' (or any OR model string)
// ---------------------------------------------------------------------------

const DEFAULTS = {
  openai:      { endpoint: 'https://api.openai.com', model: 'gpt-4o' },
  azure:       { endpoint: null,                     model: null     }, // endpoint required
  openrouter:  { endpoint: 'https://openrouter.ai/api', model: 'openai/gpt-4o' },
};

function createAdapter(config) {
  const providerKey = config.provider || 'openai';
  const defaults    = DEFAULTS[providerKey] || DEFAULTS.openai;

  const apiKey    = config.apiKey;
  const endpoint  = (config.endpoint || defaults.endpoint || '').replace(/\/$/, '');
  const model     = config.model     || defaults.model;
  const maxTokens = config.maxTokens || 4096;
  const timeoutMs = config.timeoutMs || 30000;

  const isAzure = providerKey === 'azure';

  function buildUrl(path) {
    if (isAzure) {
      const deploy  = config.azureDeployment || model;
      const version = config.azureApiVersion || '2024-02-01';
      return `${endpoint}/openai/deployments/${deploy}${path}?api-version=${version}`;
    }
    return `${endpoint}/v1${path}`;
  }

  function headers() {
    const h = { 'Content-Type': 'application/json' };
    if (isAzure) {
      h['api-key'] = apiKey || '';
    } else {
      h['Authorization'] = `Bearer ${apiKey || ''}`;
    }
    // OpenRouter expects a Referer / HTTP-Referer header (recommended)
    if (providerKey === 'openrouter') {
      h['HTTP-Referer'] = config.referer || 'https://github.com/williamduong/kbx';
    }
    return h;
  }

  async function _post(path, body, options = {}) {
    const res = await fetch(buildUrl(path), {
      method:  'POST',
      headers: headers(),
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(options.timeoutMs || timeoutMs),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${providerKey} ${res.status}: ${text.slice(0, 300)}`);
    }
    return res.json();
  }

  // Standard chat completion.
  // messages: [{role: 'system'|'user'|'assistant', content: string}]
  async function complete(messages, options = {}) {
    const data = await _post('/chat/completions', {
      model:      options.model     || model,
      max_tokens: options.maxTokens || maxTokens,
      messages,
    }, options);
    return {
      text:  data.choices[0].message.content,
      usage: { input: data.usage.prompt_tokens, output: data.usage.completion_tokens },
    };
  }

  // Structured extraction via JSON schema response_format (gpt-4o+).
  // Falls back to function-calling style for older models if needed.
  async function extract(prompt, jsonSchema, options = {}) {
    const data = await _post('/chat/completions', {
      model:      options.model     || model,
      max_tokens: options.maxTokens || maxTokens,
      response_format: {
        type:        'json_schema',
        json_schema: { name: 'extract', schema: jsonSchema, strict: true },
      },
      messages: [{ role: 'user', content: prompt }],
    }, options);

    const content = data.choices[0].message.content;
    try {
      return JSON.parse(content);
    } catch {
      throw new Error(`${providerKey}: response was not valid JSON: ${content.slice(0, 200)}`);
    }
  }

  async function ping() {
    const start = Date.now();
    try {
      await complete([{ role: 'user', content: 'ping' }], { maxTokens: 1 });
      return { ok: true, provider: providerKey, model, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, provider: providerKey, error: err.message };
    }
  }

  return { complete, extract, ping };
}

module.exports = { createAdapter };
