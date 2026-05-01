'use strict';

const fs = require('fs');

const GROUP_ORDER = [
  'features',
  'fixes',
  'docs',
  'refactors',
  'tests',
  'performance',
  'chores',
  'misc',
];

const GROUP_LABELS = {
  features: 'Features',
  fixes: 'Fixes',
  docs: 'Docs',
  refactors: 'Refactors',
  tests: 'Tests',
  performance: 'Performance',
  chores: 'Chore',
  misc: 'Misc',
};

function parseListOutput(raw) {
  if (!raw) return [];
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function normalizePrefix(prefix) {
  const p = String(prefix || '').replace(/\\/g, '/').trim();
  if (!p) return '';
  return p.endsWith('/') ? p : `${p}/`;
}

function parseConventionalCommit(subject) {
  const s = String(subject || '').trim();
  const match = /^([a-zA-Z][a-zA-Z0-9-]*)(\(([^)]+)\))?(!)?:\s+(.+)$/.exec(s);
  if (!match) {
    return {
      isConventional: false,
      type: null,
      scope: null,
      breaking: false,
      description: s,
      group: 'misc',
    };
  }

  const rawType = match[1].toLowerCase();
  const group = mapTypeToGroup(rawType);

  return {
    isConventional: true,
    type: rawType,
    scope: match[3] || null,
    breaking: Boolean(match[4]),
    description: match[5],
    group,
  };
}

function mapTypeToGroup(type) {
  if (type === 'feat' || type === 'feature') return 'features';
  if (type === 'fix') return 'fixes';
  if (type === 'docs' || type === 'doc') return 'docs';
  if (type === 'refactor') return 'refactors';
  if (type === 'test' || type === 'tests') return 'tests';
  if (type === 'perf' || type === 'performance') return 'performance';
  if (type === 'chore' || type === 'build' || type === 'ci') return 'chores';
  return 'misc';
}

function parseCommitLine(line) {
  const parts = String(line || '').split('\t');
  if (parts.length < 3) {
    return null;
  }
  const sha = parts[0].trim();
  const subject = parts[1].trim();
  const date = parts[2].trim();
  if (!sha || !subject || !date) return null;

  const parsed = parseConventionalCommit(subject);
  return {
    sha,
    shortSha: sha.slice(0, 7),
    subject,
    date,
    ...parsed,
  };
}

function runGitOrThrow(runGit, command, errContext) {
  const out = runGit(command);
  if (out === null) {
    throw new Error(errContext);
  }
  return out;
}

function collectCommits({ runGit, fromTag, toTag }) {
  const range = `${fromTag}..${toTag}`;
  const raw = runGitOrThrow(
    runGit,
    `git log --reverse --format=%H%x09%s%x09%cs ${range}`,
    `Failed to read commits for range ${range}`
  );

  const commits = parseListOutput(raw)
    .map(parseCommitLine)
    .filter(Boolean);

  return commits;
}

function collectFilesForCommit({ runGit, sha }) {
  const raw = runGitOrThrow(
    runGit,
    `git diff-tree --no-commit-id --name-only -r ${sha}`,
    `Failed to collect files for commit ${sha}`
  );
  return parseListOutput(raw).map((file) => file.replace(/\\/g, '/'));
}

function collectRangeFiles({ runGit, fromTag, toTag }) {
  const range = `${fromTag}..${toTag}`;
  const raw = runGitOrThrow(
    runGit,
    `git diff --name-only ${range}`,
    `Failed to read changed files for range ${range}`
  );
  return parseListOutput(raw).map((file) => file.replace(/\\/g, '/'));
}

function getTagDate({ runGit, tag }) {
  const tagDate = runGit(`git for-each-ref refs/tags/${tag} --format=%(taggerdate:short)`);
  if (tagDate) return tagDate.trim();

  const commitDate = runGit(`git show -s --format=%cs ${tag}`);
  if (commitDate) return commitDate.trim();

  return new Date().toISOString().slice(0, 10);
}

function bucketCommits(commits) {
  const grouped = {};
  for (const key of GROUP_ORDER) grouped[key] = [];

  for (const commit of commits) {
    const key = grouped[commit.group] ? commit.group : 'misc';
    grouped[key].push(commit);
  }

  return grouped;
}

