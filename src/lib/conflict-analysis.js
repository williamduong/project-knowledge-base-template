const ontology = require('./ontology.js');
const registry = ontology.TerminologyRegistry;

// Semantic Debt Analysis: Phát hiện Polysemy
console.log('=== SEMANTIC DEBT ANALYSIS ===\n');

// Xây dựng reverse index: alias -> [entities]
const aliasMap = {};
for (const [canonical, entry] of Object.entries(registry)) {
  const repoOrigin = entry.repo_origin;
  for (const alias of entry.aliases) {
    const key = alias.toLowerCase();
    if (!aliasMap[key]) aliasMap[key] = [];
    aliasMap[key].push({ canonical, repo_origin: repoOrigin });
  }
}

// Tìm Polysemy: một alias xuất hiện ở nhiều entities hoặc repos
const polysemies = [];
for (const [alias, occurrences] of Object.entries(aliasMap)) {
  if (occurrences.length > 1) {
    const unique = new Set(occurrences.map(o => o.canonical + '@' + o.repo_origin));
    if (unique.size > 1) {
      polysemies.push({
        alias,
        occurrences: Array.from(unique),
        count: occurrences.length,
      });
    }
  }
}

if (polysemies.length === 0) {
  console.log('✓ No Polysemy Detected — All aliases are unambiguous');
  console.log('  → TerminologyRegistry DNS conflict-free\n');
} else {
  console.log('⚠ POLYSEMY DETECTED (Semantic Debt):\n');
  polysemies.forEach(p => {
    console.log(`  "${p.alias}" used in:`);
    p.occurrences.forEach(o => console.log(`    - ${o}`));
    console.log();
  });
}

// Bounded Contexts Analysis
console.log('\n=== BOUNDED CONTEXTS (repo_origin isolation) ===\n');
const contexts = {};
for (const [canonical, entry] of Object.entries(registry)) {
  const repo = entry.repo_origin;
  if (!contexts[repo]) contexts[repo] = [];
  contexts[repo].push(canonical);
}

for (const [repo, entities] of Object.entries(contexts).sort()) {
  console.log(`${repo}:`);
  entities.forEach(e => {
    const aliases = registry[e].aliases.join(', ');
    console.log(`  - ${e}: [${aliases}]`);
  });
  console.log();
}

// Cross-Repo Compatibility Check
console.log('\n=== CROSS-REPO EDGE WHITELIST ===\n');
const crossRepoEdges = [
  { from: 'billing', to: 'infrastructure', reason: 'Subscription → Project' },
  { from: 'auth', to: 'infrastructure', reason: 'ServicePrincipal → CLICommand' },
  { from: 'auth', to: 'infrastructure', reason: 'Intent → Config' },
  { from: 'infrastructure', to: 'auth', reason: 'CLICommand → Evidence (audit)' },
];

console.log('Allowed cross-repo mutations:');
crossRepoEdges.forEach(e => {
  console.log(`  ${e.from} → ${e.to} (${e.reason})`);
});

console.log('\n✓ Task 2 Analysis Complete');
