const fs = require('fs');
const path = require('path');

/**
 * Detect KB artifacts in a workspace and classify the install state.
 *
 * Returns an object with boolean flags for each artifact and a single
 * `classification` field that is one of:
 *   - 'fresh'   : no KB artifacts at all -> safe to `kb init`
 *   - 'healthy' : state file present (valid JSON with schemaVersion)
 *   - 'partial' : state file missing or invalid, but other KB artifacts
 *                 still exist -> do NOT auto-init; user must troubleshoot
 */
function detectKbArtifacts(workspaceRoot) {
  const root = path.resolve(workspaceRoot);

  const trackedState = path.join(root, 'knowledge-base', '.kb', 'state.json');
  const privateState = path.join(root, '.git', 'project-kb', 'state.json');
  const kbDir = path.join(root, 'knowledge-base');
  const privateKbDir = path.join(root, '.git', 'project-kb');
  const agentFile = path.join(root, '.github', 'agents', 'kb.agent.md');
  const planPrompt = path.join(root, '.github', 'prompts', 'kb-plan.prompt.md');
  const runPrompt = path.join(root, '.github', 'prompts', 'kb-run.prompt.md');
  const agentsMd = path.join(root, 'AGENTS.md');

  let stateValid = false;
  let stateRawExists = false;
  let chosenStatePath = null;
  for (const candidate of [trackedState, privateState]) {
    if (fs.existsSync(candidate)) {
      stateRawExists = true;
      chosenStatePath = candidate;
      try {
        const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
        if (parsed && typeof parsed === 'object' && parsed.schemaVersion != null) {
          stateValid = true;
        }
      } catch {
        stateValid = false;
      }
      break;
    }
  }

  const kbDirExists = fs.existsSync(kbDir) || fs.existsSync(privateKbDir);
  const agentExists = fs.existsSync(agentFile);
  const promptExists = fs.existsSync(planPrompt) || fs.existsSync(runPrompt);
  const agentsMdExists = fs.existsSync(agentsMd);

  const otherArtifacts = kbDirExists || agentExists || promptExists || agentsMdExists;

  let classification;
  if (stateValid) {
    classification = 'healthy';
  } else if (otherArtifacts || stateRawExists) {
    classification = 'partial';
  } else {
    classification = 'fresh';
  }

  return {
    workspaceRoot: root,
    classification,
    stateFile: stateValid,
    stateFileRawExists: stateRawExists,
    stateFilePath: chosenStatePath,
    kbDir: kbDirExists,
    agentFile: agentExists,
    promptFile: promptExists,
    agentsMd: agentsMdExists,
  };
}

module.exports = {
  detectKbArtifacts,
};
