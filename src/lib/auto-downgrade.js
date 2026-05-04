'use strict';

const { matchPaths } = require('./binding-matcher');

function shouldAutoDowngradeDoc({ kbState, lastVerifiedCommit, bindingPaths, changedPathsSinceVerify, isDirty }) {
  if (kbState !== 'verified') {
    return { shouldDowngrade: false, reason: 'not-verified', matchedPaths: [] };
  }
  if (!lastVerifiedCommit || lastVerifiedCommit === 'NOT_AVAILABLE') {
    return { shouldDowngrade: false, reason: 'missing-last-verified-commit', matchedPaths: [] };
  }
  if (isDirty) {
    return { shouldDowngrade: false, reason: 'doc-dirty', matchedPaths: [] };
  }
  if (!Array.isArray(bindingPaths) || bindingPaths.length === 0) {
    return { shouldDowngrade: false, reason: 'no-bindings', matchedPaths: [] };
  }

  const matchedPaths = matchPaths(changedPathsSinceVerify || [], bindingPaths);
  if (matchedPaths.length === 0) {
    return { shouldDowngrade: false, reason: 'binding-unchanged-since-verify', matchedPaths: [] };
  }

  return {
    shouldDowngrade: true,
    reason: 'binding-changed-after-verify',
    matchedPaths,
  };
}

module.exports = {
  shouldAutoDowngradeDoc,
};