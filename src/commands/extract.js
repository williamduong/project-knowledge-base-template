'use strict';

const fs = require('fs');
const path = require('path');
const { resolveExistingState } = require('../lib/context');
const { readSourceIndex, upsertEntry, refreshIndex } = require('../lib/source-index');
const { loadConfig, getConfigValue } = require('../lib/config');

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const options = {
    json: false,
    yes: false,
    sourcePath: null,
    targetDoc: null,
    applyFile: null,
    model: null,
    uncovered: false,
  };

  const rest = [];
  for (let i = 0; i < (args || []).length; i++) {
    const arg = args[i];
    if (arg === '--json') { options.json = true; continue; }
    if (arg === '--yes' || arg === '-y') { options.yes = true; continue; }
    if (arg === '--uncovered') { options.uncovered = true; continue; }
    if (arg === '--apply') {
      const nextArg = (args || [])[i + 1];
      if (!nextArg || nextArg.startsWith('--')) {
        throw new Error('kb extract --apply requires an output file path');
      }
      options.applyFile = nextArg.trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--apply=')) {
      options.applyFile = arg.slice('--apply='.length).trim();
      continue;
    }
    if (arg.startsWith('--target-doc=')) {
      options.targetDoc = arg.slice('--target-doc='.length).trim();
      continue;
    }
    if (arg.startsWith('--model=')) {
      options.model = arg.slice('--model='.length).trim();
      continue;
    }
    if (!arg.startsWith('--')) {
      rest.push(arg);
      continue;
    }
    throw new Error(`Unknown extract option "${arg}". Supported: --target-doc=<path>, --apply=<output-file>, --model=<hint>, --uncovered, --yes, --json`);
  }

  if (!options.uncovered && !options.applyFile && rest.length === 0) {
    throw new Error('kb extract requires a source file path or --uncovered flag');
  }

  if (options.applyFile && !options.targetDoc) {
    throw new Error('kb extract --apply requires --target-doc=<path>');
  }

  if (rest.length > 0) options.sourcePath = rest[0];

  return options;
}

// ---------------------------------------------------------------------------
// Build extraction prompt
// ---------------------------------------------------------------------------

const PROMPT_TEMPLATE = `# Source Extraction Task

You are extracting knowledge from source code into a KB documentation file.

## Source file
\`{SOURCE_PATH}\`

\`\`\`
{SOURCE_CONTENT}
\`\`\`

## Target doc path
\`{TARGET_DOC_PATH}\`

## Existing doc content (if any)
{EXISTING_DOC_CONTENT}

## Instructions
1. Extract: architecture, responsibilities, dependencies, known risks, gotchas
2. Format as KB doc with frontmatter (doc_id, title, verification: code-verified)
3. Add \`extraction_sources\` frontmatter pointing to source file(s) with hash and date
4. Keep output under 400 lines
5. Do NOT hallucinate — only describe what is visible in the source

## Model hint
This prompt is designed for cheap/fast models (GPT-4o-mini, Gemini Flash, Claude Haiku).
Paste output into: kb extract --apply <output-file> --target-doc={TARGET_DOC_PATH}

## Output: complete KB doc markdown
`;

function buildExtractionPrompt({ sourcePath, sourceContent, targetDocPath, existingDocContent }) {
  const existing = existingDocContent
    ? `\`\`\`\n${existingDocContent}\n\`\`\``
    : '(none — create a new doc)';
  return PROMPT_TEMPLATE
    .replace('{SOURCE_PATH}', sourcePath)
    .replace('{SOURCE_CONTENT}', sourceContent || '(file not readable)')
    .replace('{TARGET_DOC_PATH}', targetDocPath || `<choose-path-for-${path.basename(sourcePath, path.extname(sourcePath))}.md>`)
    .replace('{EXISTING_DOC_CONTENT}', existing);
}

function resolvePathFromCwd(cwd, inputPath) {
  if (!inputPath) return null;
  return path.isAbsolute(inputPath) ? inputPath : path.join(cwd, inputPath);
}

function resolvePathUnderContentRoot(contentRoot, targetPath) {
  const root = path.resolve(contentRoot);
  const abs = path.resolve(root, targetPath);
  if (abs !== root && !abs.startsWith(`${root}${path.sep}`)) {
    throw new Error(`target doc path escapes KB root: ${targetPath}`);
  }
  return abs;
}

function toWorkspaceRelativePath(workspaceRoot, maybePath) {
  if (!maybePath) return null;
  const abs = resolvePathFromCwd(workspaceRoot, maybePath);
  if (!fs.existsSync(abs)) return null;
  return path.relative(workspaceRoot, abs).replace(/\\/g, '/');
}

