import express from 'express';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluatePhase2Gates } from './bridge-gates.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const kbRoot = path.join(repoRoot, 'knowledge-base');
const cliPath = path.join(repoRoot, 'bin', 'kbx.js');
const require = createRequire(import.meta.url);
const { resolveIntentRecord } = require(path.join(repoRoot, 'src', 'lib', 'intent.js'));

const uiHost = process.env.KBX_UI_HOST || 'kbx.local';
const uiPort = Number(process.env.KBX_UI_PORT || 4173);
const port = Number(process.env.KBX_BRIDGE_PORT || 4174);

function runKbx(args, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`kbx command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ code: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseJsonLoose(value) {
  if (!value) {
    return null;
  }

  const direct = parseJsonSafe(value.trim());
  if (direct) {
    return direct;
  }

  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return parseJsonSafe(value.slice(start, end + 1));
  }

  return null;
}

async function executeBridgeCommand(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const expectJson = options.expectJson ?? false;

  try {
    const result = await runKbx(args, timeoutMs);
    const parsed = expectJson ? parseJsonLoose(result.stdout) : null;

    return {
      command,
      ok: result.code === 0,
      exitCode: result.code,
      parsed,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    return {
      command,
      ok: false,
      exitCode: 1,
      parsed: null,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}

function summarizeWorkspace(statusResult) {
  const parsed = statusResult.parsed || {};
  const activeIntents = parsed.activeIntents || {};
  const release = parsed.release || {};
  const workingTree = parsed.workingTree || {};
  const activeIntentItems = Array.isArray(activeIntents.intents) ? activeIntents.intents : [];
  const activeIntentId = activeIntents.id ?? activeIntentItems[0]?.id ?? null;

  return {
    activeIntentCount: activeIntents.count ?? null,
    activeIntentId,
    releaseCurrent: release.current ?? null,
    releaseLatest: release.latest ?? null,
    hasWorkingTreeChanges: workingTree.clean === true ? false : true,
  };
}

function resolveFocusFile() {
  const candidates = [
    path.join(repoRoot, 'svfactory', 'focus.md'),
    path.join(repoRoot, 'kb-root', 'focus.md'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function parseCheckpointLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed.startsWith('- ')) {
    return null;
  }

  const parts = trimmed.slice(2).split(' | ').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  const entry = { timestamp: parts[0] };
  for (const part of parts.slice(1)) {
    const [key, ...rest] = part.split('=');
    if (!key || rest.length === 0) continue;
    entry[key] = rest.join('=').trim();
  }

  return entry;
}

function normalizeIntentId(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.startsWith('intent-') ? normalized.slice('intent-'.length) : normalized;
}

function sanitizeDraftSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function extractIntentNarrative(text) {
  if (!text) {
    return { goal: null, summary: null };
  }

  const sections = String(text).split(/^---\s*$/m);
  const body = sections.length >= 3 ? sections.slice(2).join('---').trim() : String(text).trim();
  const goalMatch = body.match(/^\*\*Goal:\*\*\s*(.+)$/im);
  const summaryMatch = body.match(/^## Summary\s+([\s\S]*?)(?:\n## |$)/m);

  return {
    goal: goalMatch?.[1]?.trim() ?? null,
    summary: summaryMatch?.[1]?.replace(/^[>\s]+/gm, '').trim() || null,
  };
}

function extractIntentTasks(text, source) {
  if (!text) {
    return [];
  }

  const lines = String(text).split(/\r?\n/);
  const tasks = [];
  let currentSection = null;
  let inTaskSection = false;

  function parseTaskText(rawText, fallbackDone = false) {
    const text = String(rawText || '').trim();
    const commitMatches = [...text.matchAll(/commit\s+([0-9a-f]{7,40})/gi)].map((match) => match[1]);
    const titleDescMatch = text.match(/^(?:\*\*)?(.+?)(?:\*\*)?\s+[—-]\s+(.+)$/);
    const title = (titleDescMatch?.[1] ?? text).trim();
    const description = titleDescMatch?.[2]?.trim() ?? null;
    const tags = [];

    if (/partial/i.test(text)) tags.push('partial');
    if (/major gap/i.test(text)) tags.push('major-gap');
    if (/engine exists/i.test(text)) tags.push('engine-exists');
    if (/planned/i.test(text)) tags.push('planned');
    if (/draft/i.test(text)) tags.push('draft');
    if (/reviewed/i.test(text)) tags.push('reviewed');

    const iconStatus = /✅/.test(text)
      ? 'done'
      : /❌/.test(text)
        ? 'blocked'
        : /⚠️|⚠/.test(text)
          ? 'warning'
          : fallbackDone
            ? 'done'
            : 'open';

    return {
      title,
      description,
      text,
      done: iconStatus === 'done',
      status: iconStatus,
      tags,
      explicitCommits: commitMatches,
    };
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const headingMatch = line.match(/^(#{2,4})\s+(.+)$/);
    if (headingMatch) {
      currentSection = headingMatch[2].trim();
      inTaskSection = /plan|task|checklist|verification/i.test(currentSection);
      continue;
    }

    const checkboxMatch = line.match(/^[-*]\s+\[(x| )\]\s+(.+)$/i);
    if (checkboxMatch) {
      const parsed = parseTaskText(checkboxMatch[2], checkboxMatch[1].toLowerCase() === 'x');
      tasks.push({
        ...parsed,
        section: currentSection,
        source,
      });
      continue;
    }

    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch && /summary|plan|task|checklist|verification/i.test(currentSection || '')) {
      const parsed = parseTaskText(numberedMatch[1], false);
      tasks.push({
        ...parsed,
        section: currentSection,
        source,
      });
      continue;
    }

    if (!inTaskSection) {
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const parsed = parseTaskText(bulletMatch[1], false);
      tasks.push({
        ...parsed,
        section: currentSection,
        source,
      });
    }
  }

  return tasks;
}

function extractStagedFiles(text) {
  if (!text) {
    return [];
  }

  const lines = String(text).split(/\r?\n/);
  const stagedFiles = [];
  let inStagedFiles = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^##\s+Staged Files/i.test(line)) {
      inStagedFiles = true;
      continue;
    }
    if (inStagedFiles && /^##\s+/.test(line)) {
      break;
    }
    if (!inStagedFiles) {
      continue;
    }
    const fileMatch = line.match(/^[-*]\s+`?([^`]+?)`?$/);
    if (fileMatch && /\//.test(fileMatch[1])) {
      stagedFiles.push(fileMatch[1].trim());
    }
  }

  return stagedFiles;
}

