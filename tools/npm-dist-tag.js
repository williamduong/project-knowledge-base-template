#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

function readPackageMeta() {
  const raw = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
  const pkg = JSON.parse(raw);
  return {
    name: pkg.name,
    version: pkg.version
  };
}

function printUsage() {
  console.log('Usage:');
  console.log('  node tools/npm-dist-tag.js <tag> [--version=<x.y.z>] [--dry-run]');
  console.log('  node tools/npm-dist-tag.js --remove --tag=<tag> [--dry-run]');
  console.log('');
  console.log('Examples:');
  console.log('  npm run tag:latest');
  console.log('  npm run tag:beta -- --version=2.1.0-beta.1');
  console.log('  npm run tag:next -- --version=2.1.0-beta.1');
  console.log('  npm run tag:remove -- --tag=next');
  console.log('  npm run tag:latest -- --dry-run');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const tag = args.find((a) => !a.startsWith('-'));
  const tagArg = args.find((a) => a.startsWith('--tag='));
  const versionArg = args.find((a) => a.startsWith('--version='));
  const dryRun = args.includes('--dry-run') || process.env.npm_config_dry_run === 'true';
  const remove = args.includes('--remove');
  const envTag = process.env.npm_config_tag;
  const envVersion = process.env.npm_config_version;

  return {
    tag: tagArg ? tagArg.slice('--tag='.length) : (tag || envTag),
    version: versionArg ? versionArg.slice('--version='.length) : envVersion,
    dryRun,
    remove,
    help: args.includes('-h') || args.includes('--help')
  };
}

function isPreRelease(version) {
  return /-/.test(version);
}

function run() {
  const parsed = parseArgs(process.argv);

  if (parsed.help || !parsed.tag) {
    printUsage();
    process.exit(parsed.help ? 0 : 1);
  }

  const meta = readPackageMeta();
  const version = parsed.version || meta.version;
  const target = `${meta.name}@${version}`;

  if (!parsed.remove && parsed.tag === 'latest' && isPreRelease(version)) {
    console.error(
      `Blocked: refusing to assign tag "latest" to prerelease version ${version}. ` +
      'Use tag "next" or "beta" instead.'
    );
    process.exit(1);
  }

  const cmdArgs = parsed.remove
    ? ['dist-tag', 'rm', meta.name, parsed.tag]
    : ['dist-tag', 'add', target, parsed.tag];
  const pretty = `npm ${cmdArgs.join(' ')}`;

  if (parsed.dryRun) {
    console.log('[dry-run] ' + pretty);
    return;
  }

  console.log('Running: ' + pretty);
  const result = spawnSync('npm', cmdArgs, { stdio: 'inherit', shell: true });

  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  process.exit(1);
}

run();
