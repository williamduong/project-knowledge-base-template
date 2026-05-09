const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  SaaSNodeDNA,
  IntentSchema,
  TerminologyRegistry,
  StateTransitionGuards,
  verifyStateTransition,
  resolveTerminology,
  checkCrossRepoGrant,
  verifyMutation,
  ToolCallInterceptor,
  CypherTemplates,
  validateIntent,
  validateSaaSNode,
  validateTerminology,
  createOntologyValidator,
  validateGlossary,
  auditNaturalLanguageTerms,
  validateOntologyContract,
  evaluateUnknownPropertyRejectionMatrix,
} = require('../../src/lib/ontology');

function loadFixture(name) {
  const fixturePath = path.join(__dirname, '..', 'fixtures', 'ontology', name);
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

// ===================================================================
// Schemas & Validators
// ===================================================================

test('SaaSNodeDNA schema - valid entity', () => {
  const valid = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Tenant',
  };
  const result = SaaSNodeDNA.safeParse(valid);
  assert.strictEqual(result.success, true, 'Should parse valid entity');
});

test('SaaSNodeDNA schema - missing repo_origin (hard-fail)', () => {
  const invalid = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    canonical_name: 'Tenant',
    // missing repo_origin
  };
  const result = SaaSNodeDNA.safeParse(invalid);
  assert.strictEqual(result.success, false, 'Should reject missing repo_origin');
  assert.ok(
    result.error.errors.some(e => e.code === 'invalid_type' && e.path.includes('repo_origin')),
    'Error should mention repo_origin'
  );
});

test('SaaSNodeDNA schema - invalid UUID', () => {
  const invalid = {
    id: 'not-a-uuid',
    repo_origin: 'billing',
    canonical_name: 'Tenant',
  };
  const result = SaaSNodeDNA.safeParse(invalid);
  assert.strictEqual(result.success, false, 'Should reject invalid UUID');
});

test('SaaSNodeDNA schema - invalid repo_origin', () => {
  const invalid = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'invalid_origin',
    canonical_name: 'Tenant',
  };
  const result = SaaSNodeDNA.safeParse(invalid);
  assert.strictEqual(result.success, false, 'Should reject invalid repo_origin');
});

test('SaaSNodeDNA schema - all valid repo_origins', () => {
  const origins = ['billing', 'auth', 'gateway', 'infrastructure'];
  origins.forEach(origin => {
    const entity = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      repo_origin: origin,
      canonical_name: 'Test',
    };
    const result = SaaSNodeDNA.safeParse(entity);
    assert.strictEqual(result.success, true, `Should accept repo_origin: ${origin}`);
  });
});

test('IntentSchema - valid DRAFT intent', () => {
  const valid = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Create Tenant',
    riskLevel: 'Low',
  };
  const result = IntentSchema.safeParse(valid);
  assert.strictEqual(result.success, true, 'Should parse valid DRAFT intent');
});

test('IntentSchema - all valid lifecycle states', () => {
  const states = ['DRAFT', 'PROPOSED', 'VERIFIED', 'EXECUTED', 'COMMITTED'];
  states.forEach(state => {
    const intent = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      repo_origin: 'billing',
      canonical_name: 'Intent',
      lifecycle: state,
      title: 'Test',
      riskLevel: 'Low',
    };
    const result = IntentSchema.safeParse(intent);
    assert.strictEqual(result.success, true, `Should accept lifecycle: ${state}`);
  });
});

test('IntentSchema - all valid riskLevels', () => {
  const risks = ['Low', 'Medium', 'High', 'Critical'];
  risks.forEach(risk => {
    const intent = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      repo_origin: 'billing',
      canonical_name: 'Intent',
      lifecycle: 'DRAFT',
      title: 'Test',
      riskLevel: risk,
    };
    const result = IntentSchema.safeParse(intent);
    assert.strictEqual(result.success, true, `Should accept riskLevel: ${risk}`);
  });
});

test('IntentSchema - invalid riskLevel', () => {
  const invalid = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Test',
    riskLevel: 'InvalidRisk',
  };
  const result = IntentSchema.safeParse(invalid);
  assert.strictEqual(result.success, false, 'Should reject invalid riskLevel');
});

// ===================================================================
// State Machine & Transitions
// ===================================================================

