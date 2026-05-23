'use strict';

// ---------------------------------------------------------------------------
// kbx llm — LLM provider management
// Subcommands: list | status | ping | help
// ---------------------------------------------------------------------------

const { resolveConfig, createProvider, listProviders } = require('../llm');

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const options = { sub: null, json: false, provider: null, model: null };
  const rest    = [];

  for (let i = 0; i < (args || []).length; i++) {
    const arg = args[i];
    if (arg === '--json')                { options.json     = true;                       continue; }
    if (arg.startsWith('--provider='))  { options.provider = arg.slice('--provider='.length); continue; }
    if (arg.startsWith('--model='))     { options.model    = arg.slice('--model='.length);    continue; }
    if (!arg.startsWith('--'))          { rest.push(arg);                                 continue; }
    throw new Error(`Unknown llm option "${arg}". Run "kbx llm help" for usage.`);
  }

  options.sub = rest[0] || 'help';
  return options;
}

// ---------------------------------------------------------------------------
// Subcommand: list
// Lists all registered providers.
// ---------------------------------------------------------------------------

function runList(options) {
  const providers = listProviders();

  if (options.json) {
    console.log(JSON.stringify({ providers }));
    return;
  }

  console.log('Registered LLM providers:');
  for (const p of providers) {
    console.log(`  ${p}`);
  }
}

// ---------------------------------------------------------------------------
// Subcommand: status
// Shows current resolved config (masks API key).
// ---------------------------------------------------------------------------

function runStatus(options) {
  let cfg;
  try {
    cfg = resolveConfig(options.provider ? { provider: options.provider } : {});
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Config error: ${err.message}`);
    }
    process.exit(1);
  }

  // Mask API key for display
  const display = {
    ...cfg,
    apiKey: cfg.apiKey
      ? `${cfg.apiKey.slice(0, 4)}${'*'.repeat(Math.max(0, cfg.apiKey.length - 8))}${cfg.apiKey.slice(-4)}`
      : null,
  };

  if (options.json) {
    console.log(JSON.stringify({ ok: true, config: display }));
    return;
  }

  console.log('LLM config (resolved):');
  console.log(`  provider:  ${display.provider}`);
  console.log(`  model:     ${display.model    || '(provider default)'}`);
  console.log(`  endpoint:  ${display.endpoint || '(provider default)'}`);
  console.log(`  apiKey:    ${display.apiKey   || '(not set)'}`);
  console.log(`  maxTokens: ${display.maxTokens}`);
  console.log(`  timeoutMs: ${display.timeoutMs}`);
  console.log('');
  console.log('Env vars: KBX_LLM_PROVIDER  KBX_LLM_MODEL  KBX_LLM_API_KEY  KBX_LLM_ENDPOINT');
}

// ---------------------------------------------------------------------------
// Subcommand: ping
// Creates provider and calls ping() to verify connectivity + API key.
// ---------------------------------------------------------------------------

async function runPing(options) {
  let cfg;
  try {
    cfg = resolveConfig(options.provider ? { provider: options.provider, model: options.model } : {});
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Config error: ${err.message}`);
    }
    process.exit(1);
  }

  if (!options.json) {
    console.log(`Pinging ${cfg.provider} (${cfg.model || 'default model'}) …`);
  }

  let provider;
  try {
    provider = createProvider(cfg);
  } catch (err) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: err.message }));
    } else {
      console.error(`Provider error: ${err.message}`);
    }
    process.exit(1);
  }

  if (typeof provider.ping !== 'function') {
    const msg = `Provider "${cfg.provider}" does not implement ping()`;
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: msg }));
    } else {
      console.error(msg);
    }
    process.exit(1);
  }

  const result = await provider.ping();

  if (options.json) {
    console.log(JSON.stringify(result));
    return;
  }

  if (result.ok) {
    console.log(`OK — ${result.provider} / ${result.model || ''} [${result.latencyMs}ms]`);
    if (result.models) {
      console.log(`Available models: ${result.models.slice(0, 10).join(', ')}${result.models.length > 10 ? '…' : ''}`);
    }
  } else {
    console.error(`FAIL — ${result.provider}: ${result.error}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`
kbx llm — LLM provider management

Usage:
  kbx llm list                              List all registered providers.
  kbx llm status   [--provider=<name>]      Show resolved config (masked API key).
  kbx llm ping     [--provider=<name>] [--model=<model>]
                                            Test connectivity + API key.
  kbx llm help                              Show this message.

Built-in providers:
  anthropic   — Anthropic Claude (api.anthropic.com)
  openai      — OpenAI (api.openai.com)
  azure       — Azure OpenAI (requires --endpoint + azureDeployment config)
  openrouter  — OpenRouter (openrouter.ai, OpenAI-compatible)
  ollama      — Ollama local (http://localhost:11434)

Config (env vars):
  KBX_LLM_PROVIDER     Provider name          (default: anthropic)
  KBX_LLM_MODEL        Model name             (default: provider default)
  KBX_LLM_API_KEY      API key
  KBX_LLM_ENDPOINT     Override base endpoint (e.g. Azure URL)
  KBX_LLM_MAX_TOKENS   Max output tokens      (default: 4096)
  KBX_LLM_TIMEOUT_MS   Request timeout ms     (default: 30000)

Custom providers (downstream / enterprise):
  const { register } = require('@williamduong/kbx/llm');
  register('my-provider', require('./my-adapter').createAdapter);
  `.trim());
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

async function runLlm(args) {
  let options;
  try {
    options = parseArgs(args);
  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }

  if (options.sub === 'help')   { printHelp();              return; }
  if (options.sub === 'list')   { runList(options);         return; }
  if (options.sub === 'status') { runStatus(options);       return; }
  if (options.sub === 'ping')   { await runPing(options);   return; }

  console.error(`Unknown subcommand "${options.sub}". Run "kbx llm help" for usage.`);
  process.exit(1);
}

module.exports = { runLlm, parseArgs };
