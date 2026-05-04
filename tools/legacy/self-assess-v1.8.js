const {
  computeDebtScore, debtScoreToTier,
  computeEntropyScore, entropyScoreToTier,
  summariseDebt, summariseEntropy,
  runAllGates, evaluateReconstructionTriggers,
} = require('../src/lib/observation');

// ---- DEBT ITEMS (self-assessment of this codebase v1.8.0) ----
const debtItems = [
  { id:'D01', type:'api-design', status:'open', severity:4, urgency:3, frequency:5, strategic_value:4, effort:4,
    label:'status.js god-command (481 LOC, 14 requires, changed 5x in 5 versions)' },
  { id:'D02', type:'module-size', status:'open', severity:3, urgency:3, frequency:4, strategic_value:4, effort:3,
    label:'release.js 943 LOC, multi-role (orchestrate+validate+format+state)' },
  { id:'D03', type:'test-coverage', status:'open', severity:4, urgency:4, frequency:3, strategic_value:4, effort:4,
    label:'No tests for bootstrap/init/uninstall/sync/questions/help/kb-analysis (~2100 LOC, 7 files)' },
  { id:'D04', type:'module-size', status:'open', severity:2, urgency:2, frequency:1, strategic_value:3, effort:3,
    label:'observation.js 675 LOC single-file monolith (schema+gates+decisions)' },
  { id:'D05', type:'api-design', status:'open', severity:2, urgency:3, frequency:5, strategic_value:2, effort:2,
    label:'help.js manually synced every version (6 changes = highest churn)' },
  { id:'D06', type:'test-coverage', status:'open', severity:4, urgency:3, frequency:2, strategic_value:4, effort:5,
    label:'No E2E integration test: kb init -> kb status -> kb intent flow' },
  { id:'D07', type:'api-design', status:'open', severity:2, urgency:3, frequency:1, strategic_value:3, effort:2,
    label:'Observation gates not persisted to gates-report.md (no write command yet)' },
];

// ---- ENTROPY ITEMS ----
const entropyItems = [
  { id:'E01', type:'coupling', status:'open', severity:4, spread:4, coupling:5, reversibility:2,
    label:'status.js 14-way coupling (aggregator god command)' },
  { id:'E02', type:'module-size', status:'open', severity:3, spread:3, coupling:4, reversibility:3,
    label:'release.js structural entropy (943 LOC, no sub-domain separation)' },
  { id:'E03', type:'naming', status:'open', severity:2, spread:3, coupling:3, reversibility:3,
    label:'CLI routing via string dispatch (no type safety or validation layer)' },
  { id:'E04', type:'coupling', status:'open', severity:3, spread:5, coupling:2, reversibility:3,
    label:'No standardized error format across command files' },
  { id:'E05', type:'naming', status:'open', severity:2, spread:1, coupling:1, reversibility:5,
    label:'Two files named impact.test.js in test/ (ambiguous test scope)' },
];

// Score
for (const d of debtItems) {
  d.debt_score = computeDebtScore(d);
  d.debt_tier = debtScoreToTier(d.debt_score);
}
for (const e of entropyItems) {
  e.entropy_score = computeEntropyScore(e);
  e.entropy_tier = entropyScoreToTier(e.entropy_score);
}

console.log('=== DEBT ITEMS ===');
for (const d of debtItems) {
  const tier = d.debt_tier.padEnd(6);
  const score = String(d.debt_score).padStart(5);
  console.log('  ' + d.id + ' [' + tier + '] score=' + score + '  ' + d.label);
}

console.log('\n=== ENTROPY ITEMS ===');
for (const e of entropyItems) {
  const tier = e.entropy_tier.padEnd(6);
  const score = e.entropy_score.toFixed(1).padStart(5);
  console.log('  ' + e.id + ' [' + tier + '] score=' + score + '  ' + e.label);
}

const ds = summariseDebt(debtItems);
const es = summariseEntropy(entropyItems);
console.log('\n=== SUMMARY ===');
console.log('Debt:    total=' + ds.total + ', open=' + ds.openCount + ', low=' + ds.byTier.low + ', medium=' + ds.byTier.medium + ', high=' + ds.byTier.high + ', red=' + ds.byTier.red);
console.log('Entropy: total=' + es.total + ', open=' + es.openCount + ', low=' + es.byTier.low + ', medium=' + es.byTier.medium + ', high=' + es.byTier.high + ', red=' + es.byTier.red);

const { gateResults, overallStatus } = runAllGates({ debtItems, entropyItems, lessonItems: [] });
console.log('\nGates overall: ' + overallStatus);
for (const [k, v] of Object.entries(gateResults)) {
  const action = v.recommendedAction ? ' — ' + v.recommendedAction : '';
  console.log('  ' + k + ': ' + v.status + action);
}

const recon = evaluateReconstructionTriggers(gateResults);
console.log('\nReconstruction triggers: ' + (recon.triggered ? recon.triggers.join(', ') : 'none'));
if (recon.triggered) console.log('Rationale: ' + recon.rationale);
