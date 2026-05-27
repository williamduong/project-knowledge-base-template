'use strict';

/**
 * Compatibility bridge for legacy ontology behavior.
 *
 * Architectural status (2026-05-27):
 * - The real mixed-boundary legacy implementation now lives in `dna/tmp/legacy-ontology.js`.
 * - `src/lib/ontology.js` stays only as a stable import surface while extraction work continues.
 *
 * Why this bridge exists:
 * - current commands, tests, and legacy runtime code still import `src/lib/ontology.js`
 * - we want the outer SVFactory layer to stop *owning* KBX/SaaS worldview semantics
 * - we do not want to break existing call sites while the ontology is being split
 *
 * Source interpretation inputs for this extraction were loaded from:
 * - `template/13-knowledge-graph/ontology-contract.md`
 * - `template/13-knowledge-graph/terminology-registry.md`
 * - `knowledge-base/13-knowledge-graph/README.md`
 * - `knowledge-base/13-knowledge-graph/v2.6-ontology.md`
 * - `knowledge-base/13-knowledge-graph/v2.6-glossary.md`
 * - `knowledge-base/intents/_closed/released/v2-6-kb-ontology-foundation/plan.md`
 * - `knowledge-base/intents/_closed/released/v2-6-kb-ontology-foundation/constraints-summary-for-review.md`
 */

module.exports = require('../../dna/tmp/legacy-ontology');
