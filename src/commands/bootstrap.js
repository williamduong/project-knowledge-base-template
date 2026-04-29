const fs = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');

// ─── Framework detection ────────────────────────────────────────────────────

function detectStack(workspaceRoot) {
  const stack = {
    language: 'unknown',
    frameworks: [],
    packageFiles: [],
  };

  const pkgJsonPath = path.join(workspaceRoot, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    stack.language = 'javascript/typescript';
    stack.packageFiles.push('package.json');
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

      if (deps.includes('next')) stack.frameworks.push('Next.js');
      if (deps.includes('nuxt') || deps.includes('nuxt3')) stack.frameworks.push('Nuxt');
      if (deps.includes('vite')) stack.frameworks.push('Vite');
      if (deps.includes('react')) stack.frameworks.push('React');
      if (deps.includes('vue')) stack.frameworks.push('Vue');
      if (deps.includes('svelte')) stack.frameworks.push('Svelte');
      if (deps.includes('express')) stack.frameworks.push('Express');
      if (deps.includes('fastify')) stack.frameworks.push('Fastify');
      if (deps.includes('koa')) stack.frameworks.push('Koa');
      if (deps.includes('nestjs') || deps.includes('@nestjs/core')) stack.frameworks.push('NestJS');
      if (deps.includes('hono')) stack.frameworks.push('Hono');
      if (deps.includes('prisma') || deps.includes('@prisma/client')) stack.frameworks.push('Prisma');
      if (deps.includes('drizzle-orm')) stack.frameworks.push('Drizzle ORM');
      if (deps.includes('typeorm')) stack.frameworks.push('TypeORM');
      if (deps.includes('mongoose')) stack.frameworks.push('Mongoose');
      if (deps.includes('sequelize')) stack.frameworks.push('Sequelize');
    } catch {
      // ignore parse errors
    }
  }

  if (fs.existsSync(path.join(workspaceRoot, 'pyproject.toml')) ||
      fs.existsSync(path.join(workspaceRoot, 'requirements.txt')) ||
      fs.existsSync(path.join(workspaceRoot, 'setup.py'))) {
    stack.language = 'python';
    if (fs.existsSync(path.join(workspaceRoot, 'pyproject.toml'))) {
      stack.packageFiles.push('pyproject.toml');
      const txt = fs.readFileSync(path.join(workspaceRoot, 'pyproject.toml'), 'utf8');
      if (/fastapi/i.test(txt)) stack.frameworks.push('FastAPI');
      if (/django/i.test(txt)) stack.frameworks.push('Django');
      if (/flask/i.test(txt)) stack.frameworks.push('Flask');
      if (/sqlalchemy/i.test(txt)) stack.frameworks.push('SQLAlchemy');
    }
  }

  if (fs.existsSync(path.join(workspaceRoot, 'go.mod'))) {
    stack.language = 'go';
    stack.packageFiles.push('go.mod');
    const gomod = fs.readFileSync(path.join(workspaceRoot, 'go.mod'), 'utf8');
    if (/gin-gonic\/gin/i.test(gomod)) stack.frameworks.push('Gin');
    if (/echo/i.test(gomod)) stack.frameworks.push('Echo');
    if (/fiber/i.test(gomod)) stack.frameworks.push('Fiber');
    if (/gorm/i.test(gomod)) stack.frameworks.push('GORM');
  }

  if (fs.existsSync(path.join(workspaceRoot, 'Cargo.toml'))) {
    stack.language = 'rust';
    stack.packageFiles.push('Cargo.toml');
    const cargo = fs.readFileSync(path.join(workspaceRoot, 'Cargo.toml'), 'utf8');
    if (/actix-web/i.test(cargo)) stack.frameworks.push('Actix-web');
    if (/axum/i.test(cargo)) stack.frameworks.push('Axum');
    if (/rocket/i.test(cargo)) stack.frameworks.push('Rocket');
    if (/diesel/i.test(cargo)) stack.frameworks.push('Diesel');
  }

  return stack;
}

function detectEnvVars(workspaceRoot) {
  const envFiles = ['.env.example', '.env.sample', '.env.template', '.env'];
  const found = [];

  for (const f of envFiles) {
    const p = path.join(workspaceRoot, f);
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
      if (match) found.push({ key: match[1], file: f });
    }
  }

  return found;
}

function detectSourceFolders(workspaceRoot) {
  const common = ['src', 'app', 'lib', 'api', 'server', 'backend', 'frontend', 'web', 'packages'];
  return common.filter((d) => fs.existsSync(path.join(workspaceRoot, d)));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Stub generators ──────────────────────────────────────────────────────

function buildFrontmatter({ title, type, folder, sourceOfTruth }) {
  const sotLines = sourceOfTruth.length > 0
    ? sourceOfTruth.map((s) => `  - ${s}`).join('\n')
    : '  []';

  return `---
title: ${title}
type: ${type}
status: active
owner: engineering
time_state: current
verification: unverified
last_updated: ${today()}
last_verified: ${today()}
source_of_truth:
${sotLines}
tags:
  - bootstrapped
  - ${folder}
---`;
}

function stubSystemOverview({ stack, sourceFolders }) {
  const fm = buildFrontmatter({
    title: 'System Overview',
    type: 'architecture',
    folder: '03-architecture',
    sourceOfTruth: stack.packageFiles,
  });

  return `${fm}

# System Overview

> **bootstrapped stub** — fill in with actual architecture context.

## Detected Stack

- **Language:** ${stack.language}
- **Frameworks:** ${stack.frameworks.length > 0 ? stack.frameworks.join(', ') : 'none detected'}
- **Package files:** ${stack.packageFiles.join(', ') || 'none'}

## Source Folders

${sourceFolders.length > 0 ? sourceFolders.map((f) => `- \`${f}/\``).join('\n') : '- (none detected)'}

