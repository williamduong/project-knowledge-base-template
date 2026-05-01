'use strict';

const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { runGitCommand } = require('../lib/git');
const {
  appendReleaseEntry,
  createEmptyCatalog,
  isPrereleaseVersion,
  readCatalog,
  writeCatalog,
} = require('../lib/catalog');
const { loadConfig, getConfigValue, DEFAULTS } = require('../lib/config');

function parseArgs(args) {
  const options = {
    json: false,
    sub: null,
    version: null,
    summary: null,
    ignorePrerelease: null,
  };

  const rest = [];
  for (const arg of args || []) {
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--ignore-prerelease') {
      options.ignorePrerelease = true;
      continue;
    }
    if (arg === '--include-prerelease') {
      options.ignorePrerelease = false;
      continue;
    }
    if (arg.startsWith('--summary=')) {
      options.summary = arg.slice('--summary='.length).trim();
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(
        `Unknown release option "${arg}". Supported: --json, --summary=..., --ignore-prerelease, --include-prerelease`
      );
    }
    rest.push(arg);
  }

  if (rest.length === 0) {
    throw new Error('kb release requires a subcommand: init | tag | list | show');
  }

  options.sub = rest[0];

  if (options.sub === 'init' || options.sub === 'list') {
    if (rest.length > 1) {
      throw new Error(`kb release ${options.sub} takes no positional arguments`);
    }
    return options;
  }

  if (options.sub === 'show') {
    if (rest.length !== 2) {
      throw new Error('kb release show requires exactly 1 argument: <version>');
    }
    options.version = rest[1];
    return options;
  }

  if (options.sub === 'tag') {
    if (rest.length !== 2) {
      throw new Error('kb release tag requires exactly 1 argument: <version>');
    }
    if (!options.summary) {
      throw new Error('kb release tag requires --summary=<text>');
    }
    options.version = rest[1];
    return options;
  }

  throw new Error(`kb release: unknown subcommand "${options.sub}". Supported: init | tag | list | show`);
}

function normalizePrefix(prefix) {
  const p = String(prefix || '').replace(/\\/g, '/').trim();
  if (!p) return '';
  return p.endsWith('/') ? p : `${p}/`;
}

function getReleaseContentPaths(contentRoot) {
  const cfg = loadConfig(contentRoot);
  const configured = getConfigValue(cfg, 'release.contentPaths', DEFAULTS.release.contentPaths);
  if (!Array.isArray(configured) || configured.length === 0) {
    return DEFAULTS.release.contentPaths;
  }
  return configured.map(normalizePrefix).filter(Boolean);
}

function getIgnorePrerelease(contentRoot, override) {
  if (typeof override === 'boolean') {
    return override;
  }
  const cfg = loadConfig(contentRoot);
  return Boolean(getConfigValue(cfg, 'release.ignorePrerelease', DEFAULTS.release.ignorePrerelease));
}

