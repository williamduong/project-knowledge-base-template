'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function readPackageMeta() {
  const pkgPath = path.resolve(__dirname, '..', 'package.json');
  const raw = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(raw);
  return { name: pkg.name, version: pkg.version };
}

function readPublishedVersions(pkgName) {
  try {
    const out = execSync(`npm view ${pkgName} versions --json`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

    if (!out) return [];

    const parsed = JSON.parse(out);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch (error) {
    const stderr = String(error.stderr || '').toLowerCase();
    const stdout = String(error.stdout || '').toLowerCase();
    const msg = `${stderr}\n${stdout}`;

    if (msg.includes('e404') || msg.includes('not found')) {
      return [];
    }

    throw error;
  }
}

function main() {
  const { name, version } = readPackageMeta();
  const published = readPublishedVersions(name);

  if (published.includes(version)) {
    console.error(`Publish blocked: ${name}@${version} already exists on npm.`);
    console.error('Bump package.json version, run version:sync + version:check, then publish again.');
    process.exit(1);
  }

  console.log(`Version guard OK: ${name}@${version} is not published yet.`);
}

main();
