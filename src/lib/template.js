const fs = require('fs');
const path = require('path');

const TEMPLATE_ROOT_DIR = 'template';

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
  const templateRoot = path.join(sourceRoot, TEMPLATE_ROOT_DIR);
  if (!fs.existsSync(templateRoot)) {
    throw new Error(`Template root not found: ${templateRoot}`);
  }

  // Copy KB content from template/ into destination root directly.
  copyDirectory(templateRoot, destinationRoot);

  const githubSource = path.join(sourceRoot, '.github');
  if (fs.existsSync(githubSource)) {
    copyDirectory(githubSource, path.join(destinationRoot, '.github'));
  }
}

function getTemplateVersion({ repoRoot }) {
  const revisionStatePath = path.join(repoRoot, 'template', '00-start-here', 'repository-revision-state.md');
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