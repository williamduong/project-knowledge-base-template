'use strict';

// ---------------------------------------------------------------------------
// LLM Adapter — Ollama (local, air-gapped)
//
// Uses Ollama's /api/chat endpoint with stream: false.
// Structured extraction uses format:'json' + schema embedded in the prompt
// since Ollama does not support JSON Schema natively on all models.
// ---------------------------------------------------------------------------

const DEFAULT_MODEL    = 'llama3.2';
const DEFAULT_ENDPOINT = 'http://localhost:11434';

function createAdapter(config) {
  const endpoint  = (config.endpoint || DEFAULT_ENDPOINT).replace(/\/$/, '');
  const model     = config.model     || DEFAULT_MODEL;
  const timeoutMs = config.timeoutMs || 120000; // local models can be slow

  async function _post(path, body, options = {}) {
    const res = await fetch(`${endpoint}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(options.timeoutMs || timeoutMs),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Ollama ${res.status}: ${text.slice(0, 300)}`);
    }
    return res.json();
  }

  // messages: [{role: 'user'|'assistant'|'system', content: string}]
  async function complete(messages, options = {}) {
    const data = await _post('/api/chat', {
      model:   options.model || model,
      messages,
      stream:  false,
    }, options);
    return {
      text:  data.message.content,
      usage: { input: data.prompt_eval_count || 0, output: data.eval_count || 0 },
    };
  }

  // Structured extraction — embeds JSON schema in prompt + requests JSON mode.
  async function extract(prompt, jsonSchema, options = {}) {
    const schemaStr  = JSON.stringify(jsonSchema, null, 2);
    const fullPrompt = `${prompt}\n\nRespond ONLY with a valid JSON object that matches this schema (no markdown, no explanation):\n${schemaStr}`;

    const data = await _post('/api/chat', {
      model:   options.model || model,
      messages: [{ role: 'user', content: fullPrompt }],
      stream:  false,
      format:  'json',
    }, options);

    try {
      return JSON.parse(data.message.content);
    } catch {
      throw new Error(`Ollama: response is not valid JSON: ${data.message.content.slice(0, 200)}`);
    }
  }

  // Ping via /api/tags (no model needed, just checks if Ollama is running).
  async function ping() {
    const start = Date.now();
    try {
      const res = await fetch(`${endpoint}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const models = (data.models || []).map(m => m.name);
      return {
        ok:        true,
        provider:  'ollama',
        model,
        endpoint,
        models,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return { ok: false, provider: 'ollama', endpoint, error: err.message };
    }
  }

  return { complete, extract, ping };
}

module.exports = { createAdapter };
