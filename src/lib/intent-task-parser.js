'use strict';

function normalizeLifecycle(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'unknown';
  if (text === 'active') return 'active';
  if (text === 'backlog') return 'backlog';
  if (text === 'closed' || text === 'released') return 'closed';
  if (text === 'archive' || text === 'archived') return 'archived';
  if (text === 'draft') return 'draft';
  if (text === 'done' || text === 'completed') return 'done';
  if (text === 'open') return 'backlog';
  if (text === 'blocked') return 'blocked';
  return text.replace(/\s+/g, '-');
}

function deriveVersionBucket(intentId) {
  const match = String(intentId || '').match(/^(v\d+(?:-\d+)?)/i);
  return match?.[1]?.toLowerCase() ?? 'legacy';
}

function formatReleaseBucketLabel(bucketId) {
  if (bucketId === 'legacy') return 'Legacy';
  return bucketId.replace(/^v(\d+)-(\d+)$/i, 'v$1.$2').toUpperCase();
}

function extractIntentNarrative(text) {
  const summaryMatch = String(text || '').match(/##\s+Summary\s+([\s\S]*?)(?:\n##\s+|$)/i);
  const goalMatch = String(text || '').match(/^goal_text:\s*(.+)$/im);
  const goalSectionMatch = String(text || '').match(/(?:^|\n)Goal\s*[:\-]\s*(.+)$/im);
  return {
    goal: goalMatch?.[1]?.trim() ?? goalSectionMatch?.[1]?.trim() ?? null,
    summary: summaryMatch?.[1]?.replace(/^[>\s]+/gm, '').trim() || null,
  };
}

function extractStagedFiles(text) {
  if (!text) return [];

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

function extractIntentTasks(text, source) {
  if (!text) {
    return [];
  }

  const lines = String(text).split(/\r?\n/);
  const tasks = [];
  let currentSection = null;
  let inTaskSection = false;

  function isTaskLikeSection(sectionName) {
    return /plan|task|checklist|verification|implementation order|execution order/i.test(sectionName || '');
  }

  function isExcludedTaskSection(sectionName) {
    return /goal|acceptance criteria|stop when|files touched|intent split strategy|post-v/i.test(sectionName || '');
  }

  function parseTaskText(rawText, fallbackDone = false) {
    const text = String(rawText || '').trim();
    if (!text || /:\s*$/.test(text)) {
      return null;
    }

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
      inTaskSection = isTaskLikeSection(currentSection) && !isExcludedTaskSection(currentSection);
      continue;
    }

    const checkboxMatch = line.match(/^[-*]\s+\[(x| )\]\s+(.+)$/i);
    if (checkboxMatch && inTaskSection) {
      const parsed = parseTaskText(checkboxMatch[2], checkboxMatch[1].toLowerCase() === 'x');
      if (!parsed) continue;
      tasks.push({
        ...parsed,
        section: currentSection,
        source,
      });
      continue;
    }

    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch && inTaskSection) {
      const parsed = parseTaskText(numberedMatch[1], false);
      if (!parsed) continue;
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
      if (!parsed) continue;
      tasks.push({
        ...parsed,
        section: currentSection,
        source,
      });
    }
  }

  return tasks;
}

module.exports = {
  normalizeLifecycle,
  deriveVersionBucket,
  formatReleaseBucketLabel,
  extractIntentNarrative,
  extractStagedFiles,
  extractIntentTasks,
};
