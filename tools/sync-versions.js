#!/usr/bin/env node
/**
 * Single source of truth for version numbers.
 *
 * Source: package.json `version` (e.g. "1.2.6")
 * Mirrors:
 *   - template/template.json           -> { "version": "v1.2.6" }
 *   - template/.github/agents/*.md     -> frontmatter `version: 1.2.6`
 *   - template/.github/prompts/*.md    -> frontmatter `version: 1.2.6`
 *
 * Usage:
 *   node tools/sync-versions.js          # write mode (sync all to package version)
 *   node tools/sync-versions.js --check  # verify mode (exit 1 if any mismatch)
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const pkgPath = path.join(repoRoot, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const target = pkg.version; // e.g. "1.2.6"
const targetTagged = `v${target}`;

const checkMode = process.argv.includes('--check');

const targets = [
  {
    label: 'template/template.json',
    path: path.join(repoRoot, 'template', 'template.json'),
    read: (txt) => {
      try {
        return JSON.parse(txt).version;
      } catch {
        return null;
      }
    },
    write: () => `${JSON.stringify({ version: targetTagged }, null, 2)}\n`,
    expected: targetTagged,
  },
];

// Add agent + prompt files (any .md under template/.github/agents and template/.github/prompts)
const promptDirs = [
  path.join(repoRoot, 'template', '.github', 'agents'),
  path.join(repoRoot, 'template', '.github', 'prompts'),
];

for (const dir of promptDirs) {
  if (!fs.existsSync(dir)) continue;
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith('.md')) continue;
    const filePath = path.join(dir, entry);
    targets.push({
      label: path.relative(repoRoot, filePath).replace(/\\/g, '/'),
      path: filePath,
      read: (txt) => {
        const m = /^version:\s*([^\s\r\n]+)\s*$/m.exec(txt);
        return m ? m[1] : null;
      },
      write: (txt) => {
        if (/^version:\s*[^\s\r\n]+\s*$/m.test(txt)) {
          return txt.replace(/^version:\s*[^\s\r\n]+\s*$/m, `version: ${target}`);
        }
        return txt;
      },
      expected: target,
    });
  }
}

let mismatches = 0;
let updated = 0;

for (const t of targets) {
  if (!fs.existsSync(t.path)) continue;
  const original = fs.readFileSync(t.path, 'utf8');
  const current = t.read(original);

  if (current === t.expected) continue;

  if (checkMode) {
    console.error(`MISMATCH ${t.label}: expected ${t.expected}, found ${current === null ? '<none>' : current}`);
    mismatches += 1;
    continue;
  }

  const next = typeof t.write === 'function' && t.write.length === 1 ? t.write(original) : t.write();
  if (next === original) continue;
  fs.writeFileSync(t.path, next, 'utf8');
  console.log(`updated ${t.label}: ${current === null ? '<none>' : current} -> ${t.expected}`);
  updated += 1;
}

if (checkMode) {
  if (mismatches > 0) {
    console.error(`\nVersion check FAILED: ${mismatches} file(s) out of sync with package.json (${target}).`);
    console.error('Run "node tools/sync-versions.js" to align them.');
    process.exit(1);
  }
  console.log(`Version check OK. All files report ${target}.`);
} else {
  console.log(`\nSynced ${updated} file(s) to version ${target}.`);
}