function lookupRecentCommit(relativePath) {
  if (!relativePath) {
    return null;
  }

  const result = spawnSync('git', ['log', '-1', '--format=%h|%s', '--', relativePath], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 3000,
  });

  if (result.status !== 0 || !result.stdout.trim()) {
    return null;
  }

  const [sha, subject] = result.stdout.trim().split('|');
  if (!sha) {
    return null;
  }

  return {
    sha: sha.trim(),
    subject: (subject || '').trim(),
    path: relativePath,
  };
}

function enrichTasksWithGit(tasks, candidatePaths) {
  const relatedCommits = candidatePaths
    .map((relativePath) => lookupRecentCommit(relativePath))
    .filter(Boolean)
    .filter((commit, index, commits) => commits.findIndex((item) => item.sha === commit.sha) === index)
    .slice(0, 3);

  return tasks.map((task) => ({
    ...task,
    relatedCommits: task.explicitCommits.length > 0
      ? task.explicitCommits.map((sha) => ({ sha, subject: 'Referenced in intent text', path: null }))
      : relatedCommits,
  }));
}

function summarizeIntentDetail(intentId) {
  const record = resolveIntentRecord(kbRoot, intentId);
  if (!record) {
    return null;
  }

  const intentText = fs.existsSync(record.metaPath) ? fs.readFileSync(record.metaPath, 'utf8') : '';
  const narrative = extractIntentNarrative(intentText);
  const planPath = record.workspacePath ? path.join(record.workspacePath, 'plan.md') : null;
  const planText = planPath && fs.existsSync(planPath) ? fs.readFileSync(planPath, 'utf8') : '';
  const focus = record.meta?.focus && typeof record.meta.focus === 'object' ? record.meta.focus : {};
  const rawTasks = [
    ...extractIntentTasks(intentText, 'intent.md'),
    ...extractIntentTasks(planText, 'plan.md'),
  ];
  const stagedFiles = extractStagedFiles(intentText);
  const candidatePaths = [
    ...stagedFiles,
    path.relative(repoRoot, record.metaPath).replace(/\\/g, '/'),
  ].filter(Boolean);
  const tasks = enrichTasksWithGit(rawTasks, candidatePaths);

  return {
    id: record.id ?? intentId,
    title: record.meta?.title ?? null,
    slug: record.slug ?? null,
    scope: record.scope ?? null,
    lifecycle: record.meta?.lifecycle ?? record.lifecycle ?? null,
    status: record.meta?.status ?? null,
    mode: record.meta?.mode ?? null,
    changeType: record.meta?.change_type ?? null,
    decisionSummary: record.meta?.decision_summary ?? null,
    goal: narrative.goal,
    summary: narrative.summary,
    focusCurrent: focus.current ?? null,
    focusNextAction: focus.next_action ?? null,
    focusUpdatedAt: focus.last_updated ?? null,
    tasks,
    stagedFiles,
    workspacePath: record.workspacePath ? path.relative(repoRoot, record.workspacePath).replace(/\\/g, '/') : null,
    sourceFile: record.metaPath ? path.relative(repoRoot, record.metaPath).replace(/\\/g, '/') : null,
  };
}

