const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { performSync } = require('./sync');
const { runTest } = require('./test');
const { runDoctor } = require('./doctor');

function parseArgs(args) {
  const options = {
    acceptBaseline: false,
    fast: false,
  };

  for (const current of args || []) {
    if (current === '--accept-baseline') {
      options.acceptBaseline = true;
      continue;
    }

    if (current === '--fast') {
      options.fast = true;
      continue;
    }

    throw new Error(`Unknown maintain option \"${current}\".`);
  }

  return options;
}

function hasScript({ workspaceRoot, scriptName }) {
  const packageJsonPath = path.join(workspaceRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const data = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return Boolean(data && data.scripts && data.scripts[scriptName]);
  } catch {
    return false;
  }
}

function runDocGateIfAvailable({ workspaceRoot }) {
  if (!hasScript({ workspaceRoot, scriptName: 'doc:gate' })) {
    console.log('maintain: skip doc:gate (no script found in workspace package.json)');
    return;
  }

  console.log('maintain: running npm run doc:gate');
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['run', 'doc:gate'], {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error('maintain failed: doc:gate returned a non-zero exit code.');
  }
}

function runMaintain({ args, cwd, packageJson }) {
  const options = parseArgs(args);
  const workspaceRoot = path.resolve(cwd);

  console.log(`maintain mode: ${options.fast ? 'fast' : 'full'}`);

  console.log('maintain: running kb sync');
  const syncResult = performSync({
    cwd: workspaceRoot,
    options: { acceptBaseline: options.acceptBaseline },
  });
  console.log(`maintain: sync status = ${syncResult.status}`);
  console.log(`maintain: ${syncResult.message}`);
  if (syncResult.reportPath) {
    console.log(`maintain: report = ${syncResult.reportPath}`);
  }

  if (!options.fast) {
    runDocGateIfAvailable({ workspaceRoot });
  } else {
    console.log('maintain: fast mode skips doc:gate for quicker feedback.');
  }

  console.log(`maintain: running kb test ${options.fast ? '(sample)' : '--all'}`);
  runTest({ args: options.fast ? [] : ['--all'], cwd: workspaceRoot });

  console.log(`maintain: running kb doctor ${options.fast ? '' : '--strict'}`.trim());
  runDoctor({
    args: options.fast ? [] : ['--strict'],
    cwd: workspaceRoot,
    packageJson,
  });

  console.log('maintain: completed');
}

module.exports = {
  runMaintain,
};
