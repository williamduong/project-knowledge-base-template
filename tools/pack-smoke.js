#!/usr/bin/env node

const { execSync } = require('child_process');

function run(command) {
  return execSync(command, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
}

function main() {
  const raw = run('npm pack --json --dry-run');
  const parsed = JSON.parse(raw);
  const artifact = Array.isArray(parsed) ? parsed[0] : parsed;

  if (!artifact || !Array.isArray(artifact.files)) {
    throw new Error('npm pack dry-run output missing file listing.');
  }

  const included = new Set(artifact.files.map((entry) => entry.path));
  const required = [
    'bin/kbx.js',
    'src/cli.js',
    'src/commands/doctor.js',
    'template/INDEX.md',
    'scripts/doc-gate.js',
    'README.md',
    'LICENSE',
  ];

  const missing = required.filter((entry) => !included.has(entry));

  console.log('pack smoke summary');
  console.log(`- artifact: ${artifact.filename || 'unknown'}`);
  console.log(`- files included: ${artifact.files.length}`);
  console.log(`- unpacked size: ${artifact.unpackedSize || 'unknown'} bytes`);

  if (missing.length > 0) {
    console.error('Missing required files in pack artifact:');
    for (const item of missing) {
      console.error(`- ${item}`);
    }
    process.exit(1);
  }

  console.log('pack smoke check passed.');
}

main();