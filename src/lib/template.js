const fs = require('fs');
const path = require('path');

const TEMPLATE_ENTRIES = [
  '.github',
  '00-start-here',
  '01-product',
  '02-domain-model',
  '03-architecture',
  '04-frontend',
  '05-backend',
  '06-api',
  '07-database',
  '08-security',
  '09-operations',
  '10-testing',
  '11-user-docs',
  '12-ai-skills',
  '13-knowledge-graph',
  '14-templates',
  '15-governance',
  'scripts',
  'INDEX.md',
  'README.md',
  'LICENSE',
  'TEMPLATE_CHANGELOG.md',
];

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
      continue;
    }

    fs.copyFileSync(sourcePath, destinationPath);
  }
}

function copyTemplateContent({ sourceRoot, destinationRoot }) {
  for (const entry of TEMPLATE_ENTRIES) {
    const sourcePath = path.join(sourceRoot, entry);
    const destinationPath = path.join(destinationRoot, entry);

    if (!fs.existsSync(sourcePath)) {
      continue;
    }

    const stat = fs.statSync(sourcePath);
    if (stat.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
      continue;
    }

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
  }
}

function getTemplateVersion({ repoRoot }) {
  const revisionStatePath = path.join(repoRoot, '00-start-here', 'repository-revision-state.md');
  const text = fs.readFileSync(revisionStatePath, 'utf8');
  const match = text.match(/\|\s*KB Template Version\s*\|\s*(.*?)\s*\|/);
  if (!match) {
    return 'v0.0.0';
  }

  return match[1].trim();
}

module.exports = {
  copyTemplateContent,
  getTemplateVersion,
};