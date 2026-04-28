#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { buildDocumentIndex } = require('../src/lib/kb-analysis');

const repoRoot = process.cwd();
const contentRoot = path.join(repoRoot, 'template');

function readFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return '';
  }

  return fs.readFileSync(filePath, 'utf8');
}

function hasIntegrationMarker(documentText, doc) {
  const tagMarkers = [];
  if (doc.frontmatter && Array.isArray(doc.frontmatter.tags)) {
    tagMarkers.push(...doc.frontmatter.tags.map((item) => String(item).toLowerCase()));
  }

  const markerTags = new Set(['integration', 'consumer-surface', 'browser-facing-surface']);
  const hasTag = tagMarkers.some((tag) => markerTags.has(tag));
  if (hasTag) {
    return true;
  }

  return /integration\s+surface|browser-facing\s+integration\s+surface/i.test(documentText);
}

function isBackendLikeSource(entry) {
  const normalized = entry.replace(/\\/g, '/').toLowerCase();
  return (
    normalized.includes('/05-backend/') ||
    normalized.includes('/06-api/') ||
    normalized.includes('/api/') ||
    normalized.includes('/backend/') ||
    normalized.includes('/server/') ||
    normalized.endsWith('main.ts') ||
    normalized.endsWith('main.js')
  );
}

function main() {
  const docs = buildDocumentIndex({ contentRoot, workspaceRoot: repoRoot });
  const failures = [];

  for (const doc of docs) {
    if (doc.verification === 'code-verified') {
      if (!doc.sourceOfTruth || doc.sourceOfTruth.length === 0) {
        failures.push(
          `[code-verified] Missing source_of_truth in ${doc.relativePath}`
        );
      }

      for (const check of doc.sourceChecks) {
        if (!check.exists) {
          failures.push(
            `[code-verified] source_of_truth path not found in ${doc.relativePath}: ${check.entry}`
          );
        }
      }
    }

    if (doc.relativePath.startsWith('04-frontend/')) {
      const text = readFileIfExists(doc.filePath);
      const mentionsSwaggerSurface = /swagger|redoc|graphql\s+explorer/i.test(text);
      const backendOnlyEvidence =
        doc.sourceOfTruth.length > 0 && doc.sourceOfTruth.every((entry) => isBackendLikeSource(entry));
      const integrationMarked = hasIntegrationMarker(text, doc);

      if (mentionsSwaggerSurface && backendOnlyEvidence && !integrationMarked) {
        failures.push(
          `[frontend-taxonomy] ${doc.relativePath} references Swagger/Redoc/GraphQL explorer with backend-only evidence but lacks integration marker.`
        );
      }
    }
  }

  const currentState = readFileIfExists(path.join(contentRoot, '00-start-here', 'current-state.md'));
  const apiOverview = readFileIfExists(path.join(contentRoot, '06-api', 'api-overview.md'));

  if (/no\s+frontend\s+codebase/i.test(currentState) && /frontend\s+codebase\s+exists/i.test(apiOverview)) {
    failures.push(
      '[cross-doc] current-state.md and api-overview.md appear to conflict on frontend codebase presence.'
    );
  }

  if (failures.length > 0) {
    console.error('Doc gate failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('Doc gate passed.');
}

main();