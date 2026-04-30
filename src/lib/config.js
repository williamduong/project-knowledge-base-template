'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_RELATIVE_PATH = path.join('.kb', 'config.json');

const DEFAULTS = {
  estimator: {
    tokenRatio: 4,
    time: {
      md: 5,
      codeSmall: 15,
      codeLarge: 30,
      config: 3,
    },
  },
  impact: {
    defaultDepth: 2,
    maxDepth: 5,
  },
};

function configFilePath(contentRoot) {
  return path.join(contentRoot, CONFIG_RELATIVE_PATH);
}

function loadConfig(contentRoot) {
  const filePath = configFilePath(contentRoot);
  if (!fs.existsSync(filePath)) {
    return {};
  }
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

function getConfigValue(cfg, dottedPath, defaultValue) {
  if (typeof dottedPath !== 'string' || !dottedPath) {
    return defaultValue;
  }
  const parts = dottedPath.split('.');
  let current = cfg;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    if (!Object.prototype.hasOwnProperty.call(current, part)) {
      return defaultValue;
    }
    current = current[part];
  }
  if (current === undefined) return defaultValue;
  return current;
}

function writeConfig(contentRoot, cfg) {
  const filePath = configFilePath(contentRoot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(cfg || {}, null, 2)}\n`, 'utf8');
  return filePath;
}

module.exports = {
  DEFAULTS,
  configFilePath,
  loadConfig,
  getConfigValue,
  writeConfig,
};
