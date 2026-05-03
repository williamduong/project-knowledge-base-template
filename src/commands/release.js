'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
const { executePipeline, interpolateTemplate, pipelineFilePath, readPipeline } = require('../lib/pipeline');
const { deriveIntentsApplied } = require('../lib/intent');

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
    dryRun: false,
    yes: false,
    bump: null,
    target: null,
    file: null,
    template: null,
    withIntents: true,
  };

  const rest = [];
  for (let i = 0; i < (args || []).length; i += 1) {
    const arg = args[i];
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
    if (arg === '--with-intents') {
      options.withIntents = true;
      continue;
    }
    if (arg === '--no-intents') {
      options.withIntents = false;
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
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--yes') {
      options.yes = true;
      continue;
    }
    if (arg.startsWith('--bump=')) {
      options.bump = arg.slice('--bump='.length).trim().toLowerCase();
      continue;
    }
    if (arg.startsWith('--target=')) {
      options.target = arg.slice('--target='.length).trim().toLowerCase();
      continue;
    }
    if (arg.startsWith('--file=')) {
      options.file = arg.slice('--file='.length).trim();
      continue;
    }
    if (arg.startsWith('--template=')) {
      options.template = arg.slice('--template='.length).trim().toLowerCase();
      continue;
    }
    if (arg === '-f' || arg === '--file') {
      const next = (args || [])[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('kb release run/plan: --file requires a value');
      }
      options.file = String(next).trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--')) {
      throw new Error(
        `Unknown release option "${arg}". Supported: --json, --summary=..., --ignore-prerelease, --include-prerelease, --from=..., --output=..., --format=md|json, --dry-run, --yes, --bump=..., --target=..., --file=..., --template=...`
      );
    }
    rest.push(arg);
  }

  if (rest.length === 0) {
    throw new Error('kb release requires a subcommand: init | tag | list | show | notes | run | plan | init-pipeline');
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

  if (options.sub === 'run' || options.sub === 'plan') {
    if (rest.length > 1) {
      throw new Error(`kb release ${options.sub} takes no positional arguments`);
    }

    if (options.bump && !['patch', 'minor', 'major'].includes(options.bump)) {
      throw new Error('kb release run/plan: --bump must be patch, minor, or major');
    }
    if (options.target && !['npm', 'gh', 'all'].includes(options.target)) {
      throw new Error('kb release run/plan: --target must be npm, gh, or all');
    }

    if (options.sub === 'plan') {
      options.dryRun = true;
    }

    return options;
  }

  if (options.sub === 'init-pipeline') {
    if (rest.length > 1) {
      throw new Error('kb release init-pipeline takes no positional arguments');
    }

    options.template = options.template || 'npm-package';
    if (!['npm-package', 'docs-only', 'custom'].includes(options.template)) {
      throw new Error('kb release init-pipeline: --template must be npm-package, docs-only, or custom');
    }

    return options;
  }

  throw new Error(`kb release: unknown subcommand "${options.sub}". Supported: init | tag | list | show | notes | run | plan | init-pipeline`);
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

function buildEntryFromTag({ workspaceRoot, tag, previousTag, contentPaths, summaryOverride, contentRoot, previousReleasedAt }) {
  const fullCommit = runGitCommand(`git rev-list -n 1 ${tag}`, workspaceRoot);
  if (!fullCommit) {
    throw new Error(`Tag not found or unreachable: ${tag}`);
  }

  const rangeSpec = previousTag ? `${previousTag}..${tag}` : null;
  const releasedAt = getReleaseDate(workspaceRoot, tag);
  const prerelease = isPrereleaseVersion(tag);
  const summary = summaryOverride || getTagSummary(workspaceRoot, tag);

  // Derive intents applied since the previous release boundary (§6.2 release ledger)
  const intentsApplied = contentRoot
    ? deriveIntentsApplied(contentRoot, previousReleasedAt || null)
    : [];

  return {
    version: tag,
    released_at: releasedAt,
    git_tag: tag,
    git_commit: fullCommit.slice(0, 7),
    template_version: tag,
    summary,
    prerelease,
    stats: {
      intents_applied: intentsApplied.length,
      docs_changed: getDocsChangedCount(workspaceRoot, rangeSpec, contentPaths),
      ad_hoc_commits: getCommitCount(workspaceRoot, rangeSpec),
    },
    intents_applied: intentsApplied,
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
    contentRoot,
    previousReleasedAt: previous ? previous.released_at : null,
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

function releaseTemplatePath(repoRoot, templateName) {
  return path.join(repoRoot, 'template', '16-release-pipelines', `${templateName}.yaml`);
}

function runReleaseInitPipeline({ contentRoot, options }) {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const templateName = options.template || 'npm-package';
  const sourcePath = releaseTemplatePath(repoRoot, templateName);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Pipeline template not found: ${templateName}`);
  }

  const targetPath = pipelineFilePath(contentRoot);
  const existed = fs.existsSync(targetPath);
  if (existed && !options.yes) {
    throw new Error(
      `Pipeline already exists at ${targetPath}. Re-run with --yes to overwrite or use --file with kb release run/plan.`
    );
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);

  const out = {
    command: 'kb release init-pipeline',
    template: templateName,
    source: sourcePath,
    written: targetPath,
    overwritten: existed,
  };

  if (options.json) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  console.log('kb release init-pipeline: PASS');
  console.log(`  template : ${templateName}`);
  console.log(`  written  : ${targetPath}`);
}

function resolveKbEntryPathForPrecheck() {
  const fromArgv = process.argv[1];
  if (fromArgv && fs.existsSync(fromArgv)) {
    return fromArgv;
  }
  return path.resolve(__dirname, '..', '..', 'bin', 'kb.js');
}

function runReleasePrecheck({ workspaceRoot, processRunner = spawnSync }) {
  const kbEntryPath = resolveKbEntryPathForPrecheck();
  const result = processRunner(process.execPath, [kbEntryPath, 'status', '--quiet'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
  });

  if (result && result.error) {
    throw new Error(`Release pre-check failed to execute "kb status --quiet": ${result.error.message}`);
  }

  const exitCode = result && typeof result.status === 'number' ? result.status : 1;
  const statusLabel = String((result && result.stdout) || '').trim() || 'blocked';
  if (exitCode !== 0) {
    throw new Error(
      `Release blocked by status pre-check (${statusLabel}). Resolve workspace state before running release pipeline.`
    );
  }

  return {
    exitCode,
    status: statusLabel,
  };
}

function normalizeReleaseVersionCandidate(value) {
  if (value === null || value === undefined) return null;
  const firstToken = String(value).trim().split(/\s+/)[0] || '';
  if (!firstToken) return null;

  if (/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(firstToken)) {
    return firstToken;
  }
  if (/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(firstToken)) {
    return `v${firstToken}`;
  }
  return null;
}

function getRuntimeReleaseVersion(runtime) {
  if (!runtime || !runtime.outputs || typeof runtime.outputs !== 'object') {
    return null;
  }

  const bumpStep = runtime.outputs['bump-version'];
  if (bumpStep && typeof bumpStep === 'object') {
    const explicit = normalizeReleaseVersionCandidate(bumpStep.version);
    if (explicit) return explicit;

    const fromStdout = normalizeReleaseVersionCandidate(bumpStep.stdout);
    if (fromStdout) return fromStdout;
  }

  for (const value of Object.values(runtime.outputs)) {
    if (!value || typeof value !== 'object') continue;

    const explicit = normalizeReleaseVersionCandidate(value.version);
    if (explicit) return explicit;

    const fromStdout = normalizeReleaseVersionCandidate(value.stdout);
    if (fromStdout) return fromStdout;
  }

  return null;
}

function buildAutoCatalogSummary({ version, inputs }) {
  const parts = [`Auto pipeline release ${version}`];
  if (inputs && inputs.bump) parts.push(`bump=${inputs.bump}`);
  if (inputs && inputs.target) parts.push(`target=${inputs.target}`);
  return parts.join(' | ');
}

function upsertCatalogReleaseFromTag({ workspaceRoot, contentRoot, version, summary }) {
  const existing = readCatalog(contentRoot);
  if (!existing) {
    throw new Error('catalog.json not found. Run "kb release init" first.');
  }

  const alreadyExists = (existing.releases || []).some((item) => item.version === version);
  if (alreadyExists) {
    return {
      updated: false,
      version,
      reason: 'already-exists',
      summary: null,
    };
  }

  const contentPaths = getReleaseContentPaths(contentRoot);
  const previous = existing.current
    ? existing.releases.find((item) => item.version === existing.current)
    : null;

  const entry = buildEntryFromTag({
    workspaceRoot,
    tag: version,
    previousTag: previous ? previous.git_tag : null,
    contentPaths,
    summaryOverride: summary,
  });

  appendReleaseEntry(contentRoot, entry, { setCurrent: true });

  return {
    updated: true,
    version: entry.version,
    reason: null,
    summary: entry.summary,
  };
}

function runReleasePosthookCatalogUpdate({
  workspaceRoot,
  contentRoot,
  runtime,
  inputs,
  upsertReleaseFn = upsertCatalogReleaseFromTag,
}) {
  const version = getRuntimeReleaseVersion(runtime);
  if (!version) {
    throw new Error(
      'Release post-hook: cannot resolve release version from pipeline outputs. Ensure bump-version outputs include version or stdout.'
    );
  }

  const summary = buildAutoCatalogSummary({ version, inputs });
  const result = upsertReleaseFn({ workspaceRoot, contentRoot, version, summary });
  return {
    ...result,
    hook: 'catalog-update',
  };
}

function resolvePipelineInputs(options) {
  return {
    bump: options.bump || 'patch',
    target: options.target || 'all',
    from_tag: options.from || '',
    dry_run: Boolean(options.dryRun),
  };
}

function resolvePipelinePathForRun({ workspaceRoot, contentRoot, options }) {
  if (options.file) {
    return path.resolve(workspaceRoot, options.file);
  }
  return pipelineFilePath(contentRoot);
}

function readYesNoFromStdin(promptText) {
  process.stdout.write(promptText);
  let text = '';
  const buf = Buffer.alloc(1);
  while (true) {
    const bytesRead = fs.readSync(0, buf, 0, 1, null);
    if (bytesRead === 0) break;
    const ch = buf.toString('utf8', 0, bytesRead);
    if (ch === '\n') break;
    if (ch !== '\r') text += ch;
  }
  return text.trim();
}

function createConfirmStepHandler(options) {
  if (options.yes) return null;
  return ({ step, command }) => {
    if (!process.stdin.isTTY) {
      throw new Error(`Non-interactive terminal for confirm step "${step.name}". Use --yes to bypass.`);
    }
    const answer = readYesNoFromStdin(
      `[confirm] ${step.name}\n  command: ${command}\n  Continue? [y/N]: `
    );
    return /^(y|yes)$/i.test(answer);
  };
}

function buildDryRunPreview(pipeline, inputs) {
  const steps = [];
  const outputs = {};

  for (const step of pipeline.steps) {
    let command = step.run;
    let interpolationError = null;
    try {
      command = interpolateTemplate(step.run, { inputs, outputs });
    } catch (err) {
      interpolationError = err.message;
    }

    const stepOutputs = {
      command,
      exit_code: 0,
      stdout: `<dry-run:${step.name}:stdout>`,
      stderr: '',
    };

    if (step.outputs && typeof step.outputs === 'object' && !Array.isArray(step.outputs)) {
      const mappingContext = {
        inputs,
        outputs: {
          ...outputs,
          [step.name]: stepOutputs,
        },
      };
      for (const [k, v] of Object.entries(step.outputs)) {
        if (typeof v === 'string') {
          try {
            stepOutputs[k] = interpolateTemplate(v, mappingContext);
          } catch {
            stepOutputs[k] = `<unresolved:${k}>`;
          }
        } else if (typeof v === 'number' || typeof v === 'boolean') {
          stepOutputs[k] = v;
        }
      }
    }

    outputs[step.name] = stepOutputs;
    steps.push({
      name: step.name,
      confirm: step.confirm === true,
      command,
      interpolation_error: interpolationError,
    });
  }

  return { steps, outputs };
}

function runReleasePipeline({ workspaceRoot, contentRoot, options }) {
  const filePath = resolvePipelinePathForRun({ workspaceRoot, contentRoot, options });
  const pipeline = readPipeline(contentRoot, { required: true, filePath });
  const inputs = resolvePipelineInputs(options);

  if (options.dryRun) {
    const preview = buildDryRunPreview(pipeline, inputs);
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            command: options.sub === 'plan' ? 'kb release plan' : 'kb release run --dry-run',
            pipeline: filePath,
            inputs,
            steps: preview.steps,
          },
          null,
          2
        )
      );
      return;
    }

    console.log(`kb release plan: ${preview.steps.length} step(s)`);
    console.log(`  pipeline: ${filePath}`);
    console.log(`  inputs  : bump=${inputs.bump}, target=${inputs.target}${inputs.from_tag ? `, from_tag=${inputs.from_tag}` : ''}`);
    preview.steps.forEach((step, idx) => {
      const confirmTag = step.confirm ? ' [confirm]' : '';
      console.log(`  ${idx + 1}. ${step.name}${confirmTag}`);
      console.log(`     ${step.command}`);
      if (step.interpolation_error) {
        console.log(`     interpolation: ${step.interpolation_error}`);
      }
    });
    return;
  }

  const precheck = runReleasePrecheck({ workspaceRoot });

  const runtime = executePipeline(pipeline, {
    cwd: workspaceRoot,
    inputs,
    yes: options.yes,
    confirmStep: createConfirmStepHandler(options),
  });

  const posthook = runReleasePosthookCatalogUpdate({
    workspaceRoot,
    contentRoot,
    runtime,
    inputs,
  });

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          command: 'kb release run',
          pipeline: filePath,
          precheck,
          posthook,
          inputs,
          steps: runtime.steps.map((step) => ({
            name: step.name,
            exit_code: step.outputs.exit_code,
          })),
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`kb release pre-check: ${precheck.status}`);
  if (posthook.updated) {
    console.log(`kb release post-hook: catalog updated (${posthook.version})`);
  } else {
    console.log(`kb release post-hook: catalog unchanged (${posthook.reason || 'no-op'})`);
  }
  console.log(`kb release run: PASS (${runtime.steps.length} step(s))`);
  for (const step of runtime.steps) {
    console.log(`  - ${step.name}: exit ${step.exitCode}`);
  }
}

function runRelease({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  let ctx = null;
  try {
    ctx = resolveExistingState({ workspaceRoot });
  } catch (err) {
    if (
      options.sub !== 'notes' &&
      options.sub !== 'run' &&
      options.sub !== 'plan' &&
      options.sub !== 'init-pipeline'
    ) {
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
  if (options.sub === 'run' || options.sub === 'plan') {
    runReleasePipeline({ workspaceRoot, contentRoot, options });
    return;
  }
  if (options.sub === 'init-pipeline') {
    runReleaseInitPipeline({ contentRoot, options });
    return;
  }

  throw new Error(`Unsupported release subcommand: ${options.sub}`);
}

module.exports = {
  buildEntryFromTag,
  getIgnorePrerelease,
  getReleaseContentPaths,
  isPrereleaseVersion,
  getRuntimeReleaseVersion,
  parseArgs,
  releaseTemplatePath,
  runReleasePosthookCatalogUpdate,
  runRelease,
  runReleaseInitPipeline,
  runReleasePrecheck,
  runReleasePipeline,
  normalizeReleaseVersionCandidate,
  upsertCatalogReleaseFromTag,
};
