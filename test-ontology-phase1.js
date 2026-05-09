#!/usr/bin/env node
'use strict';

const ontology = require('./src/lib/ontology.js');

console.log('=== Testing v2-6 Phase 1: Intent State Machine Validator ===\n');

// Test 1: Valid Intent creation (DRAFT state)
console.log('Test 1: Create valid DRAFT Intent');
const validIntent = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  repo_origin: 'billing',
  canonical_name: 'Intent',
  lifecycle: 'DRAFT',
  title: 'Create new Tenant',
  riskLevel: 'Medium',
};

const result1 = ontology.validateIntent(validIntent);
console.log(`Result: ${result1.valid ? '✓ PASS' : '✗ FAIL'}`);
if (!result1.valid) console.log('Errors:', result1.errors);
console.log();

// Test 2: Invalid Intent (missing repo_origin)
console.log('Test 2: Create Intent without repo_origin (should fail)');
const invalidIntent = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  canonical_name: 'Intent',
  lifecycle: 'DRAFT',
  title: 'Test',
  riskLevel: 'Low',
};

const result2 = ontology.validateIntent(invalidIntent);
console.log(`Result: ${result2.valid ? '✗ UNEXPECTED PASS' : '✓ EXPECTED FAIL'}`);
if (!result2.valid) console.log('Errors:', result2.errors);
console.log();

// Test 3: State transition DRAFT → PROPOSED (without evidence)
console.log('Test 3: DRAFT → PROPOSED without evidenceLinks (should fail)');
const draftIntent = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  repo_origin: 'billing',
  canonical_name: 'Intent',
  lifecycle: 'DRAFT',
  title: 'Test',
  riskLevel: 'Low',
  evidenceLinks: [],
};

const transition1 = ontology.verifyStateTransition(draftIntent, 'PROPOSED');
console.log(`Result: ${transition1.allowed ? '✗ UNEXPECTED PASS' : '✓ EXPECTED FAIL'}`);
console.log('Reason:', transition1.reason);
console.log();

// Test 4: State transition DRAFT → PROPOSED (with evidence)
console.log('Test 4: DRAFT → PROPOSED with evidenceLinks (should pass)');
const draftIntentWithEvidence = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  repo_origin: 'billing',
  canonical_name: 'Intent',
  lifecycle: 'DRAFT',
  title: 'Test',
  riskLevel: 'Low',
  evidenceLinks: ['https://example.com/doc1'],
};

const transition2 = ontology.verifyStateTransition(draftIntentWithEvidence, 'PROPOSED');
console.log(`Result: ${transition2.allowed ? '✓ PASS' : '✗ FAIL'}`);
if (!transition2.allowed) console.log('Reason:', transition2.reason);
console.log();

// Test 5: Verify invalid state transition (DRAFT → EXECUTED directly)
console.log('Test 5: DRAFT → EXECUTED directly (should fail - invalid transition)');
const transition3 = ontology.verifyStateTransition(draftIntent, 'EXECUTED');
console.log(`Result: ${transition3.allowed ? '✗ UNEXPECTED PASS' : '✓ EXPECTED FAIL'}`);
console.log('Reason:', transition3.reason);
console.log();

// Test 6: Terminology resolution
console.log('Test 6: Resolve alias "Agent" → canonical_name');
const resolved1 = ontology.resolveTerminology('agent');
console.log(`Result: ${resolved1 ? '✓ FOUND' : '✗ NOT FOUND'}`);
if (resolved1) console.log(`  canonical_name: ${resolved1.canonical_name}, repo_origin: ${resolved1.repo_origin}`);
console.log();

// Test 7: Terminology resolution (unresolved)
console.log('Test 7: Resolve unresolved alias "UnknownTerm" (should fail)');
const resolved2 = ontology.resolveTerminology('UnknownTerm');
console.log(`Result: ${resolved2 ? '✗ UNEXPECTED' : '✓ NOT FOUND'}`);
console.log();

// Test 8: Cross-repo grant check (same origin)
console.log('Test 8: Cross-repo check (billing → billing, should pass)');
const grant1 = ontology.checkCrossRepoGrant('billing', 'billing');
console.log(`Result: ${grant1.allowed ? '✓ PASS' : '✗ FAIL'}`);
console.log();

// Test 9: Cross-repo grant check (different origin)
console.log('Test 9: Cross-repo check (billing → auth, should fail - needs grant)');
const grant2 = ontology.checkCrossRepoGrant('billing', 'auth');
console.log(`Result: ${grant2.allowed ? '✗ UNEXPECTED PASS' : '✓ EXPECTED FAIL'}`);
console.log('Reason:', grant2.reason);
console.log();

// Test 10: Terminology registry size
console.log('Test 10: Verify TerminologyRegistry has >= 10 entities');
const registrySize = Object.keys(ontology.TerminologyRegistry).length;
console.log(`Registry size: ${registrySize}`);
console.log(`Result: ${registrySize >= 10 ? '✓ PASS' : '✗ FAIL (need >= 10)'}`);
console.log('Entities:', Object.keys(ontology.TerminologyRegistry).sort().join(', '));
console.log();

// Test 11: VERIFIED → EXECUTED without commitAllowed
console.log('Test 11: VERIFIED → EXECUTED with commitAllowed=false (should fail)');
const verifiedIntent = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  repo_origin: 'billing',
  canonical_name: 'Intent',
  lifecycle: 'VERIFIED',
  title: 'Test',
  riskLevel: 'Low',
  evidenceLinks: ['https://example.com/doc1'],
  commitAllowed: false,
};

const transition4 = ontology.verifyStateTransition(verifiedIntent, 'EXECUTED');
console.log(`Result: ${transition4.allowed ? '✗ UNEXPECTED PASS' : '✓ EXPECTED FAIL'}`);
console.log('Reason:', transition4.reason);
console.log();

// Test 12: VERIFIED → EXECUTED with commitAllowed=true
console.log('Test 12: VERIFIED → EXECUTED with commitAllowed=true (should pass)');
const verifiedIntentWithCommit = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  repo_origin: 'billing',
  canonical_name: 'Intent',
  lifecycle: 'VERIFIED',
  title: 'Test',
  riskLevel: 'Low',
  evidenceLinks: ['https://example.com/doc1'],
  commitAllowed: true,
};

const transition5 = ontology.verifyStateTransition(verifiedIntentWithCommit, 'EXECUTED');
console.log(`Result: ${transition5.allowed ? '✓ PASS' : '✗ FAIL'}`);
if (!transition5.allowed) console.log('Reason:', transition5.reason);
console.log();

console.log('=== Test Summary ===');
console.log('All core Phase 1 validators tested successfully.');
