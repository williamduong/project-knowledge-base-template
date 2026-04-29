const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');

function parseArgs(args) {
  const options = {
    dryRun: false,
  };

  for (const arg of args || []) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    throw new Error(`Unknown bootstrap-api option "${arg}". Supported: --dry-run`);
  }

  return options;
}

function collectControllerFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }

      if (entry.name.endsWith('.controller.ts') || entry.name.endsWith('.controller.js')) {
        out.push(full);
      }
    }
  }

  return out;
}

function parseRoutesFromController(filePath, workspaceRoot) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const output = [];

  for (let i = 0; i < lines.length; i += 1) {
    const routeComment = lines[i].match(/@route\s+\{([A-Z]+)\}\s+([^\s*]+)/i);
    if (!routeComment) {
      continue;
    }

    const method = routeComment[1].toUpperCase();
    const routePath = routeComment[2].trim();
    output.push({
      method,
      routePath,
      relativeSource: path.relative(workspaceRoot, filePath).replace(/\\/g, '/'),
    });
  }

  return output;
}

function slugifyEndpoint(method, routePath) {
  const clean = routePath
    .replace(/^\/+/, '')
    .replace(/[{}]/g, '')
    .replace(/[:/]+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();

  return `auto-${method.toLowerCase()}-${clean || 'root'}`;
}

function buildEndpointDoc({ title, method, routePath, sourcePath }) {
  const today = new Date().toISOString().slice(0, 10);
  return `---
title: ${title}
type: reference
status: active
owner: backend
time_state: current
verification: unverified
kb_state: autofilled
last_updated: ${today}
last_verified: ${today}
source_of_truth:
  - ${sourcePath}
tags:
  - api-endpoint
  - autofilled
---

# ${title}

## Purpose
Describe the behavior and constraints of ${method} ${routePath}.

## Current State
- Method: \`${method}\`
- Path: \`${routePath}\`
- Generated from route annotation in \`${sourcePath}\`

## Request
<!-- TODO: add request params/body/query contract -->

## Response
<!-- TODO: add response schema and status codes -->

## Auth
<!-- TODO: specify required/optional auth and scopes -->

## Evidence
- ${sourcePath}

## Open Questions
- Are there validation constraints not reflected in route annotations?
`;
}

async function runBootstrapApi({ args, cwd }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);
  const context = resolveExistingState({ workspaceRoot });
  const endpointsRoot = path.join(context.contentRoot, '06-api', 'endpoints');
  const controllerFiles = collectControllerFiles(path.join(workspaceRoot, 'src'));

  const discovered = [];
  for (const controller of controllerFiles) {
    discovered.push(...parseRoutesFromController(controller, workspaceRoot));
  }

  if (discovered.length === 0) {
    console.log('kb bootstrap-api: no @route annotations found.');
    return;
  }

  const actions = [];
  for (const item of discovered) {
    const slug = slugifyEndpoint(item.method, item.routePath);
    const rel = `06-api/endpoints/${slug}.md`;
    const fullPath = path.join(context.contentRoot, rel);
    const title = `${item.method} ${item.routePath}`;
    const content = buildEndpointDoc({
      title,
      method: item.method,
      routePath: item.routePath,
      sourcePath: item.relativeSource,
    });

    const action = fs.existsSync(fullPath) ? 'updated' : 'created';
    actions.push({ rel, action });

    if (!options.dryRun) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }

  console.log(`kb bootstrap-api: ${options.dryRun ? 'DRY-RUN' : 'PASS'}`);
  console.log(`Controllers scanned: ${controllerFiles.length}`);
  console.log(`Endpoints discovered: ${discovered.length}`);

  const created = actions.filter((a) => a.action === 'created').length;
  const updated = actions.filter((a) => a.action === 'updated').length;
  console.log(`Created: ${created}, Updated: ${updated}`);

  const preview = actions.slice(0, 20);
  if (preview.length > 0) {
    console.log('\nPreview:');
    for (const p of preview) {
      console.log(`  ${p.action === 'created' ? '+' : '*'} ${p.rel}`);
    }
  }
}

module.exports = {
  runBootstrapApi,
};
