const fs = require('fs');
const path = require('path');

/**
 * Generates AI IDE adapter stub files in the workspace root.
 * Each adapter points agents to the KB so they pick it up automatically.
 * Files are only created if they do not already exist.
 *
 * Supported tools:
 *   - GitHub Copilot  → .github/copilot-instructions.md (already copied from template)
 *   - Generic / OpenAI Codex / Aider → AGENTS.md
 *   - Claude Code     → CLAUDE.md
 *   - Cursor          → .cursor/rules/kb.mdc
 *   - Windsurf        → .windsurfrules
 *   - Cline / Roo     → .clinerules
 */

function kbRelativePath(visibleMountPath, workspaceRoot) {
  // Produce a workspace-relative posix path to the KB mount (e.g. knowledge-base)
  const rel = path.relative(workspaceRoot, visibleMountPath).replace(/\\/g, '/');
  return rel;
}

function agentsMd(kbPath) {
  return `# AGENTS

This repository uses a structured Knowledge Base (KB) to provide AI agents with
architectural context, domain model, and governance rules.

## Mandatory read-order before any multi-file task

1. \`${kbPath}/INDEX.md\` — full KB scope map
2. \`${kbPath}/00-start-here/repository-revision-state.md\` — drift baseline check
3. \`${kbPath}/00-start-here/knowledge-base-architecture.md\` — trust and navigation rules
4. \`${kbPath}/12-ai-skills/agent-operating-manual.md\` — behavioral contract for agents

## Navigation shortcut

- Architecture intent → \`${kbPath}/03-architecture/\`
- Backend / API → \`${kbPath}/05-backend/\` and \`${kbPath}/06-api/\`
- Database schema → \`${kbPath}/07-database/\`
- Security rules → \`${kbPath}/08-security/\`
- Governance → \`${kbPath}/15-governance/\`

Do not create top-level folders outside the 16-tier hierarchy without user approval.
Do not upgrade \`verification\` fields without re-checking \`source_of_truth\`.
`;
}

function claudeMd(kbPath) {
  return `# CLAUDE

This repository uses a structured Knowledge Base (KB).

Before executing any task that touches more than one file or folder:

1. Read \`${kbPath}/00-start-here/repository-revision-state.md\` to check git baseline drift.
2. Read \`${kbPath}/12-ai-skills/agent-operating-manual.md\` for behavioral rules.
3. Navigate to the relevant tier folder before reading leaf documents.

Full instructions: \`${kbPath}/00-start-here/knowledge-base-architecture.md\`
`;
}

function cursorMdc(kbPath) {
  return `---
description: Project Knowledge Base — mandatory agent context
globs:
  - "**/*"
alwaysApply: true
---

# KB Agent Rules

Read these files before any multi-file task:

1. \`${kbPath}/INDEX.md\`
2. \`${kbPath}/00-start-here/repository-revision-state.md\`
3. \`${kbPath}/12-ai-skills/agent-operating-manual.md\`

Full architecture guide: \`${kbPath}/00-start-here/knowledge-base-architecture.md\`
`;
}

function windsurfRules(kbPath) {
  return `# Windsurf Rules

Before starting any task, read:
- \`${kbPath}/00-start-here/repository-revision-state.md\`
- \`${kbPath}/12-ai-skills/agent-operating-manual.md\`

Full KB: \`${kbPath}/INDEX.md\`
`;
}

function clineRules(kbPath) {
  return `# Cline Rules

Before starting any task, read:
- \`${kbPath}/00-start-here/repository-revision-state.md\`
- \`${kbPath}/12-ai-skills/agent-operating-manual.md\`

Full KB: \`${kbPath}/INDEX.md\`
`;
}

/**
 * Detect the active IDE/editor environment from env vars and workspace markers.
 * Priority: VS Code > Cursor > Claude > Windsurf > Cline > Other
 * Returns the detected IDE name or 'other' if none found.
 */
function detectIDE() {
  // Check environment variables
  if (process.env.TERM_PROGRAM === 'vscode' || process.env.VSCODE_PORTABLE) {
    return 'vscode';
  }

  if (process.env.CURSOR_READY === 'true' || process.env.CURSOR_WORKSPACE) {
    return 'cursor';
  }

  if (process.env.WINDSURF_WORKSPACE) {
    return 'windsurf';
  }

  if (process.env.CLINE_WORKSPACE) {
    return 'cline';
  }

  // Fallback: default to vscode (most common) but user can override with --adapter flag
  return 'vscode';
}

/**
 * @param {Object} opts
 * @param {string} opts.workspaceRoot
 * @param {string} opts.visibleMountPath
 * @param {string} [opts.ideOverride] — Force generation of specific IDE adapter (vscode|cursor|claude|windsurf|cline|all)
 * @returns {{ created: string[], skipped: string[], detectedIDE: string }}
 */
function generateAdapterFiles({ workspaceRoot, visibleMountPath, ideOverride }) {
  const kbPath = kbRelativePath(visibleMountPath, workspaceRoot);
  const created = [];
  const skipped = [];

  function writeIfMissing(relPath, content) {
    const fullPath = path.join(workspaceRoot, relPath);
    if (fs.existsSync(fullPath)) {
      skipped.push(relPath);
      return;
    }

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
    created.push(relPath);
  }

  const detectedIDE = ideOverride || detectIDE();

  // Generate only the relevant adapter(s)
  if (detectedIDE === 'all') {
    // Generate all adapters (for debugging/testing)
    writeIfMissing('AGENTS.md', agentsMd(kbPath));
    writeIfMissing('CLAUDE.md', claudeMd(kbPath));
    writeIfMissing('.cursor/rules/kb.mdc', cursorMdc(kbPath));
    writeIfMissing('.windsurfrules', windsurfRules(kbPath));
    writeIfMissing('.clinerules', clineRules(kbPath));
  } else if (detectedIDE === 'cursor') {
    writeIfMissing('.cursor/rules/kb.mdc', cursorMdc(kbPath));
  } else if (detectedIDE === 'windsurf') {
    writeIfMissing('.windsurfrules', windsurfRules(kbPath));
  } else if (detectedIDE === 'cline') {
    writeIfMissing('.clinerules', clineRules(kbPath));
  } else if (detectedIDE === 'claude') {
    writeIfMissing('CLAUDE.md', claudeMd(kbPath));
  } else {
    // Default: vscode or fallback to generic AGENTS.md
    writeIfMissing('AGENTS.md', agentsMd(kbPath));
  }

  return { created, skipped, detectedIDE };
}

module.exports = {
  generateAdapterFiles,
  detectIDE,
};