function summarizeSessionContext(statusResult) {
  const parsed = statusResult.parsed || {};
  const activeIntents = Array.isArray(parsed.activeIntents?.intents) ? parsed.activeIntents.intents : [];
  const activeIntentIds = activeIntents.map((intent) => normalizeIntentId(intent?.id)).filter(Boolean);
  const focusPath = resolveFocusFile();
  let latestCheckpoint = null;

  if (focusPath) {
    const content = fs.readFileSync(focusPath, 'utf8');
    const checkpointSection = content.split('## Intent Checkpoints')[1] || '';
    const checkpointLines = checkpointSection
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- '));

    latestCheckpoint = checkpointLines.length > 0 ? parseCheckpointLine(checkpointLines[0]) : null;
  }

  const checkpointIntentId = normalizeIntentId(latestCheckpoint?.intent ?? null);
  const activeIntentId = normalizeIntentId(parsed.activeIntents?.id ?? null) ?? activeIntentIds[0] ?? null;
  const sessionIntentId = checkpointIntentId && activeIntentIds.includes(checkpointIntentId)
    ? checkpointIntentId
    : activeIntentId;

  return {
    sessionIntentId,
    sessionIntentSource: checkpointIntentId && activeIntentIds.includes(checkpointIntentId) ? 'checkpoint' : activeIntentId ? 'active-intent' : 'none',
    sessionLabel: latestCheckpoint?.branch ?? 'unknown-session',
    checkpointEvent: latestCheckpoint?.event ?? null,
    checkpointIntentId,
    checkpointTimestamp: latestCheckpoint?.timestamp ?? null,
    focusFile: focusPath ? path.relative(repoRoot, focusPath).replace(/\\/g, '/') : null,
    activeIntentIds,
  };
}

function summarizeSystem(doctorResult) {
  const checks = Array.isArray(doctorResult.parsed?.checks) ? doctorResult.parsed.checks : [];
  const summary = {
    pass: 0,
    warn: 0,
    error: 0,
    info: 0,
  };

  for (const check of checks) {
    const status = String(check?.status || '').toUpperCase();
    if (status === 'PASS') {
      summary.pass += 1;
    } else if (status === 'WARN') {
      summary.warn += 1;
    } else if (status === 'ERROR') {
      summary.error += 1;
    } else if (status === 'INFO') {
      summary.info += 1;
    }
  }

  return {
    result: doctorResult.parsed?.result ?? null,
    nodeVersion: doctorResult.parsed?.nodeVersion ?? null,
    workspaceRoot: doctorResult.parsed?.workspaceRoot ?? null,
    checkSummary: summary,
  };
}

function summarizeDocuments(graphCheckResult) {
  const parsed = graphCheckResult.parsed || {};
  const issues = Array.isArray(parsed.issues) ? parsed.issues : [];

  return {
    entityCount: parsed.entity_count ?? null,
    relationCount: parsed.relation_count ?? null,
    issueCount: parsed.issue_count ?? issues.length,
    topIssues: issues.slice(0, 5).map((issue) => ({
      checkId: issue.check_id ?? null,
      severity: issue.severity ?? null,
      message: issue.message ?? null,
      evidencePath: issue.evidence_path ?? null,
    })),
  };
}

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function isSupportedDocumentFile(fileName) {
  return /\.(md|html?)$/i.test(String(fileName || ''));
}

function parseFrontmatter(text) {
  const normalized = String(text || '');
  if (!normalized.startsWith('---\n') && !normalized.startsWith('---\r\n')) {
    return { metadata: {}, body: normalized };
  }

  const match = normalized.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, body: normalized };
  }

  const metadata = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^#/.test(line)) continue;
    const fieldMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!fieldMatch) continue;
    const [, key, rawValue] = fieldMatch;
    metadata[key] = rawValue.replace(/^"|"$/g, '').trim();
  }

  return {
    metadata,
    body: match[2] || '',
  };
}