## Components

<!-- TODO: describe major components and their responsibilities -->

| Component | Responsibility | Folder |
|---|---|---|
| (placeholder) | (placeholder) | (placeholder) |
`;
}

function stubServicesOverview({ stack, sourceFolders }) {
  const backendFolders = sourceFolders.filter((f) => ['src', 'app', 'server', 'backend', 'api'].includes(f));
  const fm = buildFrontmatter({
    title: 'Services Overview',
    type: 'backend',
    folder: '05-backend',
    sourceOfTruth: backendFolders.map((f) => `${f}/`),
  });

  return `${fm}

# Services Overview

> **bootstrapped stub** — fill in with actual service descriptions.

## Detected Backend Frameworks

${stack.frameworks.filter((f) => ['Express', 'Fastify', 'Koa', 'NestJS', 'Hono', 'FastAPI', 'Django', 'Flask', 'Gin', 'Echo', 'Fiber', 'Actix-web', 'Axum', 'Rocket'].includes(f)).map((f) => `- ${f}`).join('\n') || '- (none detected)'}

## Services

<!-- TODO: list each service with its responsibility -->

| Service | Responsibility | Entry Point |
|---|---|---|
| (placeholder) | (placeholder) | (placeholder) |
`;
}

function stubApiOverview({ stack }) {
  const fm = buildFrontmatter({
    title: 'API Overview',
    type: 'api',
    folder: '06-api',
    sourceOfTruth: stack.packageFiles,
  });

  return `${fm}

# API Overview

> **bootstrapped stub** — fill in with actual API documentation.

## Base URL

<!-- TODO: \`https://api.example.com/v1\` -->

## Authentication

<!-- TODO: describe auth mechanism -->

## Endpoints

<!-- TODO: list endpoint groups -->

| Group | Path Prefix | Description |
|---|---|---|
| (placeholder) | /api/ | (placeholder) |
`;
}

function stubSchemaOverview({ stack }) {
  const ormFrameworks = ['Prisma', 'Drizzle ORM', 'TypeORM', 'Mongoose', 'Sequelize', 'SQLAlchemy', 'GORM', 'Diesel'];
  const detectedOrms = stack.frameworks.filter((f) => ormFrameworks.includes(f));

  const fm = buildFrontmatter({
    title: 'Schema Overview',
    type: 'database',
    folder: '07-database',
    sourceOfTruth: detectedOrms.length > 0 ? detectedOrms.map((o) => `(${o} schema files)`) : stack.packageFiles,
  });

  return `${fm}

# Schema Overview

> **bootstrapped stub** — fill in with actual schema documentation.

## Detected ORM / ODM

${detectedOrms.length > 0 ? detectedOrms.map((o) => `- ${o}`).join('\n') : '- (none detected)'}

## Tables / Collections

<!-- TODO: list main tables or collections -->

| Name | Description | Primary Key |
|---|---|---|
| (placeholder) | (placeholder) | id |
`;
}

function stubConfigDeployment({ stack, envVars }) {
  const envSection = envVars.length > 0
    ? envVars.slice(0, 20).map((e) => `| \`${e.key}\` | (from ${e.file}) | — |`).join('\n')
    : '| (none detected) | | |';

  const fm = buildFrontmatter({
    title: 'Configuration & Deployment',
    type: 'operations',
    folder: '09-operations',
    sourceOfTruth: envVars.length > 0 ? [envVars[0].file] : stack.packageFiles,
  });

  return `${fm}

# Configuration & Deployment

> **bootstrapped stub** — fill in with actual deployment and config documentation.

## Environment Variables

| Key | Purpose | Example |
|---|---|---|
${envSection}

## Deployment

<!-- TODO: describe deployment target (Vercel, AWS, Docker, etc.) -->
`;
}

function stubCurrentState({ stack, sourceFolders, envVars }) {
  const fm = `---
title: Current State
type: orientation
status: active
owner: knowledge-management
time_state: current
verification: unverified
last_updated: ${today()}
last_verified: ${today()}
---`;

  return `${fm}

# Current State

## Purpose
Capture the observed current implementation baseline for this repository so future KB updates can distinguish current vs target state.

## What To Fill
- Replace placeholders with code-verified facts after reviewing source files.
- Keep current behavior and target behavior explicitly separated.

## Current State
- Detected language: **${stack.language}**
- Detected frameworks: **${stack.frameworks.join(', ') || 'none'}**
- Detected source folders: ${sourceFolders.length > 0 ? sourceFolders.map((f) => `\`${f}/\``).join(', ') : 'none'}
- Detected environment keys (count): **${envVars.length}**