test('State transitions - DRAFT to PROPOSED with evidence', () => {
  const intent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Test',
    riskLevel: 'Low',
    evidenceLinks: ['https://example.com/doc1'],
  };
  const result = verifyStateTransition(intent, 'PROPOSED');
  assert.strictEqual(result.allowed, true, 'DRAFT→PROPOSED with evidence should be allowed');
});

test('State transitions - DRAFT to PROPOSED without evidence (hard-fail)', () => {
  const intent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Test',
    riskLevel: 'Low',
    evidenceLinks: [],
  };
  const result = verifyStateTransition(intent, 'PROPOSED');
  assert.strictEqual(result.allowed, false, 'DRAFT→PROPOSED without evidence should be denied');
  assert.ok(result.reason, 'Should provide denial reason');
});

test('State transitions - DRAFT to EXECUTED directly (hard-fail)', () => {
  const intent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Test',
    riskLevel: 'Low',
  };
  const result = verifyStateTransition(intent, 'EXECUTED');
  assert.strictEqual(result.allowed, false, 'Direct DRAFT→EXECUTED should be denied');
  assert.ok(result.reason.includes('invalid transition'), 'Should mention invalid transition');
});

test('State transitions - VERIFIED to EXECUTED with commitAllowed=true', () => {
  const intent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'VERIFIED',
    title: 'Test',
    riskLevel: 'Low',
    commitAllowed: true,
  };
  const result = verifyStateTransition(intent, 'EXECUTED');
  assert.strictEqual(result.allowed, true, 'VERIFIED→EXECUTED with commitAllowed=true should be allowed');
});

test('State transitions - VERIFIED to EXECUTED with commitAllowed=false (hard-fail)', () => {
  const intent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'VERIFIED',
    title: 'Test',
    riskLevel: 'Low',
    commitAllowed: false,
  };
  const result = verifyStateTransition(intent, 'EXECUTED');
  assert.strictEqual(result.allowed, false, 'VERIFIED→EXECUTED with commitAllowed=false should be denied');
  assert.ok(result.reason.includes('commitAllowed'), 'Should mention commitAllowed requirement');
});

test('State transitions - COMMITTED to any state (hard-fail - immutable)', () => {
  const intent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'COMMITTED',
    title: 'Test',
    riskLevel: 'Low',
  };
  const result = verifyStateTransition(intent, 'DRAFT');
  assert.strictEqual(result.allowed, false, 'COMMITTED→DRAFT should be denied (immutable)');
});

// ===================================================================
// Terminology Registry
// ===================================================================

test('Terminology Registry - resolve alias to canonical', () => {
  const result = resolveTerminology('agent');
  assert.strictEqual(result !== null, true, 'Should resolve "agent" alias');
  assert.strictEqual(result.canonical_name, 'ServicePrincipal', 'Should resolve to ServicePrincipal');
  assert.strictEqual(result.repo_origin, 'auth', 'Should have correct repo_origin');
});

test('Terminology Registry - resolve canonical directly', () => {
  const result = resolveTerminology('Tenant');
  assert.strictEqual(result !== null, true, 'Should resolve canonical name directly');
  assert.strictEqual(result.canonical_name, 'Tenant', 'Should match exactly');
});

test('Terminology Registry - unresolved alias (hard-fail)', () => {
  const result = resolveTerminology('UnknownTerm');
  assert.strictEqual(result, null, 'Should not resolve unknown term');
});

test('Terminology Registry - case-insensitive alias resolution', () => {
  const result1 = resolveTerminology('AGENT');
  const result2 = resolveTerminology('Agent');
  const result3 = resolveTerminology('agent');
  assert.strictEqual(result1?.canonical_name, 'ServicePrincipal', 'Should resolve uppercase');
  assert.strictEqual(result2?.canonical_name, 'ServicePrincipal', 'Should resolve mixed case');
  assert.strictEqual(result3?.canonical_name, 'ServicePrincipal', 'Should resolve lowercase');
});

test('Terminology Registry - >= 10 entities', () => {
  const count = Object.keys(TerminologyRegistry).length;
  assert.ok(count >= 10, `Should have >= 10 entities; found ${count}`);
});

