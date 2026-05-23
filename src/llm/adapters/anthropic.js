'use strict';

// ---------------------------------------------------------------------------
// LLM Adapter — Anthropic (Messages API)
//
// complete()  → standard chat completion
// extract()   → structured output via tool_use (forces valid JSON per schema)
// ping()      → lightweight connectivity check
//
// Raw fetch — no @anthropic-ai/sdk dependency required.
// ---------------------------------------------------------------------------

const DEFAULT_MODEL   = 'claude-sonnet-4-6';
const DEFAULT_ENDPOINT = 'https://api.anthropic.com';
const ANTHROPIC_VERSION = '2023-06-01';

function createAdapter(config) {
  const apiKey   = config.apiKey;
  const endpoint = (config.endpoint || DEFAULT_ENDPOINT).replace(/\/$/, '');
  const model    = config.model    || DEFAULT_MODEL;
  const maxTokens = config.maxTokens || 4096;
  const timeoutMs = config.timeoutMs || 30000;

  function headers() {
    return {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey || '',
      'anthropic-version': ANTHROPIC_VERSION,
    };
  }

  async function _post(path, body, options = {}) {
    const res = await fetch(`${endpoint}${path}`, {
      method:  'POST',
      headers: headers(),
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(options.timeoutMs || timeoutMs),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Anthropic ${res.status}: ${text.slice(0, 300)}`);
    }
    return res.json();
  }

  // Standard chat completion.
  // messages: [{role: 'user'|'assistant', content: string}]
  // options: { model?, maxTokens?, system?, timeoutMs? }
  async function complete(messages, options = {}) {
    const body = {
      model:      options.model     || model,
      max_tokens: options.maxTokens || maxTokens,
      messages,
    };
    if (options.system) body.system = options.system;

    const data = await _post('/v1/messages', body, options);
    return {
      text:  data.content[0].text,
      usage: { input: data.usage.input_tokens, output: data.usage.output_tokens },
    };
  }

  // Structured extraction — forces response to match jsonSchema via tool_use.
  // prompt: string
  // jsonSchema: JSON Schema object (type: 'object', properties, required...)
  // options: { model?, maxTokens?, timeoutMs? }
  async function extract(prompt, jsonSchema, options = {}) {
    const data = await _post('/v1/messages', {
      model:      options.model     || model,
      max_tokens: options.maxTokens || maxTokens,
      tools: [{
        name:         'extract',
        description:  'Extract structured data from the input',
        input_schema: jsonSchema,
      }],
      tool_choice: { type: 'tool', name: 'extract' },
      messages: [{ role: 'user', content: prompt }],
    }, options);

    const toolBlock = data.content.find(b => b.type === 'tool_use');
    if (!toolBlock) throw new Error('Anthropic: no tool_use block in response');
    return toolBlock.input;
  }

  // Lightweight ping — sends minimal request to verify API key + connectivity.
  async function ping() {
    const start = Date.now();
    try {
      await complete([{ role: 'user', content: 'ping' }], { maxTokens: 1 });
      return { ok: true, provider: 'anthropic', model, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, provider: 'anthropic', error: err.message };
    }
  }

  return { complete, extract, ping };
}

module.exports = { createAdapter };