## Target State
- Upgrade this file from \`verification: unverified\` to \`code-verified\` after validating claims against source.
- Link architecture, backend, API, and database KB sections to concrete source files.

## Evidence
- package manifests: ${stack.packageFiles.join(', ') || '(none detected)'}
- scanned folders: ${sourceFolders.join(', ') || '(none detected)'}

## Open Questions
- Which runtime/deployment environment is canonical (local/docker/cloud)?
- Which API surface is public and versioned?
- Which data model objects are authoritative for domain vocabulary?
`;
}

function isPlaceholderDocument(text) {
  const markers = [
    '[Enter the purpose of this document here]',
    '[Enter instructions or placeholders for required information]',
    '[Describe the current implementation or situation]',
    '[Describe the desired future state]',
    '[Link to code, logs, or other proof]',
    '[List any unresolved issues or questions]',
    '(placeholder)',
  ];

  return markers.some((marker) => text.includes(marker));
}

// ─── Write stubs ─────────────────────────────────────────────────────────

function writeStub({ contentRoot, relPath, content, dryRun, fillPlaceholders }) {
  const fullPath = path.join(contentRoot, relPath);
  if (fs.existsSync(fullPath)) {
    const existing = fs.readFileSync(fullPath, 'utf8');
    if (fillPlaceholders && isPlaceholderDocument(existing)) {
      if (!dryRun) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }

      return { path: relPath, action: 'updated' };
    }

    return { path: relPath, action: 'skipped' };
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
  }

  return { path: relPath, action: 'created' };
}

// ─── Command ──────────────────────────────────────────────────────────────

function parseArgs(args) {
  const options = { dryRun: false, fillPlaceholders: true };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--no-fill-placeholders') {
      options.fillPlaceholders = false;
      continue;
    }

    throw new Error(`Unknown bootstrap option "${arg}". Supported: --dry-run, --no-fill-placeholders`);
  }

  return options;
}

async function runBootstrap({ args, cwd }) {
  const options = parseArgs(args);
  const context = resolveExistingState({ workspaceRoot: cwd });
  const { contentRoot } = context;

  if (!fs.existsSync(contentRoot)) {
    throw new Error(`KB content root not found: ${contentRoot}. Run kb init first.`);
  }

  const stack = detectStack(cwd);
  const envVars = detectEnvVars(cwd);
  const sourceFolders = detectSourceFolders(cwd);

  console.log('\nDetected stack:');
  console.log(`  Language  : ${stack.language}`);
  console.log(`  Frameworks: ${stack.frameworks.join(', ') || 'none'}`);
  console.log(`  Env vars  : ${envVars.length} detected`);

  const stubs = [
    { relPath: '00-start-here/current-state.md', content: stubCurrentState({ stack, sourceFolders, envVars }) },
    { relPath: '03-architecture/system-overview.md', content: stubSystemOverview({ stack, sourceFolders }) },
    { relPath: '05-backend/services-overview.md', content: stubServicesOverview({ stack, sourceFolders }) },
    { relPath: '06-api/api-overview.md', content: stubApiOverview({ stack }) },
    { relPath: '07-database/schema-overview.md', content: stubSchemaOverview({ stack }) },
    { relPath: '09-operations/configuration-deployment.md', content: stubConfigDeployment({ stack, envVars }) },
  ];

  const results = stubs.map((s) => writeStub({
    contentRoot,
    ...s,
    dryRun: options.dryRun,
    fillPlaceholders: options.fillPlaceholders,
  }));

  const created = results.filter((r) => r.action === 'created');
  const updated = results.filter((r) => r.action === 'updated');
  const skipped = results.filter((r) => r.action === 'skipped');

  if (options.dryRun) {
    console.log('\n[dry-run] Planned actions:');
    for (const r of results) {
      if (!fs.existsSync(path.join(contentRoot, r.path))) {
        console.log(`  + create  ${r.path}`);
        continue;
      }

      if (options.fillPlaceholders && r.action === 'updated') {
        console.log(`  * update  ${r.path} (placeholder detected)`);
        continue;
      }

      console.log(`  ~ skip    ${r.path}`);
    }
    return;
  }

  if (created.length > 0) {
    console.log('\nCreated stubs (verification: unverified):');
    for (const r of created) {
      console.log(`  + ${r.path}`);
    }
  }

  if (updated.length > 0) {
    console.log('\nUpdated existing placeholder docs:');
    for (const r of updated) {
      console.log(`  * ${r.path}`);
    }
  }

  if (skipped.length > 0) {
    console.log('\nSkipped (already exist):');
    for (const r of skipped) {
      console.log(`  ~ ${r.path}`);
    }
  }

  console.log('\nNext: open each stub and replace placeholder content with actual code-verified data.');
}

module.exports = {
  runBootstrap,
};
