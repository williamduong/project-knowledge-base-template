#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');
const RECOMMENDED_KEYWORDS = [
  'knowledge-base',
  'documentation',
  'project-documentation',
  'engineering-docs',
  'developer-tools',
  'cli',
  'template',
  'governance',
  'ai',
  'ai-agents',
  'copilot',
  'cursor',
  'claude',
  'knowledge-management',
  'release-notes',
  'change-management',
  'impact-analysis',
  'git',
  'node',
  'devops'
];

function readPackageJson() {
  const raw = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
  return JSON.parse(raw);
}

function normalizeKeywords(keywords) {
  const list = Array.isArray(keywords) ? keywords : [];
  const normalized = list
    .filter((keyword) => typeof keyword === 'string')
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(normalized)).sort();
}

function buildMergedKeywords(existing) {
  return normalizeKeywords(existing.concat(RECOMMENDED_KEYWORDS));
}

function writePackageJson(pkg) {
  const serialized = JSON.stringify(pkg, null, 2) + '\n';
  fs.writeFileSync(PACKAGE_JSON_PATH, serialized, 'utf8');
}

function printList(title, list) {
  console.log(title);
  for (const keyword of list) {
    console.log('- ' + keyword);
  }
}

function main() {
  const apply = process.argv.includes('--apply');
  const pkg = readPackageJson();

  const existing = normalizeKeywords(pkg.keywords);
  const merged = buildMergedKeywords(existing);
  const missing = merged.filter((keyword) => !existing.includes(keyword));

  printList('Current keywords:', existing);
  console.log('');
  printList('Recommended keywords:', RECOMMENDED_KEYWORDS);
  console.log('');

  if (missing.length === 0) {
    console.log('All recommended keywords are already present.');
  } else {
    printList('Missing keywords:', missing);
  }

  if (apply) {
    pkg.keywords = merged;
    writePackageJson(pkg);
    console.log('');
    console.log('Applied merged keywords to package.json.');
  } else {
    console.log('');
    console.log('Run with --apply to update package.json automatically.');
  }
}

main();