test('Terminology Registry - no polysemy', () => {
  // Build alias map and check for duplicates
  const aliasMap = {};
  let polysemyFound = false;
  Object.values(TerminologyRegistry).forEach(entry => {
    entry.aliases.forEach(alias => {
      const key = alias.toLowerCase();
      if (aliasMap[key] && aliasMap[key] !== entry.canonical_name) {
        polysemyFound = true;
      }
      aliasMap[key] = entry.canonical_name;
    });
  });
  assert.strictEqual(polysemyFound, false, 'Should not have polysemous aliases');
});

// ===================================================================
// Cross-Repo Grants
// ===================================================================

test('Cross-repo grants - same origin allowed', () => {
  const result = checkCrossRepoGrant('billing', 'billing');
  assert.strictEqual(result.allowed, true, 'Same repo mutation should be allowed');
});

test('Cross-repo grants - different origin denied (needs grant)', () => {
  const result = checkCrossRepoGrant('billing', 'auth');
  assert.strictEqual(result.allowed, false, 'Cross-repo mutation without grant should be denied');
  assert.ok(result.reason, 'Should provide denial reason');
});

test('Cross-repo grants - all valid origin pairs', () => {
  const origins = ['billing', 'auth', 'gateway', 'infrastructure'];
  origins.forEach(origin => {
    const result = checkCrossRepoGrant(origin, origin);
    assert.strictEqual(result.allowed, true, `Same-origin (${origin}→${origin}) should be allowed`);
  });
});

test('Cross-repo grants - different origin allowed when grant edge exists', () => {
  const graphState = {
    crossRepoGrants: [
      { from: 'billing', to: 'auth' },
    ],
  };
  const result = checkCrossRepoGrant('billing', 'auth', graphState);
  assert.strictEqual(result.allowed, true, 'Cross-repo mutation with grant should be allowed');
});

test('Cross-repo grants - invalid origin rejected', () => {
  const result = checkCrossRepoGrant('invalid', 'billing');
  assert.strictEqual(result.allowed, false, 'Invalid origin should be rejected');
});

// ===================================================================
// Validator Functions
// ===================================================================

test('validateIntent - valid intent returns data', () => {
  const intent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Test',
    riskLevel: 'Low',
  };
  const result = validateIntent(intent);
  assert.strictEqual(result.valid, true, 'Should validate successfully');
  assert.ok(result.data, 'Should return parsed data');
});

test('validateIntent - invalid intent returns errors', () => {
  const intent = {
    id: 'invalid',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Test',
    riskLevel: 'Low',
  };
  const result = validateIntent(intent);
  assert.strictEqual(result.valid, false, 'Should reject invalid data');
  assert.ok(result.errors && result.errors.length > 0, 'Should provide errors');
});

test('validateSaaSNode - valid node', () => {
  const node = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'auth',
    canonical_name: 'ServicePrincipal',
  };
  const result = validateSaaSNode(node);
  assert.strictEqual(result.valid, true, 'Should validate valid node');
});

test('validateTerminology - valid alias', () => {
  const result = validateTerminology('agent');
  assert.strictEqual(result.valid, true, 'Should resolve valid alias');
});

test('validateTerminology - invalid alias', () => {
  const result = validateTerminology('UnknownTerm');
  assert.strictEqual(result.valid, false, 'Should fail on unknown term');
  assert.ok(result.error, 'Should provide error message');
});

// ===================================================================
// Factory Function (Backward Compatibility)
// ===================================================================

test('createOntologyValidator - SaaSNodeDNA factory', () => {
  const validator = createOntologyValidator('SaaSNodeDNA');
  const node = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Tenant',
  };
  const result = validator(node);
  assert.strictEqual(result.valid, true, 'Factory validator should work');
});

test('createOntologyValidator - IntentSchema factory', () => {
  const validator = createOntologyValidator('IntentSchema');
  const intent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Test',
    riskLevel: 'Low',
  };
  const result = validator(intent);
  assert.strictEqual(result.valid, true, 'Factory validator should work');
});

test('createOntologyValidator - unknown schema type', () => {
  const validator = createOntologyValidator('UnknownType');
  const result = validator({});
  assert.strictEqual(result.valid, false, 'Should fail on unknown schema type');
});

// ===================================================================
// Integration Tests (Multi-step Workflows)
// ===================================================================

