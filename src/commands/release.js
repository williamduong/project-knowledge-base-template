'use strict';

const fs = require('fs');
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
const { buildReleaseNotes, writeReleaseNotesOutput } = require('../lib/release-notes');

function parseArgs(args) {
  const options = {
    json: false,
    sub: null,
    version: null,
    summary: null,
    ignorePrerelease: null,
    from: null,
    output: null,
    format: null,
  };

  const rest = [];
  for (const arg of args || []) {
    if (arg === '--') {
      continue;
    }
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
    if (arg.startsWith('--from=')) {
      options.from = arg.slice('--from='.length).trim();
      continue;
    }
    if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length).trim();
      continue;
    }
    if (arg.startsWith('--format=')) {
      options.format = arg.slice('--format='.length).trim().toLowerCase();
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(
        `Unknown release option "${arg}". Supported: --json, --summary=..., --ignore-prerelease, --include-prerelease, --from=..., --output=..., --format=md|json`
      );
    }
    rest.push(arg);
  }

  if (rest.length === 0) {
    throw new Error('kb release requires a subcommand: init | tag | list | show | notes');
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

  if (options.sub === 'notes') {
    if (rest.length !== 2) {
      throw new Error('kb release notes requires exactly 1 argument: <version>');
    }
    options.version = rest[1];
    if (!options.format) {
      options.format = options.json ? 'json' : 'md';
    }
    if (options.format !== 'md' && options.format !== 'json') {
      throw new Error('kb release notes: --format must be md or json');
    }
    return options;
  }

  throw new Error(`kb release: unknown subcommand "${options.sub}". Supported: init | tag | list | show | notes`);
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

function findPreviousTagFromCatalog(catalog, version) {
  if (!catalog || !Array.isArray(catalog.releases)) return null;
  const index = catalog.releases.findIndex((item) => item.version === version);
  if (index < 0) return null;
  const previous = catalog.releases[index + 1];
  return previous ? previous.git_tag : null;
}

function findPreviousTagFromGit(workspaceRoot, version) {
  const tags = getVersionTags(workspaceRoot);
  const index = tags.findIndex((tag) => tag === version);
  if (index <= 0) return null;
  return tags[index - 1];
}

function runReleaseNotes({ workspaceRoot, contentRoot, options }) {
  const catalog = readCatalog(contentRoot);
  let fromTag = options.from;
  if (!fromTag && catalog) {
    fromTag = findPreviousTagFromCatalog(catalog, options.version);
  }
  if (!fromTag) {
    fromTag = findPreviousTagFromGit(workspaceRoot, options.version);
  }
  if (!fromTag) {
    throw new Error(`kb release notes: cannot infer previous release for ${options.version}. Use --from=<tag>.`);
  }

  const contentPaths = getReleaseContentPaths(contentRoot);
  const releaseEntry = catalog && Array.isArray(catalog.releases)
    ? catalog.releases.find((item) => item.version === options.version)
    : null;

  const result = buildReleaseNotes({
    workspaceRoot,
    fromTag,
    toTag: options.version,
    version: options.version,
    summary: releaseEntry ? releaseEntry.summary : null,
    contentPaths,
    runGit: (command) => runGitCommand(command, workspaceRoot),
  });

  const resolvedOutputPath = options.output
    ? path.resolve(workspaceRoot, options.output)
    : null;

  if (resolvedOutputPath) {
    fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
    writeReleaseNotesOutput({
      outputPath: resolvedOutputPath,
      format: options.format,
      markdown: result.markdown,
      json: result.json,
    });
  }

  if (options.format === 'json' || options.json) {
    const payload = {
      command: 'kb release notes',
      from: fromTag,
      to: options.version,
      content_paths: contentPaths,
      output: resolvedOutputPath,
      notes: result.json,
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (resolvedOutputPath) {
    console.log(`kb release notes: wrote ${resolvedOutputPath}`);
    return;
  }
  process.stdout.write(result.markdown);
}

function runRelease({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  let ctx = null;
  try {
    ctx = resolveExistingState({ workspaceRoot });
  } catch (err) {
    if (options.sub !== 'notes') {
      throw err;
    }
  }

  const contentRoot = ctx ? ctx.contentRoot : workspaceRoot;

  if (options.sub === 'init') {
    runReleaseInit({ workspaceRoot, contentRoot, options });
    return;
  }
  if (options.sub === 'tag') {
    runReleaseTag({ workspaceRoot, contentRoot, options });
    return;
  }
  if (options.sub === 'list') {
    runReleaseList({ contentRoot, options });
    return;
  }
  if (options.sub === 'show') {
    runReleaseShow({ contentRoot, options });
    return;
  }
  if (options.sub === 'notes') {
    runReleaseNotes({ workspaceRoot, contentRoot, options });
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
