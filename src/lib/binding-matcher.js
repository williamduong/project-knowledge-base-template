const { minimatch } = require('minimatch');

const DEFAULT_OPTIONS = {
  dot: false,
  nocase: false,
  matchBase: false,
};

function normalizePath(p) {
  if (typeof p !== 'string') {
    return '';
  }
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

function toPatternList(patterns) {
  if (!patterns) {
    return [];
  }
  const arr = Array.isArray(patterns) ? patterns : [patterns];
  return arr
    .filter((p) => typeof p === 'string' && p.trim().length > 0)
    .map((p) => normalizePath(p.trim()));
}

function matchAny(filePath, patterns, options = {}) {
  const file = normalizePath(filePath);
  if (!file) {
    return false;
  }
  const list = toPatternList(patterns);
  if (list.length === 0) {
    return false;
  }
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return list.some((pattern) => minimatch(file, pattern, opts));
}

function matchPaths(filePaths, patterns, options = {}) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    return [];
  }
  const list = toPatternList(patterns);
  if (list.length === 0) {
    return [];
  }
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const matched = [];
  for (const raw of filePaths) {
    const file = normalizePath(raw);
    if (!file) {
      continue;
    }
    if (list.some((pattern) => minimatch(file, pattern, opts))) {
      matched.push(file);
    }
  }
  return matched;
}

module.exports = {
  matchAny,
  matchPaths,
  normalizePath,
  toPatternList,
};