test('Integration - full Intent lifecycle (DRAFT → PROPOSED → VERIFIED → EXECUTED → COMMITTED)', () => {
  let intent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Create Tenant',
    riskLevel: 'Medium',
    evidenceLinks: [],
    commitAllowed: false,
  };

  // Step 1: DRAFT (valid)
  const step1 = validateIntent(intent);
  assert.strictEqual(step1.valid, true, 'Step 1: DRAFT should be valid');

  // Step 2: DRAFT → PROPOSED (needs evidence)
  let trans1 = verifyStateTransition(intent, 'PROPOSED');
  assert.strictEqual(trans1.allowed, false, 'Step 2a: Cannot transition without evidence');

  // Add evidence
  intent.evidenceLinks = ['https://example.com/doc1'];
  trans1 = verifyStateTransition(intent, 'PROPOSED');
  assert.strictEqual(trans1.allowed, true, 'Step 2b: Can transition with evidence');
  intent.lifecycle = 'PROPOSED';

  // Step 3: PROPOSED → VERIFIED (guard check would validate evidence path in Phase 2)
  const trans2 = verifyStateTransition(intent, 'VERIFIED');
  assert.strictEqual(trans2.allowed, true, 'Step 3: Can transition to VERIFIED');
  intent.lifecycle = 'VERIFIED';

  // Step 4: VERIFIED → EXECUTED (needs commitAllowed)
  let trans3 = verifyStateTransition(intent, 'EXECUTED');
  assert.strictEqual(trans3.allowed, false, 'Step 4a: Cannot execute without commitAllowed');

  // Set commitAllowed
  intent.commitAllowed = true;
  trans3 = verifyStateTransition(intent, 'EXECUTED');
  assert.strictEqual(trans3.allowed, true, 'Step 4b: Can execute with commitAllowed');
  intent.lifecycle = 'EXECUTED';

  // Step 5: EXECUTED → COMMITTED (needs reasoning trace)
  let trans4 = verifyStateTransition(intent, 'COMMITTED');
  assert.strictEqual(trans4.allowed, false, 'Step 5a: Cannot commit without reasoningTrace');

  // Add reasoning trace
  intent.reasoningTrace = 'All guards passed, executing mutation';
  trans4 = verifyStateTransition(intent, 'COMMITTED');
  assert.strictEqual(trans4.allowed, true, 'Step 5b: Can commit with reasoningTrace');
  intent.lifecycle = 'COMMITTED';

  // Final validation
  const finalValidation = validateIntent(intent);
  assert.strictEqual(finalValidation.valid, true, 'Final: Complete intent should be valid');
});

test('Integration - cross-repo intent workflow', () => {
  const intent = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'DRAFT',
    title: 'Modify Auth Service',
    riskLevel: 'High',
  };

  // Intent is in billing repo but tries to modify auth entity
  const grant = checkCrossRepoGrant(intent.repo_origin, 'auth');
  assert.strictEqual(grant.allowed, false, 'Cross-repo mutation should require CROSS_REPO_GRANT');
});

test('Action guard - verifyMutation denies target mutation without graph evidence state', () => {
  const intent = {
    id: '550e8400-e29b-41d4-a716-446655440011',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'PROPOSED',
    title: 'Modify Service Principal',
    riskLevel: 'High',
    evidenceLinks: ['doc://evidence-1'],
  };

  const targetEntity = {
    canonical_name: 'ServicePrincipal',
    repo_origin: 'auth',
  };

  const result = verifyMutation(intent, targetEntity, null);
  assert.strictEqual(result.allowed, false, 'Should deny target mutation when graph state is missing');
  assert.ok(result.reason.includes('Missing graph evidence path state'), 'Should include guard reason');
});

test('Action guard - verifyMutation allows target mutation with evidence path + grant', () => {
  const intent = {
    id: '550e8400-e29b-41d4-a716-446655440012',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'PROPOSED',
    title: 'Modify Service Principal',
    riskLevel: 'High',
    evidenceLinks: ['doc://evidence-2'],
  };

  const targetEntity = {
    canonical_name: 'ServicePrincipal',
    repo_origin: 'auth',
  };

  const graphState = {
    crossRepoGrants: [{ from: 'billing', to: 'auth' }],
    evidencePaths: [
      {
        intentId: intent.id,
        targetCanonicalName: 'ServicePrincipal',
        targetRepoOrigin: 'auth',
        evidenceLink: 'doc://evidence-2',
      },
    ],
  };

  const result = verifyMutation(intent, targetEntity, graphState);
  assert.strictEqual(result.allowed, true, 'Should allow when evidence path + grant exist');
});