function generateHighlights({ totalCommits, groupCounts, summary }) {
  if (summary && summary.trim()) {
    return [summary.trim()];
  }

  const active = GROUP_ORDER
    .map((key) => ({ key, count: groupCounts[key] || 0 }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((item) => `${GROUP_LABELS[item.key].toLowerCase()} (${item.count})`);

  if (active.length === 0) {
    return ['No KB-scoped commits were detected for this release range.'];
  }

  return [
    `This release contains ${totalCommits} commit(s) touching KB content, with primary categories: ${active.join(', ')}.`,
  ];
}

function buildMarkdown(data) {
  const lines = [];

  lines.push(`# Release ${data.version} - ${data.releasedAt}`);
  lines.push('');
  lines.push(`**Previous release:** ${data.fromTag}`);
  lines.push(`**Range:** ${data.fromTag}..${data.toTag} (${data.toCommitShort})`);
  lines.push('');
  lines.push('## Highlights');
  lines.push('');
  for (const line of data.highlights) {
    lines.push(line.startsWith('- ') ? line : `- ${line}`);
  }
  lines.push('');
  lines.push('## Changes');
  lines.push('');

  let hasAnyChanges = false;
  for (const key of GROUP_ORDER) {
    const commits = data.grouped[key] || [];
    if (commits.length === 0) continue;
    hasAnyChanges = true;

    lines.push(`### ${GROUP_LABELS[key]}`);
    lines.push('');
    for (const commit of commits) {
      const typeLabel = commit.type
        ? `${commit.type}${commit.scope ? `(${commit.scope})` : ''}${commit.breaking ? '!' : ''}`
        : 'misc';
      lines.push(`- **${typeLabel}:** ${commit.description} (${commit.shortSha})`);
    }
    lines.push('');
  }

  if (!hasAnyChanges) {
    lines.push('- No commits found in this range.');
    lines.push('');
  }

  lines.push('## Stats');
  lines.push('');
  lines.push(`- Commits in range: ${data.stats.commitsInRange}`);
  lines.push(`- Commits touching content paths: ${data.stats.contentCommits}`);
  lines.push(`- Docs changed (filtered by content paths): ${data.stats.docsChanged}`);
  lines.push(`- Files changed (all paths): ${data.stats.filesChanged}`);
  lines.push('');
  lines.push('## Files');
  lines.push('');
  if (data.files.length === 0) {
    lines.push('- None');
  } else {
    for (const file of data.files) {
      lines.push(`- ${file}`);
    }
  }
  lines.push('');
  lines.push('## Migration');
  lines.push('');
  lines.push('- None declared. Review grouped changes above and add migration steps if downstream KBs depend on altered behavior.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('<!-- intents_applied: [] (v2.0 will populate) -->');

  return `${lines.join('\n')}\n`;
}

function buildReleaseNotes({
  workspaceRoot,
  fromTag,
  toTag,
  version,
  summary,
  contentPaths,
  runGit,
}) {
  if (!fromTag || !toTag) {
    throw new Error('buildReleaseNotes requires both fromTag and toTag');
  }

  const run = typeof runGit === 'function'
    ? runGit
    : (command) => {
      const { execSync } = require('child_process');
      try {
        return execSync(command, {
          cwd: workspaceRoot,
          stdio: ['ignore', 'pipe', 'ignore'],
          encoding: 'utf8',
        }).trim();
      } catch {
        return null;
      }
    };

  const normalizedPaths = (Array.isArray(contentPaths) ? contentPaths : [])
    .map(normalizePrefix)
    .filter(Boolean);

  const commits = collectCommits({ runGit: run, fromTag, toTag });

  const commitsWithFiles = commits.map((commit) => ({
    ...commit,
    files: collectFilesForCommit({ runGit: run, sha: commit.sha }),
  }));

  const contentCommits = normalizedPaths.length === 0
    ? commitsWithFiles
    : commitsWithFiles.filter((commit) => commit.files.some((file) => normalizedPaths.some((p) => file.startsWith(p))));

  const grouped = bucketCommits(contentCommits);
  const groupCounts = {};
  for (const key of GROUP_ORDER) {
    groupCounts[key] = grouped[key].length;
  }

  const rangeFiles = collectRangeFiles({ runGit: run, fromTag, toTag });
  const docsChanged = normalizedPaths.length === 0
    ? new Set(rangeFiles).size
    : new Set(rangeFiles.filter((file) => normalizedPaths.some((p) => file.startsWith(p)))).size;

  const toCommit = runGitOrThrow(run, `git rev-list -n 1 ${toTag}`, `Failed to resolve commit for tag ${toTag}`);
  const releasedAt = getTagDate({ runGit: run, tag: toTag });

  const data = {
    version: version || toTag,
    fromTag,
    toTag,
    toCommitShort: toCommit.slice(0, 7),
    releasedAt,
    highlights: generateHighlights({
      totalCommits: contentCommits.length,
      groupCounts,
      summary,
    }),
    grouped,
    stats: {
      commitsInRange: commits.length,
      contentCommits: contentCommits.length,
      docsChanged,
      filesChanged: new Set(rangeFiles).size,
    },
    files: rangeFiles,
    contentPaths: normalizedPaths,
    commits: contentCommits,
  };

  return {
    markdown: buildMarkdown(data),
    json: data,
  };
}

function writeReleaseNotesOutput({ outputPath, format, markdown, json }) {
  if (!outputPath) {
    return null;
  }
  const body = format === 'json' ? `${JSON.stringify(json, null, 2)}\n` : markdown;
  fs.writeFileSync(outputPath, body, 'utf8');
  return outputPath;
}

module.exports = {
  GROUP_LABELS,
  GROUP_ORDER,
  buildReleaseNotes,
  parseConventionalCommit,
  writeReleaseNotesOutput,
};
