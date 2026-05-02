'use strict';

const path = require('path');

function toResolved(root, fromDir) {
  return path.resolve(fromDir, root);
}

function isWithin(absolutePath, absoluteRoot) {
  const rel = path.relative(absoluteRoot, absolutePath);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function validateStepScope(step, workspaceRoot) {
  const resolvedWorkingDir = toResolved(step.workingDir, workspaceRoot);
  const resolvedAllowedRoots = step.allowedRoots.map((root) => toResolved(root, workspaceRoot));

  const insideAny = resolvedAllowedRoots.some((allowedRoot) => isWithin(resolvedWorkingDir, allowedRoot));
  if (!insideAny) {
    const error = new Error(
      `SCOPE_VIOLATION: step ${step.id} workingDir ${resolvedWorkingDir} outside allowedRoots ${resolvedAllowedRoots.join(', ')}`
    );
    error.code = 'SCOPE_VIOLATION';
    throw error;
  }

  return {
    resolvedWorkingDir,
    resolvedAllowedRoots,
  };
}

module.exports = {
  validateStepScope,
};