test('Action guard - ToolCallInterceptor returns deterministic block payload', () => {
  const intent = {
    id: '550e8400-e29b-41d4-a716-446655440013',
    repo_origin: 'billing',
    canonical_name: 'Intent',
    lifecycle: 'PROPOSED',
    title: 'Cross origin update',
    riskLevel: 'High',
    evidenceLinks: ['doc://evidence-3'],
  };

  const targetEntity = {
    canonical_name: 'ServicePrincipal',
    repo_origin: 'auth',
  };

  const result = ToolCallInterceptor({
    intent,
    targetEntity,
    graphState: {
      evidencePaths: [
        {
          intentId: intent.id,
          targetCanonicalName: 'ServicePrincipal',
          targetRepoOrigin: 'auth',
          evidenceLink: 'doc://evidence-3',
        },
      ],
      crossRepoGrants: [],
    },
  });

  assert.strictEqual(result.allowed, false, 'Interceptor should block cross repo without grant');
  assert.strictEqual(result.query, CypherTemplates.cross_repo_grant_check, 'Should include deterministic query template');
});

test('Governed glossary - valid glossary fixture passes', () => {
  const glossary = loadFixture('glossary.valid.json');
  const result = validateGlossary(glossary);
  assert.strictEqual(result.valid, true, 'Valid governed glossary should pass');
});

test('Governed glossary - duplicate canonical names hard-fail', () => {
  const glossary = loadFixture('glossary.invalid-duplicate.json');
  const result = validateGlossary(glossary);
  assert.strictEqual(result.valid, false, 'Duplicate canonical names should fail');
  assert.ok(result.errors.some(err => err.includes('Duplicate canonical_name')), 'Should report duplicate canonical_name');
});

test('NL audit - valid fixture resolves candidates', () => {
  const payload = loadFixture('nl-audit.valid.json');
  const glossary = loadFixture('glossary.valid.json');
  const result = auditNaturalLanguageTerms(payload, { glossaryEntries: glossary });

  assert.strictEqual(result.valid, true, 'Valid NL payload should pass audit');
  assert.ok(result.summary.mapped >= 2, 'Should map known terms to canonical glossary');
});

test('NL audit - unresolved candidate term hard-fail', () => {
  const payload = loadFixture('nl-audit.unresolved.json');
  const glossary = loadFixture('glossary.valid.json');
  const result = auditNaturalLanguageTerms(payload, { glossaryEntries: glossary });

  assert.strictEqual(result.valid, false, 'Unresolved candidate terms should fail audit');
  assert.ok(result.unresolvedTerms.includes('GhostEntity'), 'Should report unresolved candidate');
});

test('Ontology contract - valid fixture passes strict validation', () => {
  const contract = loadFixture('contract.valid.json');
  const result = validateOntologyContract(contract);
  assert.strictEqual(result.valid, true, 'Valid ontology contract should pass');
});

test('Ontology contract - unknown node key rejected', () => {
  const contract = loadFixture('contract.invalid-unknown-node-key.json');
  const result = validateOntologyContract(contract);
  assert.strictEqual(result.valid, false, 'Unknown node key should fail strict schema');
  assert.ok(result.errors.some(err => err.includes('Unrecognized key')), 'Should report unrecognized key');
});

test('Ontology contract - invalid edge endpoint rejected', () => {
  const contract = loadFixture('contract.invalid-edge-endpoint.json');
  const result = validateOntologyContract(contract);
  assert.strictEqual(result.valid, false, 'Unknown edge endpoint should fail');
  assert.ok(result.errors.some(err => err.includes('invalid from endpoint GhostNode')), 'Should include endpoint validation message');
});

test('Unknown property rejection matrix - all schemas enforce strict mode', () => {
  const matrix = evaluateUnknownPropertyRejectionMatrix();
  assert.ok(Array.isArray(matrix) && matrix.length >= 3, 'Matrix should include strict-check rows');
  matrix.forEach(row => {
    assert.strictEqual(row.unknownPropertyRejected, true, `Schema must reject unknown properties: ${row.schema}`);
  });
});
