'use strict';

const { spawn } = require('child_process');

function runShellStep(step, resolvedWorkingDir) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const child = step.args
      ? spawn(step.command, step.args, {
        cwd: resolvedWorkingDir,
        shell: false,
        windowsHide: true,
      })
      : spawn(step.command, {
        cwd: resolvedWorkingDir,
        shell: true,
        windowsHide: true,
      });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      resolve({
        exitCode: null,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
        timedOut: true,
      });
    }, step.timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode: code,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
        timedOut: false,
      });
    });
  });
}

module.exports = {
  runShellStep,
};
