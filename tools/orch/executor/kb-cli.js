'use strict';

const path = require('path');
const { runShellStep } = require('./shell');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const KB_BIN = path.join(REPO_ROOT, 'bin', 'kb.js');

function runKbCliStep(step, resolvedWorkingDir) {
  const kbStep = {
    ...step,
    command: process.execPath,
    args: [KB_BIN, ...splitCommand(step.command)],
  };
  return runShellStep(kbStep, resolvedWorkingDir);
}

function splitCommand(command) {
  return command
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

module.exports = {
  runKbCliStep,
};
