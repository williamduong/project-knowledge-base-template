'use strict';

const fs = require('fs');
const path = require('path');

const CATALOG_RELATIVE_PATH = path.join('.kb', 'catalog.json');
const CATALOG_SCHEMA_VERSION = 1;

function catalogFilePath(contentRoot) {
  return path.join(contentRoot, CATALOG_RELATIVE_PATH);
}

function isPrereleaseVersion(version) {
  if (typeof version !== 'string') return false;
  return /^v?\d+\.\d+\.\d+-[0-9A-Za-z.-]+$/.test(version.trim());
}

function readCatalog(contentRoot) {
  const filePath = catalogFilePath(contentRoot);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const validated = validateCatalog(parsed);
  if (!validated.ok) {
    throw new Error(`Invalid catalog schema: ${validated.errors.join('; ')}`);
  }

  return parsed;
}

function writeCatalog(contentRoot, catalog) {
  const validated = validateCatalog(catalog);
  if (!validated.ok) {
    throw new Error(`Invalid catalog schema: ${validated.errors.join('; ')}`);
  }

  const filePath = catalogFilePath(contentRoot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  return filePath;
}

function createEmptyCatalog() {
  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    current: null,
    releases: [],
  };
}

function appendReleaseEntry(contentRoot, entry, options = {}) {
  const opts = {
    setCurrent: true,
    ...options,
  };

  const existing = readCatalog(contentRoot) || createEmptyCatalog();
  const next = {
    schemaVersion: existing.schemaVersion,
    current: existing.current,
    releases: [...existing.releases],
  };

  const normalized = normalizeReleaseEntry(entry);

  const duplicate = next.releases.some((item) => item.version === normalized.version);
  if (duplicate) {
    throw new Error(`Release version already exists in catalog: ${normalized.version}`);
  }

  next.releases.unshift(normalized);
  if (opts.setCurrent) {
    next.current = normalized.version;
  }

  writeCatalog(contentRoot, next);
  return normalized;
}

function normalizeReleaseEntry(entry) {
  const source = entry || {};
  return {
    version: String(source.version || '').trim(),
    released_at: String(source.released_at || '').trim(),
    git_tag: String(source.git_tag || '').trim(),
    git_commit: String(source.git_commit || '').trim(),
    template_version: String(source.template_version || '').trim(),
    summary: String(source.summary || '').trim(),
    prerelease: Boolean(source.prerelease),
    stats: normalizeStats(source.stats),
    intents_applied: normalizeIntents(source.intents_applied),
  };
}

function normalizeStats(stats) {
  const source = stats || {};
  return {
    intents_applied: toNonNegativeInt(source.intents_applied),
    docs_changed: toNonNegativeInt(source.docs_changed),
    ad_hoc_commits: toNonNegativeInt(source.ad_hoc_commits),
  };
}

function normalizeIntents(intents) {
  if (!Array.isArray(intents)) {
    return [];
  }
  return intents.filter((item) => item && typeof item === 'object').map((item) => ({ ...item }));
}

function toNonNegativeInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function validateCatalog(catalog) {
  const errors = [];

  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    return { ok: false, errors: ['catalog must be a JSON object'] };
  }

  if (catalog.schemaVersion !== CATALOG_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${CATALOG_SCHEMA_VERSION}`);
  }

  if (!(catalog.current === null || typeof catalog.current === 'string')) {
    errors.push('current must be null or string');
  }

  if (!Array.isArray(catalog.releases)) {
    errors.push('releases must be an array');
  } else {
    const seen = new Set();
    for (let i = 0; i < catalog.releases.length; i += 1) {
      const entry = catalog.releases[i];
      const entryErrors = validateReleaseEntry(entry, i);
      for (const err of entryErrors) errors.push(err);

      if (entry && typeof entry.version === 'string') {
        if (seen.has(entry.version)) {
          errors.push(`releases[${i}].version duplicates another release`);
        }
        seen.add(entry.version);
      }
    }
  }

  if (typeof catalog.current === 'string' && Array.isArray(catalog.releases)) {
    const hasCurrent = catalog.releases.some((entry) => entry && entry.version === catalog.current);
    if (!hasCurrent) {
      errors.push('current must match one release.version');
    }
  }

  return { ok: errors.length === 0, errors };
}

function validateReleaseEntry(entry, index) {
  const errors = [];
  const prefix = `releases[${index}]`;

  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return [`${prefix} must be an object`];
  }

  checkNonEmptyString(entry.version, `${prefix}.version`, errors);
  checkNonEmptyString(entry.released_at, `${prefix}.released_at`, errors);
  checkNonEmptyString(entry.git_tag, `${prefix}.git_tag`, errors);
  checkNonEmptyString(entry.git_commit, `${prefix}.git_commit`, errors);
  checkNonEmptyString(entry.template_version, `${prefix}.template_version`, errors);
  checkNonEmptyString(entry.summary, `${prefix}.summary`, errors);

  if (typeof entry.prerelease !== 'boolean') {
    errors.push(`${prefix}.prerelease must be boolean`);
  }

  if (!entry.stats || typeof entry.stats !== 'object' || Array.isArray(entry.stats)) {
    errors.push(`${prefix}.stats must be an object`);
  } else {
    checkNonNegativeInt(entry.stats.intents_applied, `${prefix}.stats.intents_applied`, errors);
    checkNonNegativeInt(entry.stats.docs_changed, `${prefix}.stats.docs_changed`, errors);
    checkNonNegativeInt(entry.stats.ad_hoc_commits, `${prefix}.stats.ad_hoc_commits`, errors);
  }

  if (!Array.isArray(entry.intents_applied)) {
    errors.push(`${prefix}.intents_applied must be an array`);
  }

  return errors;
}

function checkNonEmptyString(value, label, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${label} must be non-empty string`);
  }
}

function checkNonNegativeInt(value, label, errors) {
  if (!Number.isInteger(value) || value < 0) {
    errors.push(`${label} must be a non-negative integer`);
  }
}

module.exports = {
  CATALOG_SCHEMA_VERSION,
  appendReleaseEntry,
  catalogFilePath,
  createEmptyCatalog,
  isPrereleaseVersion,
  normalizeReleaseEntry,
  readCatalog,
  validateCatalog,
  writeCatalog,
};