function extractSourcePathFromFrontmatter(markdown) {
  const match = markdown.match(/^---[\s\S]*?extraction_sources:[\s\S]*?-\s*path:\s*['"]?([^\r\n'"#]+)['"]?/m);
  if (!match) return null;
  return String(match[1] || '').trim();
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function runExtract({ args, cwd }) {
  const options = parseArgs(args);
  const ctx = resolveExistingState({ workspaceRoot: cwd });
  const config = loadConfig(ctx.contentRoot);
  const preferredModel = getConfigValue(config, 'extraction.preferred_model', 'gpt-4o-mini');
  const modelHint = options.model || preferredModel;

  // --uncovered: list uncovered entries from source-index
  if (options.uncovered) {
    const index = readSourceIndex(ctx.contentRoot);
    const uncovered = index.entries.filter((e) => e.kb_coverage === 'uncovered');

    if (uncovered.length === 0) {
      console.log('No uncovered source files tracked in source-index.json.');
      console.log('Add entries first with: kb extract <source-file> --target-doc=<doc>');
      return;
    }

    if (options.json) {
      console.log(JSON.stringify({ uncovered_count: uncovered.length, entries: uncovered }, null, 2));
      return;
    }

    console.log(`${uncovered.length} uncovered source file(s) tracked:`);
    for (const e of uncovered) {
      console.log(`  - ${e.source_path}`);
    }
    console.log('');
    console.log('Run: kb extract <source-path> --target-doc=<doc-path>');
    return;
  }

  if (options.applyFile) {
    const absOutputFile = resolvePathFromCwd(cwd, options.applyFile);
    if (!fs.existsSync(absOutputFile)) {
      throw new Error(`Apply file not found: ${absOutputFile}`);
    }

    const outputMarkdown = fs.readFileSync(absOutputFile, 'utf8');
    const absTargetDoc = resolvePathUnderContentRoot(ctx.contentRoot, options.targetDoc);
    fs.mkdirSync(path.dirname(absTargetDoc), { recursive: true });
    fs.writeFileSync(absTargetDoc, outputMarkdown, 'utf8');

    const sourceFromArg = toWorkspaceRelativePath(cwd, options.sourcePath);
    const sourceFromFrontmatter = toWorkspaceRelativePath(cwd, extractSourcePathFromFrontmatter(outputMarkdown));
    const trackedSourcePath = sourceFromArg || sourceFromFrontmatter;

    if (trackedSourcePath) {
      upsertEntry(ctx.contentRoot, cwd, { sourcePath: trackedSourcePath, docPath: options.targetDoc });
      refreshIndex(ctx.contentRoot, cwd);
    }

    if (options.json) {
      console.log(JSON.stringify({
        command: 'kb extract',
        action: 'apply',
        output_file: absOutputFile,
        target_doc: options.targetDoc,
        tracked_source: trackedSourcePath,
        status: 'applied',
      }, null, 2));
      return;
    }

    console.log('Extraction output applied successfully.');
    console.log(`Output  : ${absOutputFile}`);
    console.log(`Target  : ${options.targetDoc}`);
    if (trackedSourcePath) {
      console.log(`Source  : ${trackedSourcePath} (source-index updated)`);
    } else {
      console.log('Source  : not detected (source-index not updated)');
      console.log('Hint    : pass source file as positional arg or include extraction_sources.frontmatter path');
    }
    return;
  }

  // Single source file extraction
  const sourcePath = options.sourcePath;
  const absSourcePath = path.isAbsolute(sourcePath) ? sourcePath : path.join(cwd, sourcePath);

  if (!fs.existsSync(absSourcePath)) {
    throw new Error(`Source file not found: ${absSourcePath}`);
  }

  const sourceContent = fs.readFileSync(absSourcePath, 'utf8');
  const relSourcePath = path.relative(cwd, absSourcePath).replace(/\\/g, '/');

  // Read existing target doc if specified
  let existingDocContent = null;
  if (options.targetDoc) {
    const absTargetDoc = path.join(ctx.contentRoot, options.targetDoc);
    if (fs.existsSync(absTargetDoc)) {
      existingDocContent = fs.readFileSync(absTargetDoc, 'utf8');
    }
  }

  // Build prompt
  const prompt = buildExtractionPrompt({
    sourcePath: relSourcePath,
    sourceContent,
    targetDocPath: options.targetDoc,
    existingDocContent,
  });

  // Write prompt to temp file in .kb/
  const promptsDir = path.join(ctx.contentRoot, '.kb', 'extraction-prompts');
  fs.mkdirSync(promptsDir, { recursive: true });
  const slug = relSourcePath.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').slice(-40);
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const promptFile = path.join(promptsDir, `${slug}-${ts}.md`);
  fs.writeFileSync(promptFile, prompt, 'utf8');

  // Update source-index to track this source file
  upsertEntry(ctx.contentRoot, cwd, { sourcePath: relSourcePath, docPath: options.targetDoc || null });

  if (options.json) {
    console.log(JSON.stringify({
      command: 'kb extract',
      source_path: relSourcePath,
      target_doc: options.targetDoc || null,
      model_hint: modelHint,
      prompt_file: promptFile,
      status: 'prompt_ready',
    }, null, 2));
    return;
  }

  console.log(`Extraction prompt ready: ${promptFile}`);
  console.log('');
  console.log(`Source  : ${relSourcePath}`);
  console.log(`Target  : ${options.targetDoc || '(not set — add --target-doc=<doc-path>)'}`);
  console.log(`Model   : ${modelHint} (override with --model=<hint>)`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Open the prompt file above in your AI tool (Copilot, Claude, ChatGPT, etc.)`);
  console.log(`  2. Run it with a cheap/fast model (${modelHint} recommended)`);
  console.log(`  3. Save the output as a KB doc at: ${options.targetDoc || '<target-doc-path>'}`);
  console.log(`  4. Run: kb intent create --change-type=docs  (to track the change as an intent)`);
}

module.exports = { runExtract, parseArgs, buildExtractionPrompt };