function parseListOutput(raw) {
  if (!raw) return [];
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function getVersionTags(workspaceRoot) {
  const raw = runGitCommand("git tag --list 'v*' --sort=v:refname", workspaceRoot);
  return parseListOutput(raw);
}

function getReleaseDate(workspaceRoot, tag) {
  const tagDate = runGitCommand(`git for-each-ref refs/tags/${tag} --format=%(taggerdate:short)`, workspaceRoot);
  if (tagDate) return tagDate;
  const commitDate = runGitCommand(`git show -s --format=%cs ${tag}`, workspaceRoot);
  if (commitDate) return commitDate;
  return new Date().toISOString().slice(0, 10);
}

function getTagSummary(workspaceRoot, tag) {
  const subject = runGitCommand(`git tag -l --format=%(contents:subject) ${tag}`, workspaceRoot);
  if (subject) return subject;
  const commitSubject = runGitCommand(`git show -s --format=%s ${tag}`, workspaceRoot);
  if (commitSubject) return commitSubject;
  return `Release ${tag}`;
}

function getDocsChangedCount(workspaceRoot, rangeSpec, contentPaths) {
  if (!rangeSpec) return 0;
  const raw = runGitCommand(`git diff --name-only ${rangeSpec}`, workspaceRoot);
  if (!raw) return 0;
  const files = parseListOutput(raw).map((file) => file.replace(/\\/g, '/'));
  const matched = files.filter((file) => contentPaths.some((prefix) => file.startsWith(prefix)));
  return new Set(matched).size;
}

function getCommitCount(workspaceRoot, rangeSpec) {
  if (!rangeSpec) return 0;
  const raw = runGitCommand(`git rev-list --count ${rangeSpec}`, workspaceRoot);
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function buildEntryFromTag({ workspaceRoot, tag, previousTag, contentPaths, summaryOverride }) {
  const fullCommit = runGitCommand(`git rev-list -n 1 ${tag}`, workspaceRoot);
  if (!fullCommit) {
    throw new Error(`Tag not found or unreachable: ${tag}`);
  }

  const rangeSpec = previousTag ? `${previousTag}..${tag}` : null;
  const releasedAt = getReleaseDate(workspaceRoot, tag);
  const prerelease = isPrereleaseVersion(tag);
  const summary = summaryOverride || getTagSummary(workspaceRoot, tag);

  return {
    version: tag,
    released_at: releasedAt,
    git_tag: tag,
    git_commit: fullCommit.slice(0, 7),
    template_version: tag,
    summary,
    prerelease,
    stats: {
      intents_applied: 0,
      docs_changed: getDocsChangedCount(workspaceRoot, rangeSpec, contentPaths),
      ad_hoc_commits: getCommitCount(workspaceRoot, rangeSpec),
    },
    intents_applied: [],
  };
}

function runReleaseInit({ workspaceRoot, contentRoot, options }) {
  const allTags = getVersionTags(workspaceRoot);
  const ignorePrerelease = getIgnorePrerelease(contentRoot, options.ignorePrerelease);
  const selectedTags = ignorePrerelease ? allTags.filter((tag) => !isPrereleaseVersion(tag)) : allTags;
  const contentPaths = getReleaseContentPaths(contentRoot);

  const ascendingEntries = [];
  for (let index = 0; index < selectedTags.length; index += 1) {
    const tag = selectedTags[index];
    const previousTag = index > 0 ? selectedTags[index - 1] : null;
    const entry = buildEntryFromTag({
      workspaceRoot,
      tag,
      previousTag,
      contentPaths,
      summaryOverride: null,
    });
    ascendingEntries.push(entry);
  }

  const releases = ascendingEntries.reverse();
  const catalog = createEmptyCatalog();
  catalog.releases = releases;
  catalog.current = releases.length > 0 ? releases[0].version : null;

  const filePath = writeCatalog(contentRoot, catalog);
  const out = {
    command: 'kb release init',
    written: filePath,
    current: catalog.current,
    releases: catalog.releases.length,
    ignore_prerelease: ignorePrerelease,
    content_paths: contentPaths,
  };

  if (options.json) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.log('kb release init: PASS');
  console.log(`  written          : ${filePath}`);
  console.log(`  releases         : ${catalog.releases.length}`);
  console.log(`  current          : ${catalog.current || 'none'}`);
  console.log(`  ignore-prerelease: ${ignorePrerelease ? 'yes' : 'no'}`);
}

function runReleaseTag({ workspaceRoot, contentRoot, options }) {
  const existing = readCatalog(contentRoot);
  if (!existing) {
    throw new Error('catalog.json not found. Run "kb release init" first.');
  }

  const contentPaths = getReleaseContentPaths(contentRoot);
  const previous = existing.current
    ? existing.releases.find((item) => item.version === existing.current)
    : null;

  const entry = buildEntryFromTag({
    workspaceRoot,
    tag: options.version,
    previousTag: previous ? previous.git_tag : null,
    contentPaths,
    summaryOverride: options.summary,
  });

  appendReleaseEntry(contentRoot, entry, { setCurrent: true });

  const out = {
    command: 'kb release tag',
    version: entry.version,
    current: entry.version,
    prerelease: entry.prerelease,
  };

  if (options.json) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.log(`kb release tag: added ${entry.version}`);
  console.log(`  current   : ${entry.version}`);
  console.log(`  prerelease: ${entry.prerelease ? 'yes' : 'no'}`);
}

function runReleaseList({ contentRoot, options }) {
  const catalog = readCatalog(contentRoot);
  if (!catalog) {
    throw new Error('catalog.json not found. Run "kb release init" first.');
  }

  const items = catalog.releases.map((item) => ({
    version: item.version,
    released_at: item.released_at,
    prerelease: item.prerelease,
    current: item.version === catalog.current,
  }));

  if (options.json) {
    console.log(JSON.stringify({ command: 'kb release list', current: catalog.current, releases: items }, null, 2));
    return;
  }

  console.log(`kb release list: ${items.length} release(s)`);
  for (const item of items) {
    const marker = item.current ? '*' : ' ';
    const pre = item.prerelease ? ' (prerelease)' : '';
    console.log(`  ${marker} ${item.version}  ${item.released_at}${pre}`);
  }
}

function runReleaseShow({ contentRoot, options }) {
  const catalog = readCatalog(contentRoot);
  if (!catalog) {
    throw new Error('catalog.json not found. Run "kb release init" first.');
  }

  const entry = catalog.releases.find((item) => item.version === options.version);
  if (!entry) {
    throw new Error(`Release not found in catalog: ${options.version}`);
  }

  if (options.json) {
    console.log(JSON.stringify({ command: 'kb release show', current: catalog.current, release: entry }, null, 2));
    return;
  }

  console.log(`kb release show: ${entry.version}`);
  console.log(`  current         : ${catalog.current === entry.version ? 'yes' : 'no'}`);
  console.log(`  released_at     : ${entry.released_at}`);
  console.log(`  git_tag         : ${entry.git_tag}`);
  console.log(`  git_commit      : ${entry.git_commit}`);
  console.log(`  template_version: ${entry.template_version}`);
  console.log(`  prerelease      : ${entry.prerelease ? 'yes' : 'no'}`);
  console.log(`  summary         : ${entry.summary}`);
  console.log(`  stats           : intents=${entry.stats.intents_applied}, docs=${entry.stats.docs_changed}, commits=${entry.stats.ad_hoc_commits}`);
}

function runRelease({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const ctx = resolveExistingState({ workspaceRoot });

  if (options.sub === 'init') {
    runReleaseInit({ workspaceRoot, contentRoot: ctx.contentRoot, options });
    return;
  }
  if (options.sub === 'tag') {
    runReleaseTag({ workspaceRoot, contentRoot: ctx.contentRoot, options });
    return;
  }
  if (options.sub === 'list') {
    runReleaseList({ contentRoot: ctx.contentRoot, options });
    return;
  }
  if (options.sub === 'show') {
    runReleaseShow({ contentRoot: ctx.contentRoot, options });
    return;
  }

  throw new Error(`Unsupported release subcommand: ${options.sub}`);
}

module.exports = {
  buildEntryFromTag,
  getIgnorePrerelease,
  getReleaseContentPaths,
  isPrereleaseVersion,
  parseArgs,
  runRelease,
};