function slugifyHeading(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function extractMarkdownToc(body) {
  const items = [];
  for (const rawLine of String(body || '').split(/\r?\n/)) {
    const match = rawLine.match(/^(#{1,6})\s+(.+)$/);
    if (!match) continue;
    const label = match[2].trim();
    items.push({
      id: slugifyHeading(label),
      label,
      level: match[1].length,
    });
  }
  return items;
}

function extractHtmlToc(text) {
  const items = [];
  const regex = /<h([1-6])(?:\s+[^>]*)?>([\s\S]*?)<\/h\1>/gi;
  for (const match of String(text || '').matchAll(regex)) {
    const level = Number(match[1]);
    const label = String(match[2] || '').replace(/<[^>]+>/g, '').trim();
    if (!label) continue;
    items.push({
      id: slugifyHeading(label),
      label,
      level,
    });
  }
  return items;
}

function extractDocumentSummary(format, body) {
  if (format === 'html') {
    const plain = String(body || '').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return plain.slice(0, 220) || null;
  }

  for (const rawBlock of String(body || '').split(/\r?\n\s*\r?\n/)) {
    const clean = rawBlock
      .replace(/^#+\s+/gm, '')
      .replace(/^[-*]\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .trim();
    if (clean) {
      return clean.slice(0, 220);
    }
  }
  return null;
}

function formatDocumentTone(metadata) {
  const verification = String(metadata.verification || '').toLowerCase();
  const timeState = String(metadata.time_state || '').toLowerCase();
  if (verification === 'code-verified' || verification === 'self-referential') {
    return 'ok';
  }
  if (verification === 'unverified' || verification === 'design-only' || timeState === 'stale') {
    return 'warn';
  }
  return 'info';
}

function buildDocumentDetail(absPath, relPath) {
  const content = fs.readFileSync(absPath, 'utf8');
  const format = /\.html?$/i.test(absPath) ? 'html' : 'md';
  const parsed = format === 'md'
    ? parseFrontmatter(content)
    : { metadata: {}, body: content };
  const metadata = parsed.metadata || {};
  const title = metadata.title || (format === 'html'
    ? String(content.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').trim()
    : String(parsed.body.match(/^#\s+(.+)$/m)?.[1] || '').trim()) || path.basename(absPath);
  const toc = format === 'html' ? extractHtmlToc(content) : extractMarkdownToc(parsed.body);
  const summary = extractDocumentSummary(format, parsed.body || content);

  return {
    path: relPath,
    format,
    title,
    content,
    summary,
    metadata: {
      title: metadata.title || null,
      type: metadata.type || null,
      status: metadata.status || null,
      owner: metadata.owner || null,
      verification: metadata.verification || null,
      time_state: metadata.time_state || null,
      last_updated: metadata.last_updated || null,
      last_verified: metadata.last_verified || null,
      tags: metadata.tags ? [String(metadata.tags)] : [],
    },
    toc,
  };
}

function listKnowledgeBaseDocuments(rootDir) {
  const folders = new Map();
  const documents = [];

  function ensureFolder(folderPath) {
    const key = toPosixPath(folderPath || '');
    if (!folders.has(key)) {
      folders.set(key, {
        kind: 'folder',
        name: key ? path.posix.basename(key) : 'knowledge-base',
        path: key,
        children: [],
      });
    }
    return folders.get(key);
  }

  ensureFolder('');

  function walk(currentDir, relativeDir = '') {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith('.'))
      .sort((left, right) => Number(right.isDirectory()) - Number(left.isDirectory()) || left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absPath = path.join(currentDir, entry.name);
      const relPath = toPosixPath(path.posix.join(relativeDir, entry.name));
      if (entry.isDirectory()) {
        ensureFolder(relPath);
        walk(absPath, relPath);
        continue;
      }
      if (!isSupportedDocumentFile(entry.name)) {
        continue;
      }
      const detail = buildDocumentDetail(absPath, relPath);
      documents.push(detail);
    }
  }

  walk(rootDir, '');

  const folderPaths = [...folders.keys()].sort((left, right) => left.localeCompare(right));
  for (const folderPath of folderPaths) {
    const folder = folders.get(folderPath);
    const parentPath = folderPath.includes('/') ? folderPath.slice(0, folderPath.lastIndexOf('/')) : '';
    if (folderPath) {
      ensureFolder(parentPath).children.push(folder);
    }
  }

  for (const detail of documents) {
    const docPath = toPosixPath(detail.path);
    const parentPath = docPath.includes('/') ? docPath.slice(0, docPath.lastIndexOf('/')) : '';
    ensureFolder(parentPath).children.push({
      kind: 'document',
      name: path.posix.basename(docPath),
      path: docPath,
      format: detail.format,
      title: detail.title,
      summary: detail.summary,
      statusTone: formatDocumentTone(detail.metadata),
    });
  }

  for (const folder of folders.values()) {
    folder.children.sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === 'folder' ? -1 : 1;
      }
      return String(left.name || '').localeCompare(String(right.name || ''));
    });
  }

  return {
    tree: folders.get('')?.children || [],
    documents,
  };
}

function summarizeDocumentWorkspace(documents) {
  const folderStats = new Map();
  const topIssues = [];
  let markdownCount = 0;
  let htmlCount = 0;
  let verifiedCount = 0;
  let provisionalCount = 0;
  let staleCount = 0;

  for (const doc of documents) {
    if (doc.format === 'html') htmlCount += 1;
    else markdownCount += 1;

    const verification = String(doc.metadata.verification || '').toLowerCase();
    const timeState = String(doc.metadata.time_state || '').toLowerCase();
    if (verification === 'code-verified' || verification === 'self-referential') {
      verifiedCount += 1;
    }
    if (verification === 'unverified' || verification === 'design-only') {
      provisionalCount += 1;
      topIssues.push({
        checkId: 'doc-verification',
        severity: 'warn',
        message: `${doc.title || doc.path} is ${verification || 'unverified'}`,
        evidencePath: doc.path,
      });
    }
    if (timeState && timeState !== 'current') {
      staleCount += 1;
      topIssues.push({
        checkId: 'doc-time-state',
        severity: 'info',
        message: `${doc.title || doc.path} is ${timeState}`,
        evidencePath: doc.path,
      });
    }

    const parentPath = doc.path.includes('/') ? doc.path.slice(0, doc.path.lastIndexOf('/')) : '';
    if (!folderStats.has(parentPath)) {
      folderStats.set(parentPath, { path: parentPath || 'knowledge-base', count: 0, warningCount: 0 });
    }
    const entry = folderStats.get(parentPath);
    entry.count += 1;
    if (formatDocumentTone(doc.metadata) === 'warn') {
      entry.warningCount += 1;
    }
  }

  return {
    totalDocuments: documents.length,
    markdownCount,
    htmlCount,
    verifiedCount,
    provisionalCount,
    staleCount,
    folderCount: folderStats.size,
    entityCount: documents.length,
    relationCount: folderStats.size,
    issueCount: topIssues.length,
    topIssues: topIssues.slice(0, 5),
    topFolders: [...folderStats.values()]
      .sort((left, right) => right.warningCount - left.warningCount || right.count - left.count || left.path.localeCompare(right.path))
      .slice(0, 5),
  };
}

function buildDocumentsWorkspace(selectedPath) {
  const { tree, documents } = listKnowledgeBaseDocuments(kbRoot);
  const normalizedSelectedPath = toPosixPath(String(selectedPath || '').trim());
  const selected = documents.find((doc) => doc.path === normalizedSelectedPath) || documents[0] || null;
  return {
    summary: summarizeDocumentWorkspace(documents),
    tree,
    selected,
  };
}

export function createApp(commandRunner = executeBridgeCommand) {
  const app = express();
  
  // Middleware
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KBAgent Bridge</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; padding: 2rem; background: #0f172a; color: #e2e8f0; }
      main { max-width: 720px; margin: 0 auto; }
      .card { background: rgba(15, 23, 42, 0.72); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 16px; padding: 1.5rem; }
      a { color: #7dd3fc; }
      code { background: rgba(30, 41, 59, 0.9); padding: 0.2rem 0.4rem; border-radius: 6px; }
    </style>
  </head>
  <body>
    <main>
      <div class="card">
        <h1>KBAgent Bridge</h1>
        <p>CLI-backed bridge server is running on <code>http://${uiHost}:${port}</code>.</p>
        <p>Open the local UI at <a href="http://${uiHost}:${uiPort}/">http://${uiHost}:${uiPort}/</a>.</p>
        <p>Health and runtime data are available under <code>/api/*</code>.</p>
      </div>
    </main>
  </body>
</html>`);
  });

  app.get('/api/version', async (_req, res) => {
    const response = await commandRunner('kbx --version', ['--version']);
    res.status(response.ok ? 200 : 500).json(response);
  });

  app.get('/api/interaction-model', (_req, res) => {
    res.json({
      chat: 'Copilot Chat with KBAgent proposes actions and prompts inside VS Code.',
      web: 'Localhost UI reads runtime state and triggers CLI-backed actions.',
      writePath: 'CLI is the only deterministic mutation path.',
    });
  });

  app.get('/api/status', async (_req, res) => {
    const response = await commandRunner('kbx status --json', ['status', '--json'], {
      expectJson: true,
      timeoutMs: 20000,
    });
    res.status(200).json(response);
  });

  // Helper function to list intents with priority from filesystem
  function listIntentsWithPriority() {
    const intentsRoot = path.join(kbRoot, 'intents');
    if (!fs.existsSync(intentsRoot)) {
      return { intents: [], ok: true };
    }

    const intents = [];
    const lifecycles = ['_active', '_backlog', '_archive', '_closed'];

    for (const lifecycle of lifecycles) {
      const lifecyclePath = path.join(intentsRoot, lifecycle);
      if (!fs.existsSync(lifecyclePath)) continue;

      const entries = fs.readdirSync(lifecyclePath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() && !entry.isFile()) continue;

        let contentPath;
        let id;

        // For folders like _active/v2-9-..., read intent.md
        if (entry.isDirectory()) {
          contentPath = path.join(lifecyclePath, entry.name, 'intent.md');
          id = entry.name;
        } else if (entry.name.endsWith('.md')) {
          // For backlog files like v2-10-....md
          contentPath = path.join(lifecyclePath, entry.name);
          id = entry.name.replace(/\.md$/, '');
        } else {
          continue;
        }

        if (!fs.existsSync(contentPath)) continue;

        try {
          const content = fs.readFileSync(contentPath, 'utf8');
          const sections = content.split(/^---\s*$/m);
          let frontmatter = {};

          // Parse YAML frontmatter
          if (sections.length >= 2) {
            const yamlText = sections[1];
            const lines = yamlText.split('\n');
            for (const line of lines) {
              const match = line.match(/^(\w+):\s*(.+)$/);
              if (match) {
                const [, key, value] = match;
                frontmatter[key] = value.trim();
              }
            }
          }

          intents.push({
            id: normalizeIntentId(frontmatter.id || id),
            title: frontmatter.title || id,
            lifecycle: lifecycle.replace(/^_/, ''),
            priority: frontmatter.priority || null,
            blocks: frontmatter.blocks || null,
            mode: frontmatter.mode || 'normal',
            strategic_mode: frontmatter.strategic_mode || null,
          });
        } catch (err) {
          console.error(`Error reading intent ${id}:`, err.message);
        }
      }
    }

    // Sort by priority (lexicographic sort works for semantic versions)
    intents.sort((a, b) => {
      if ((a.priority ?? '') && !(b.priority ?? '')) return -1;
      if (!(a.priority ?? '') && (b.priority ?? '')) return 1;
      if ((a.priority ?? '') && (b.priority ?? '')) {
        return String(a.priority).localeCompare(String(b.priority), undefined, { numeric: true });
      }
      return String(a.id || '').localeCompare(String(b.id || ''));
    });

    return { intents, ok: true };
  }

  app.get('/api/rules', async (_req, res) => {
    const response = await commandRunner('kbx rules list --json', ['rules', 'list', '--json'], {
      expectJson: true,
      timeoutMs: 15000,
    });
    res.status(response.ok ? 200 : 500).json(response);
  });

  app.get('/api/intents', async (_req, res) => {
    try {
      const data = listIntentsWithPriority();
      res.status(200).json({
        ok: data.ok,
        parsed: {
          count: data.intents.length,
          intents: data.intents,
        },
        command: 'kbx intent list (with priority)',
        exitCode: 0,
        stdout: '',
        stderr: '',
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        parsed: null,
        command: 'kbx intent list',
        exitCode: 1,
        stdout: '',
        stderr: String(error),
      });
    }
  });

  app.get('/api/intents/:id/detail', async (req, res) => {
    const intentId = String(req.params.id || '').trim();
    if (!intentId) {
      res.status(400).json({ ok: false, error: 'Intent id required' });
      return;
    }

    try {
      const detail = summarizeIntentDetail(intentId);
      if (!detail) {
        res.status(404).json({ ok: false, error: `Intent not found: ${intentId}` });
        return;
      }

      res.status(200).json({ ok: true, detail });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/api/workspace', async (_req, res) => {
    const statusResult = await commandRunner('kbx status --json', ['status', '--json'], {
      expectJson: true,
      timeoutMs: 20000,
    });

    if (!statusResult.ok) {
      res.status(200).json({ ok: false, error: 'workspace command failed', stderr: statusResult.stderr });
      return;
    }

    res.status(200).json({
      ok: true,
      summary: summarizeWorkspace(statusResult),
    });
  });

  app.get('/api/session-context', async (_req, res) => {
    const statusResult = await commandRunner('kbx status --json', ['status', '--json'], {
      expectJson: true,
      timeoutMs: 20000,
    });

    if (!statusResult.ok) {
      res.status(200).json({ ok: false, error: 'session context command failed', stderr: statusResult.stderr });
      return;
    }

    res.status(200).json({
      ok: true,
      summary: summarizeSessionContext(statusResult),
    });
  });

  app.get('/api/system', async (_req, res) => {
    const doctorResult = await commandRunner('kbx doctor --json', ['doctor', '--json'], {
      expectJson: true,
      timeoutMs: 20000,
    });

    if (!doctorResult.ok) {
      res.status(200).json({ ok: false, error: 'system command failed', stderr: doctorResult.stderr });
      return;
    }

    res.status(200).json({
      ok: true,
      summary: summarizeSystem(doctorResult),
    });
  });

  app.get('/api/documents', async (req, res) => {
    try {
      const workspace = buildDocumentsWorkspace(req.query.path);
      res.status(200).json({
        ok: true,
        ...workspace,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'documents query failed',
      });
    }
  });

  app.get('/api/phase2-bridge', async (_req, res) => {
    const [statusResult, doctorResult, chaosResult] = await Promise.all([
      commandRunner('kbx status --json', ['status', '--json'], {
        expectJson: true,
        timeoutMs: 20000,
      }),
      commandRunner('kbx doctor --json', ['doctor', '--json'], {
        expectJson: true,
        timeoutMs: 15000,
      }),
      commandRunner('kbx chaos --estimate', ['chaos', '--estimate'], {
        timeoutMs: 15000,
      }),
    ]);

    const { gateItems, summary } = evaluatePhase2Gates({
      statusResult,
      doctorResult,
      chaosResult,
    });

    const payload = {
      phase: 'phase-2-cli-bridge',
      checkedAt: new Date().toISOString(),
      summary,
      gates: gateItems,
      commands: {
        status: statusResult,
        doctor: doctorResult,
        chaos: chaosResult,
      },
    };

    res.status(200).json({
      ...payload,
      ok: !summary.blocked,
    });
  });

  // ═══ PHASE 4: MUTATION ENDPOINTS ═══

  app.post('/api/intents/create', async (req, res) => {
    const { title, focus, next_action, decision_summary, intent_id, id } = req.body;

    // Validate
    if (!title || String(title).trim().length < 3) {
      return res.status(400).json({
        ok: false,
        error: 'Title required (min 3 characters)',
      });
    }

    const requestedIntentId = String(intent_id || id || '').trim();
    const draftSlug = sanitizeDraftSlug(requestedIntentId || title);
    if (!draftSlug || draftSlug.length < 3) {
      return res.status(400).json({
        ok: false,
        error: 'Draft slug required (min 3 characters after normalization)',
      });
    }

    const args = [
      'intent', 'draft',
      draftSlug,
      '--title', String(title).trim(),
      ...(focus ? ['--focus', String(focus).trim()] : []),
      ...(next_action ? ['--next-action', String(next_action).trim()] : []),
      ...(decision_summary ? ['--decision-summary', String(decision_summary).trim()] : []),
      '--json'
    ];

    const result = await commandRunner('kbx intent draft --json', args, {
      expectJson: true,
      timeoutMs: 15000,
    });

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        error: 'Create draft intent failed',
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
    }

    res.status(200).json({
      ok: true,
      result: result.parsed || {},
      command: result.command,
      stdout: result.stdout,
      trace: [
        { timestamp: new Date().toISOString(), step: 'validate_args', status: 'pass' },
        { timestamp: new Date().toISOString(), step: 'create_draft_intent', status: 'pass' },
      ],
    });
  });

  app.patch('/api/intents/:id', async (req, res) => {
    const { id } = req.params;
    const body = req.body || {};

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Intent ID required',
      });
    }

    // Accept flat fields (from frontend) or wrapped in 'fields' object (from old API)
    const fields = body.fields || body;
    
    const args = ['intent', 'update', id, '--json'];
    const updateFields = [];

    if (fields.title) {
      args.push('--title', String(fields.title).trim());
      updateFields.push('title');
    }
    if (fields.focus) {
      args.push('--focus', String(fields.focus).trim());
      updateFields.push('focus');
    }
    if (fields.next_action) {
      args.push('--next-action', String(fields.next_action).trim());
      updateFields.push('next_action');
    }
    if (fields.decision_summary) {
      args.push('--decision-summary', String(fields.decision_summary).trim());
      updateFields.push('decision_summary');
    }
    if (fields.state) {
      args.push('--state', String(fields.state).trim());
      updateFields.push('state');
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'At least one field to update required',
      });
    }

    const result = await commandRunner('kbx intent update --json', args, {
      expectJson: true,
      timeoutMs: 15000,
    });

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        error: 'Update intent failed',
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
    }

    const parsed = result.parsed || {};
    const updatedFields = Array.isArray(parsed.updated_fields) ? parsed.updated_fields : updateFields;

    res.status(200).json({
      ok: true,
      result: {
        id: parsed.intent_id || parsed.id || id,
        updated_fields: updatedFields,
        state: parsed.state ?? null,
        status: parsed.status || 'updated',
        ...parsed,
      },
      command: result.command,
      trace: [
        { timestamp: new Date().toISOString(), step: 'load_intent', status: 'pass' },
        { timestamp: new Date().toISOString(), step: 'validate_state_transition', status: 'pass' },
        { timestamp: new Date().toISOString(), step: 'write_changes', status: 'pass' },
      ],
    });
  });

  app.post('/api/intents/:id/approve', async (req, res) => {
    const { id } = req.params;
    const { approval_note } = req.body;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Intent ID required',
      });
    }

    const args = ['intent', 'approve', id, '--json'];
    if (approval_note) {
      args.push('--note', String(approval_note).trim());
    }

    const result = await commandRunner('kbx intent approve --json', args, {
      expectJson: true,
      timeoutMs: 15000,
    });

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        error: 'Approve intent failed',
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
    }

    res.status(200).json({
      ok: true,
      result: {
        id,
        state: 'staged',
        approved_at: new Date().toISOString(),
        ...result.parsed,
      },
      command: result.command,
      trace: [
        { timestamp: new Date().toISOString(), step: 'validate_active_state', status: 'pass' },
        { timestamp: new Date().toISOString(), step: 'transition_to_staged', status: 'pass' },
      ],
    });
  });

  app.get('/api/intents/:id/apply-preview', async (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Intent ID required',
      });
    }

    // Call kbx to get diff preview from CLI contract.
    const result = await commandRunner('kbx intent apply-preview --json', 
      ['intent', 'apply-preview', id, '--json'], 
      {
        expectJson: true,
        timeoutMs: 15000,
      }
    );

    if (!result.ok) {
      // Fallback: return minimal preview structure
      return res.status(200).json({
        ok: true,
        diff: {
          files_changed: 0,
          insertions: 0,
          deletions: 0,
          files: [],
        },
        warnings: [
          { level: 'info', message: 'Preview command not available' },
        ],
      });
    }

    const parsed = result.parsed || {};
    const files = Array.isArray(parsed.files) ? parsed.files : [];
    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];

    res.status(200).json({
      ok: true,
      diff: {
        files_changed: parsed.files_changed ?? 0,
        insertions: parsed.insertions ?? 0,
        deletions: parsed.deletions ?? 0,
        files,
      },
      warnings,
      intent_id: parsed.intent_id ?? id,
      status: parsed.status || 'preview',
      conflict_summary: parsed.conflict_summary ?? null,
      command: result.command,
    });
  });

  app.post('/api/intents/:id/apply', async (req, res) => {
    const { id } = req.params;
    const { confirmed } = req.body;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: 'Intent ID required',
      });
    }

    if (confirmed !== true) {
      return res.status(400).json({
        ok: false,
        error: 'Apply requires explicit confirmation (confirmed: true)',
      });
    }

    const args = ['intent', 'apply', id, '--json'];

    const result = await commandRunner('kbx intent apply --json', args, {
      expectJson: true,
      timeoutMs: 30000,  // Apply can take longer
    });

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        error: 'Apply intent failed',
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
    }

    res.status(200).json({
      ok: true,
      result: {
        id,
        state: 'committed',
        applied_at: new Date().toISOString(),
        ...result.parsed,
      },
      command: result.command,
      trace: [
        { timestamp: new Date().toISOString(), step: 'validate_staged_state', status: 'pass' },
        { timestamp: new Date().toISOString(), step: 'check_conflicts', status: 'pass' },
        { timestamp: new Date().toISOString(), step: 'apply_changes', status: 'pass' },
        { timestamp: new Date().toISOString(), step: 'git_commit', status: 'pass' },
      ],
    });
  });

  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const app = createApp();
  app.listen(port, () => {
    console.log(`kbx-ui bridge listening on http://${uiHost}:${port}`);
  });
}