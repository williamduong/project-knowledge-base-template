'use strict';

function parseDateValue(value) {
  if (!value || typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function daysOld(value, now = new Date()) {
  const time = parseDateValue(value);
  if (!time) return null;
  return Math.max(0, Math.floor((now.getTime() - time) / 86_400_000));
}

function isCriticalMissingDoc(doc) {
  const rel = String(doc && doc.relativePath || '');
  if (!/^(03-architecture|05-backend|06-api|07-database)\//.test(rel)) {
    return false;
  }
  return !doc.kbState || doc.kbState === 'template';
}

function summariseDrift(impactData) {
  return (impactData && Array.isArray(impactData.impacted) ? impactData.impacted : []).map((entry) => ({
    kind: 'drift',
    doc: entry.doc,
    matchedChangeCount: Array.isArray(entry.matched_changes) ? entry.matched_changes.length : 0,
    autoDowngraded: entry.auto_downgraded === true,
    command: `kb verify ${entry.doc}`,
  }));
}

function summariseReviewBacklog(documents, excludedDocs, now = new Date()) {
  return (documents || [])
    .filter((doc) => doc.kbState === 'needs-review' && !excludedDocs.has(doc.relativePath))
    .map((doc) => ({
      kind: 'review',
      doc: doc.relativePath,
      ageDays: daysOld(
        (doc.frontmatter && (doc.frontmatter.last_updated || doc.frontmatter.last_verified)) || null,
        now
      ),
      command: `kb mark --file ${doc.relativePath} --state verified`,
    }))
    .sort((a, b) => (b.ageDays || 0) - (a.ageDays || 0) || a.doc.localeCompare(b.doc));
}

function summariseMissingCritical(documents) {
  return (documents || [])
    .filter(isCriticalMissingDoc)
    .map((doc) => ({
      kind: 'missing',
      doc: doc.relativePath,
      command: 'kb questions --print',
    }))
    .sort((a, b) => a.doc.localeCompare(b.doc));
}

function summariseSourceMirror(sourceIndex) {
  return ((sourceIndex && Array.isArray(sourceIndex.entries)) ? sourceIndex.entries : [])
    .filter((entry) => entry.kb_coverage === 'stale')
    .map((entry) => ({
      kind: 'source',
      sourcePath: entry.source_path,
      command: `kb extract ${entry.source_path}`,
    }))
    .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
}

function collectNextActions({ impactData, documents, sourceIndex, now = new Date() }) {
  const drift = summariseDrift(impactData);
  const driftDocSet = new Set(drift.map((item) => item.doc));
  const review = summariseReviewBacklog(documents, driftDocSet, now);
  const missing = summariseMissingCritical(documents);
  const source = summariseSourceMirror(sourceIndex);

  const total = drift.length + review.length + missing.length + source.length;
  const nextBestAction = drift[0] || review[0] || missing[0] || source[0] || null;

  return {
    summary: {
      total,
      drift: drift.length,
      review: review.length,
      missing: missing.length,
      source: source.length,
    },
    nextBestAction,
    sections: { drift, review, missing, source },
  };
}

module.exports = {
  collectNextActions,
  daysOld,
  isCriticalMissingDoc,
};