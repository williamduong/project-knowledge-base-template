'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { z } = require('zod');
const { createProvider } = require('../llm');

const DEFAULT_SETTINGS = {
  schema_version: '0.1.0',
  provider: 'deepseek',
  model: 'deepseek-v4-flash',
  endpoint: 'https://api.deepseek.com',
  system_prompt: '',
  planning_harness_prompt: '',
  app_primary_goals: '',
  app_description: '',
  encrypted_api_key: null,
  updated_at: null,
};

const PublicAiSettingsSchema = z.object({
  schema_version: z.string().min(1),
  provider: z.literal('deepseek'),
  model: z.string().min(1),
  endpoint: z.string().url(),
  system_prompt: z.string(),
  planning_harness_prompt: z.string(),
  app_primary_goals: z.string(),
  app_description: z.string(),
  has_api_key: z.boolean(),
  api_key_masked: z.string().nullable(),
  updated_at: z.string().nullable(),
});

function resolveAiSettingsPaths(workspaceRoot) {
  const runtimeRoot = path.join(workspaceRoot, 'site', 'kbx-ui', '.runtime-state');
  return {
    runtimeRoot,
    settingsPath: path.join(runtimeRoot, 'ai-settings.json'),
    secretPath: path.join(runtimeRoot, 'ai-settings.key'),
  };
}

function ensureRuntimeRoot(paths) {
  fs.mkdirSync(paths.runtimeRoot, { recursive: true });
}

function ensureSecretKey(paths) {
  ensureRuntimeRoot(paths);
  if (!fs.existsSync(paths.secretPath)) {
    fs.writeFileSync(paths.secretPath, crypto.randomBytes(32).toString('base64url'), 'utf8');
  }
  return Buffer.from(fs.readFileSync(paths.secretPath, 'utf8').trim(), 'base64url');
}

function encryptSecret(secret, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64url'),
    tag: tag.toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  };
}

function decryptSecret(payload, key) {
  if (!payload) return null;
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(String(payload.iv || ''), 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(String(payload.tag || ''), 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(String(payload.ciphertext || ''), 'base64url')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

function maskApiKey(apiKey) {
  if (!apiKey) return null;
  if (apiKey.length <= 8) return '*'.repeat(apiKey.length);
  return `${apiKey.slice(0, 4)}${'*'.repeat(Math.max(0, apiKey.length - 8))}${apiKey.slice(-4)}`;
}

function readRawSettings(paths) {
  if (!fs.existsSync(paths.settingsPath)) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(paths.settingsPath, 'utf8'));
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeRawSettings(paths, settings) {
  ensureRuntimeRoot(paths);
  fs.writeFileSync(paths.settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}

function readAiSettings(workspaceRoot) {
  const paths = resolveAiSettingsPaths(workspaceRoot);
  const raw = readRawSettings(paths);
  const key = ensureSecretKey(paths);
  const apiKey = raw.encrypted_api_key ? decryptSecret(raw.encrypted_api_key, key) : null;
  const normalized = {
    schema_version: raw.schema_version || DEFAULT_SETTINGS.schema_version,
    provider: 'deepseek',
    model: raw.model || DEFAULT_SETTINGS.model,
    endpoint: raw.endpoint || DEFAULT_SETTINGS.endpoint,
    system_prompt: String(raw.system_prompt || ''),
    planning_harness_prompt: String(raw.planning_harness_prompt || ''),
    app_primary_goals: String(raw.app_primary_goals || ''),
    app_description: String(raw.app_description || ''),
    has_api_key: Boolean(apiKey),
    api_key_masked: maskApiKey(apiKey),
    updated_at: raw.updated_at || null,
    api_key: apiKey,
  };
  PublicAiSettingsSchema.parse({
    ...normalized,
    api_key_masked: normalized.api_key_masked,
  });
  return normalized;
}

function updateAiSettings(workspaceRoot, patch = {}) {
  const paths = resolveAiSettingsPaths(workspaceRoot);
  const raw = readRawSettings(paths);
  const secretKey = ensureSecretKey(paths);
  const next = {
    ...raw,
    provider: 'deepseek',
    model: typeof patch.model === 'string' && patch.model.trim() ? patch.model.trim() : raw.model || DEFAULT_SETTINGS.model,
    endpoint: typeof patch.endpoint === 'string' && patch.endpoint.trim() ? patch.endpoint.trim() : raw.endpoint || DEFAULT_SETTINGS.endpoint,
    system_prompt: typeof patch.system_prompt === 'string' ? patch.system_prompt : String(raw.system_prompt || ''),
    planning_harness_prompt: typeof patch.planning_harness_prompt === 'string' ? patch.planning_harness_prompt : String(raw.planning_harness_prompt || ''),
    app_primary_goals: typeof patch.app_primary_goals === 'string' ? patch.app_primary_goals : String(raw.app_primary_goals || ''),
    app_description: typeof patch.app_description === 'string' ? patch.app_description : String(raw.app_description || ''),
    updated_at: new Date().toISOString(),
  };

  if (patch.clear_api_key === true) {
    next.encrypted_api_key = null;
  } else if (typeof patch.api_key === 'string' && patch.api_key.trim()) {
    next.encrypted_api_key = encryptSecret(patch.api_key.trim(), secretKey);
  } else {
    next.encrypted_api_key = raw.encrypted_api_key || null;
  }

  writeRawSettings(paths, next);
  return readAiSettings(workspaceRoot);
}

async function pingAiSettings(workspaceRoot) {
  const settings = readAiSettings(workspaceRoot);
  if (!settings.api_key) {
    return {
      ok: false,
      provider: 'deepseek',
      error: 'DeepSeek API key is not configured.',
    };
  }

  const provider = createProvider({
    provider: 'deepseek',
    model: settings.model,
    endpoint: settings.endpoint,
    apiKey: settings.api_key,
  });

  return provider.ping();
}

module.exports = {
  DEFAULT_SETTINGS,
  resolveAiSettingsPaths,
  readAiSettings,
  updateAiSettings,
  pingAiSettings,
  maskApiKey,
};
