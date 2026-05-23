'use strict';

// ---------------------------------------------------------------------------
// LLM Adapter — Google Gemini (Generative Language API v1beta)
//
// API format differs from OpenAI — uses "contents" not "messages",
// role is "user"/"model" (not "assistant"), parts array wraps text.
//
// Structured extraction uses responseSchema + responseMimeType:'application/json'
// which forces Gemini to return valid JSON matching the given schema.
//
// Docs: https://ai.google.dev/api/generate-content
// ---------------------------------------------------------------------------

const DEFAULT_MODEL   = 'gemini-2.0-flash';
const DEFAULT_ENDPOINT = 'https://generativelanguage.googleapis.com';

function createAdapter(config) {
  const apiKey    = config.apiKey;
  const endpoint  = (config.endpoint || DEFAULT_ENDPOINT).replace(/\/$/, '');
  const model     = config.model     || DEFAULT_MODEL;
  const maxTokens = config.maxTokens || 4096;
  const timeoutMs = config.timeoutMs || 30000;

  function buildUrl(modelName, action) {
    return `${endpoint}/v1beta/models/${modelName}:${action}?key=${apiKey || ''}`;
  }

  // Convert OpenAI-style messages [{role, content}] to Gemini contents format.
  // Gemini roles: "user" | "model" (not "assistant")
  // System messages: Gemini has a separate systemInstruction field.
  function toGeminiContents(messages) {
    const system   = [];
    const contents = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system.push({ text: msg.content });
      } else {
        contents.push({
          role:  msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }
    return { contents, system };
  }

  async function _post(url, body, options = {}) {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(options.timeoutMs || timeoutMs),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Gemini ${res.status}: ${text.slice(0, 300)}`);
    }
    return res.json();
  }

  // messages: [{role: 'user'|'assistant'|'system', content: string}]
  // options: { model?, maxTokens?, timeoutMs? }
  async function complete(messages, options = {}) {
    const { contents, system } = toGeminiContents(messages);
    const body = {
      contents,
      generationConfig: { maxOutputTokens: options.maxTokens || maxTokens },
    };
    if (system.length > 0) body.systemInstruction = { parts: system };

    const useModel = options.model || model;
    const data = await _post(buildUrl(useModel, 'generateContent'), body, options);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text === undefined) throw new Error('Gemini: no text in response');
    return {
      text,
      usage: {
        input:  data.usageMetadata?.promptTokenCount     || 0,
        output: data.usageMetadata?.candidatesTokenCount || 0,
      },
    };
  }

  // Structured extraction using responseSchema (Gemini native JSON mode).
  // jsonSchema: JSON Schema object — Gemini accepts a subset (type, properties, required, items)
  async function extract(prompt, jsonSchema, options = {}) {
    const useModel = options.model || model;
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens:  options.maxTokens || maxTokens,
        responseMimeType: 'application/json',
        responseSchema:   jsonSchema,
      },
    };

    const data = await _post(buildUrl(useModel, 'generateContent'), body, options);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text === undefined) throw new Error('Gemini: no text in response');
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Gemini: response is not valid JSON: ${text.slice(0, 200)}`);
    }
  }

  // Ping via models list endpoint (no token cost).
  async function ping() {
    const start = Date.now();
    try {
      const res = await fetch(`${endpoint}/v1beta/models?key=${apiKey || ''}&pageSize=1`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      return { ok: true, provider: 'gemini', model, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, provider: 'gemini', error: err.message };
    }
  }

  return { complete, extract, ping };
}

module.exports = { createAdapter };
