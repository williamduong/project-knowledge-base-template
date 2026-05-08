const fs = require('fs');
const path = require('path');

const KB_AGENT_REF_PATH = '.github/agents/kbx.agent.md';

const IDE_TARGETS = [
  {
    ide: 'vscode-copilot',
    file: '.github/copilot-instructions.md',
    detectMarkers: ['.github/copilot-instructions.md', '.vscode'],
    envHints: ['TERM_PROGRAM=vscode', 'VSCODE_PORTABLE'],
  },
  {
    ide: 'cursor',
    file: '.cursorrules',
    detectMarkers: ['.cursor', '.cursorrules'],
    envHints: ['CURSOR_READY=true', 'CURSOR_WORKSPACE'],
  },
  {
    ide: 'claude',
    file: 'CLAUDE.md',
    detectMarkers: ['CLAUDE.md'],
    envHints: [],
  },
  {
    ide: 'generic',
    file: 'AGENTS.md',
    detectMarkers: ['AGENTS.md'],
    envHints: [],
  },
];

function exists(workspaceRoot, rel) {
  return fs.existsSync(path.join(workspaceRoot, rel));
}

function envMatches(envHints) {
  for (const hint of envHints) {
    if (hint.includes('=')) {
      const [k, v] = hint.split('=');
      if (process.env[k] === v) return true;
    } else if (process.env[hint]) {
      return true;
    }
  }
  return false;
}

/**
 * Detect IDE integration targets present in the workspace.
 * Returns one entry per known IDE with detection signal.
 *
 * @param {Object} opts
 * @param {string} opts.workspaceRoot
 * @returns {Array<{ ide: string, file: string, detected: boolean, fileExists: boolean }>}
 */
function detectIdeTargets({ workspaceRoot }) {
  return IDE_TARGETS.map((t) => {
    const markerHit = t.detectMarkers.some((m) => exists(workspaceRoot, m));
    const envHit = envMatches(t.envHints);
    return {
      ide: t.ide,
      file: t.file,
      detected: markerHit || envHit,
      fileExists: exists(workspaceRoot, t.file),
    };
  });
}

/**
 * Choose targets to inject KB-MANAGED block into.
 * A target is selected if either marker hit or env hit is positive.
 * Generic AGENTS.md is always included as fallback if nothing else detected.
 */
function selectInjectionTargets({ workspaceRoot }) {
  const all = detectIdeTargets({ workspaceRoot });
  const detected = all.filter((t) => t.detected);
  if (detected.length > 0) return detected;
  // Fallback to generic
  return all.filter((t) => t.ide === 'generic');
}

module.exports = {
  detectIdeTargets,
  selectInjectionTargets,
  KB_AGENT_REF_PATH,
  IDE_TARGETS,
};
