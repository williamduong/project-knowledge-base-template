const { execFileSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const out = {
    version: null,
    from: null,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run' || token === 'dry-run') {
      out.dryRun = true;
      continue;
    }
    if (token === '--from' && i + 1 < argv.length) {
      out.from = argv[i + 1];
      i += 1;
      continue;
    }
    if (token.startsWith('--from=')) {
      out.from = token.slice('--from='.length);
      continue;
    }
    if (token === '--template-version' && i + 1 < argv.length) {
      out.version = argv[i + 1];
      i += 1;
      continue;
    }
    if (token.startsWith('--template-version=')) {
      out.version = token.slice('--template-version='.length);
      continue;
    }
    if (!token.startsWith('--') && !out.version) {
      out.version = token;
      continue;
    }
  }

  return out;
}

function printDeprecatedBanner() {
  process.stderr.write('[DEPRECATED] tools/generate-template-changelog.js is deprecated in v1.5 Phase 2.\n');
  process.stderr.write('Use: npm run release:notes -- <version> [--from=<tag>] [--output=<path>] [--format=md|json]\n');
  process.stderr.write('This wrapper now forwards to: kb release notes <version>.\n\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.version) {
    throw new Error('Missing release version. Example: npm run release:notes -- v1.5.0 --from=v1.4.1');
  }

  printDeprecatedBanner();

  const kbArgs = ['bin/kb.js', 'release', 'notes', args.version];
  if (args.from) {
    kbArgs.push(`--from=${args.from}`);
  }

  // Legacy generator wrote directly to TEMPLATE_CHANGELOG when dry-run was omitted.
  // New flow always emits release notes and expects manual review/apply.
  if (!args.dryRun) {
    process.stderr.write(
      '[INFO] Legacy auto-write to template/TEMPLATE_CHANGELOG.md is removed. '
      + 'Review the generated notes and update changelog manually.\n\n'
    );
  }

  const output = execFileSync('node', kbArgs, {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });

  process.stdout.write(output);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
