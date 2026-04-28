const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const changelogPath = path.join(repoRoot, "template", "TEMPLATE_CHANGELOG.md");

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const currentDate = getLocalDateString();

function parseArgs(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }

    const key = token.slice(2);
    const nextToken = argv[index + 1];
    if (!nextToken || nextToken.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = nextToken;
    index += 1;
  }

  return args;
}

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8"
    }).trim();
  } catch {
    return null;
  }
}

function requireArg(args, name) {
  const value = args[name];
  if (!value || value === true) {
    throw new Error(`Missing required argument --${name}`);
  }

  return value;
}

function readChangelog() {
  return fs.readFileSync(changelogPath, "utf8");
}

function updateFrontmatterDate(content, fieldName, value) {
  const pattern = new RegExp(`(^${fieldName}:\\s*)(.+)$`, "m");
  return content.replace(pattern, `$1${value}`);
}

function findLastGeneratedHead(content) {
  const matches = [
    ...content.matchAll(/<!--\s*release-meta:\s*from=(initial-history|[0-9a-f]{7,40})\s+to=([0-9a-f]{7,40})\s+generated_at=([^\s]+)\s*-->/gi)
  ];

  if (matches.length === 0) {
    return null;
  }

  return matches[0][2].trim();
}

function getLatestTag() {
  return runGit(["describe", "--tags", "--abbrev=0"]);
}

function getHead() {
  return runGit(["rev-parse", "HEAD"]);
}

function getCommitLines(fromRevision, toRevision) {
  if (!fromRevision) {
    const output = runGit(["log", "--reverse", "--format=%H%x09%s%x09%cs", "HEAD"]);
    return output ? output.split(/\r?\n/).filter(Boolean) : [];
  }

  const output = runGit(["log", "--reverse", "--format=%H%x09%s%x09%cs", `${fromRevision}..${toRevision}`]);
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function getChangedFiles(fromRevision, toRevision) {
  if (!fromRevision) {
    const output = runGit(["log", "--format=", "--name-only", "HEAD"]);
    return output
      ? Array.from(new Set(output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))).sort()
      : [];
  }

  const output = runGit(["diff", "--name-only", `${fromRevision}..${toRevision}`]);
  return output ? output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : [];
}

function summarizeSubject(subject) {
  return subject
    .replace(/^[a-z]+(\([^)]+\))?!?:\s*/i, "")
    .replace(/^./, (character) => character.toUpperCase());
}

function buildSummary(commits) {
  return commits.slice(0, 6).map((commit) => `- ${summarizeSubject(commit.subject)}.`);
}

function buildCommitList(commits) {
  return commits.map((commit) => `- ${commit.shortSha} ${commit.subject} (${commit.date})`);
}

function buildFileList(files) {
  return files.map((filePath) => `- ${filePath}`);
}

function parseCommits(lines) {
  return lines.map((line) => {
    const [sha, subject, date] = line.split("\t");
    return {
      sha,
      shortSha: sha.slice(0, 7),
      subject,
      date
    };
  });
}

function buildEntry({
  version,
  date,
  changeType,
  impact,
  migration,
  migrationNote,
  fromRevision,
  toRevision,
  commits,
  changedFiles
}) {
  const summaryLines = buildSummary(commits);
  const migrationLines = migrationNote
    ? [`- Yes: see migration note at ${migrationNote}`]
    : migration === "No"
      ? ["- No"]
      : [`- ${migration}`];

  const gitRangeLine = fromRevision
    ? `- ${fromRevision}..${toRevision}`
    : `- initial-history..${toRevision}`;

  return [
    `## ${version} - ${date}`,
    "",
    `<!-- release-meta: from=${fromRevision || "initial-history"} to=${toRevision} generated_at=${new Date().toISOString()} -->`,
    "",
    "### Summary",
    "",
    ...(summaryLines.length > 0 ? summaryLines : ["- No commits found in the selected git range."]),
    "",
    "### Change Type",
    "",
    `- ${changeType}`,
    "",
    "### Impact On Existing KBs",
    "",
    `- ${impact}`,
    "",
    "### Migration Required",
    "",
    ...migrationLines,
    "",
    "### Agent Impact",
    "",
    "- Generated from git log for this release; review the commit-derived summary and refine wording if a higher-level narrative is needed.",
    "",
    "### Git Range Reviewed",
    "",
    gitRangeLine,
    "",
    "### Commits Included",
    "",
    ...buildCommitList(commits),
    "",
    "### Files Added / Changed",
    "",
    ...buildFileList(changedFiles),
    ""
  ].join("\n");
}

function insertEntry(content, entry) {
  const marker = "## Current Entries";
  const markerIndex = content.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error('Cannot find "## Current Entries" in TEMPLATE_CHANGELOG.md');
  }

  const insertionPoint = markerIndex + marker.length;
  return `${content.slice(0, insertionPoint)}\n\n${entry}${content.slice(insertionPoint)}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const version = args["template-version"] || args.version || args._[0];
  if (!version || version === true) {
    throw new Error("Missing required argument --template-version");
  }
  const changeType = args["change-type"] || args._[1] || "Patch";
  const impact = args.impact || args._[2] || "Low";
  const migrationNote = args["migration-note"];
  const migration = migrationNote ? "Yes" : (args.migration || "No");
  const date = args.date || currentDate;
  const dryRun = Boolean(args["dry-run"] || args._.includes("dry-run"));

  const content = readChangelog();
  const toRevision = args.to || getHead();
  const fromRevision = args.from || findLastGeneratedHead(content) || getLatestTag() || null;
  const commits = parseCommits(getCommitLines(fromRevision, toRevision));

  if (commits.length === 0) {
    throw new Error("No commits found in the selected git range. Refusing to create an empty release entry.");
  }

  const entry = buildEntry({
    version,
    date,
    changeType,
    impact,
    migration,
    migrationNote,
    fromRevision,
    toRevision,
    commits,
    changedFiles: getChangedFiles(fromRevision, toRevision)
  });

  if (dryRun) {
    process.stdout.write(`${entry}\n`);
    return;
  }

  const updatedContent = updateFrontmatterDate(
    updateFrontmatterDate(insertEntry(content, entry), "last_updated", date),
    "last_verified",
    date
  );

  fs.writeFileSync(changelogPath, updatedContent, "utf8");
  process.stdout.write(`Updated ${path.relative(repoRoot, changelogPath)} for ${version}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
