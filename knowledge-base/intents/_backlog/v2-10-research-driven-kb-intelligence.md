---
slug: v2-10-research-driven-kb-intelligence
title: "KBAgent research-driven KB intelligence — auto-scan repos + persist findings to GraphDB"
description: "Enable KBAgent to autonomously research a repository's real content, infer KB structure and layered architecture, and persist the resulting knowledge graph to GraphDB for queryable visualization."
lifecycle: backlog
priority: "2.5"
blocks: v2-10-kbagent-roadmap-gap-p2-gate-loop-contract
priority: "2.5"
blocks: "v2-10-kbagent-roadmap-gap-p2-gate-loop-contract"
created_at: 2026-05-09T17:30:00.000Z
focus:
  current: "Design-only backlog item pending v2.9 DB+UI bundle completion"
  last_updated: 2026-05-09
  next_action: "Detail requirements during v2.10 planning phase; design AI prompt framework and GraphDB schema extensions"
schema_version: 2.5.1-beta.1
estimate_factors:
  newUncoveredModules: 3
  addedUncoveredLOC: 1500
  addedHighCoupling: 2
  addedTests: 25
---

# Backlog Intent: v2-10-research-driven-kb-intelligence

## Summary

This intent enables KBAgent to **autonomously research** a repository's real content, code patterns, artifacts, and documentation — then persist the resulting knowledge graph to GraphDB (not files) for downstream visualization and querying.

**Key model:**
- Generic template structure is a reference specification (stored in CLI code + docs), not pre-created files
- `kbx init` creates an empty `.kb/` folder (config only, no template files)
- `kbx research` scans the actual repository and AI self-determines KB architecture based on local evidence first
- Findings are persisted to GraphDB as the repo's knowledge graph, not as search-result logs
- `kbx serve` queries GraphDB and renders findings to web UI (via v2-9 bundle)

**What changes:** Templates are no longer static files — they are dynamically inferred per project via AI research loops.

## Goal

1. Eliminate static template files from npm package — reduce bloat, enable per-project customization
2. Enable autonomous KB discovery — AI scans repo, learns architecture, and populates GraphDB with actual content nodes and relations
3. Support multi-layer architectures — enterprise systems often have governance, intelligence, operations layers that need per-layer KB focus
4. Provide confidence-gated research loops — AI self-assesses findings, iterates if uncertain, stops when confident or loop limit reached

## Scope

### 1. Generic Template Reference Structure (no files)

Store template schema as enumerable specification in CLI code and docs:

```json
{
  "sections": [
    {
      "key": "product",
      "label": "Product & Requirements",
      "subsections": [
        "vision", "stakeholders", "requirements", "features", "user-stories",
        "user-flows", "roles-permissions", "acceptance-criteria", "glossary"
      ],
      "priority": "high"
    },
    {
      "key": "architecture",
      "label": "System Architecture",
      "subsections": [
        "context", "containers", "components", "data-model", "data-flow",
        "runtime-flows", "integrations", "deployment", "patterns", "nfr", "decisions"
      ],
      "priority": "high"
    },
    {
      "key": "intelligence",
      "label": "AI/LLM Features",
      "subsections": [
        "ai-features", "ai-architecture", "prompts", "models", "providers",
        "context-sources", "rag", "tools", "agents", "memory", "guardrails",
        "evaluations", "caching", "fallback", "cost-latency", "ai-observability"
      ],
      "priority": "medium"
    },
    {
      "key": "engineering",
      "label": "Engineering & Development",
      "subsections": [
        "repositories", "local-setup", "coding-standards", "branching",
        "code-review", "dependencies", "configuration", "database-migrations", "developer-workflow"
      ],
      "priority": "high"
    },
    {
      "key": "quality",
      "label": "QA/Testing",
      "subsections": [
        "test-strategy", "test-plan", "test-cases", "acceptance-tests",
        "regression-tests", "performance-tests", "security-tests", "ai-evals",
        "defects", "quality-gates"
      ],
      "priority": "medium"
    },
    {
      "key": "operations",
      "label": "Operations & Support",
      "subsections": [
        "runbooks", "monitoring", "logs-metrics-traces", "alerts", "slo-sla",
        "incidents", "maintenance", "known-issues"
      ],
      "priority": "high"
    },
    {
      "key": "security",
      "label": "Security & Compliance",
      "subsections": [
        "security-requirements", "authentication", "authorization", "data-privacy",
        "threat-model", "dependency-vulnerabilities", "audit-logging", "compliance", "ai-safety"
      ],
      "priority": "high"
    },
    {
      "key": "governance",
      "label": "Governance & Decision Making",
      "subsections": [
        "ontology", "entities", "relations", "assertions", "traceability",
        "risks", "technical-debt", "change-log"
      ],
      "priority": "medium"
    }
  ]
}
```

Template is reference only — **each repository may have different priority, depth, or layer focus**.

The template is not a generated project skeleton. It is the prompt-side and CLI-side reference map used to decide what the AI should research and how to classify findings.

### 2. AI Research Engine

**Input:**
- Repository file system (scanned by KBAgent)
- Generic template reference structure
- Optional: existing ontology (v2.6) if available

**Research Loop:**

```
LOOP START (max 5 iterations):

  1. SCAN local artifacts:
     - package.json / pyproject.toml / go.mod (tech stack, dependencies)
     - folder structure (detect /src, /lib, /api, /components patterns)
     - code patterns (imports, common frameworks, libraries)
     - existing docs (README, docs/, architecture files)
     - commit history (domain clues)

  2. EXTRACT findings per template section:
     - product: README + docs/product.* → vision, requirements, glossary
     - architecture: docs/architecture.* + code structure → system context, components
     - intelligence: code searching for AI patterns (LLM calls, RAG, agents) → AI features
     - engineering: src/ structure + build config → tech stack, dev workflow
     - operations: scripts/ + .github/workflows/ → deployment, monitoring
     - ... (per section)

  3. ASSESS confidence per section:
     - confidence = 0-100 (AI self-assessed)
     - low (<60%): insufficient evidence, need more research
     - medium (60-80%): probable, minor gaps
     - high (>80%): strong evidence, ready to persist

  4. SELF-REVIEW uncertain sections:
     - Identify top 3 sections with <70% confidence
    - For each: scan deeper, compare against nearby repo evidence, and let the AI tighten its own conclusion
    - Recalculate confidence

  5. CHECK loop termination:
     - If all sections are confident enough for the AI to justify its conclusion OR iteration >= 5
       → STOP, prepare findings for DB write
     - Else: go to step 1 with refined search strategy

LOOP END
```

**Output per section:**
```json
{
  "section_key": "architecture",
  "findings": {
    "system_context": "Microservices: API Gateway → Auth Service, Product Service, Order Service",
    "tech_stack": ["TypeScript", "Node.js", "Express", "PostgreSQL", "Redis"],
    "deployment": "Kubernetes on AWS EKS",
    "key_concerns": ["Distributed tracing", "Rate limiting", "Circuit breaker pattern"],
    ...
  },
  "confidence": 85,
  "evidence_sources": [
    { "file": "src/", "pattern": "Found 15 service folders" },
    { "file": "docs/architecture.md", "excerpt": "..." },
    { "file": "package.json", "indicator": "Found express, pg, redis" }
  ],
  "research_iterations": 2,
  "ready_for_persistence": true
}
```

### 3. GraphDB Schema Extension (v2.9 augmentation)

GraphDB stores the repo's actual knowledge graph, not a search-result audit trail.

Core nodes in GraphDB:

```cypher
// Node: ResearchSession
CREATE NODE TABLE ResearchSession (
  session_id STRING PRIMARY KEY,
  kb_repo_id STRING,
  timestamp TIMESTAMP,
  status ENUM('in_progress', 'completed', 'partial'),
  final_confidence INT,  // 0-100 overall
  iterations INT,
  total_sections_found INT
);

// Node: TemplateSection (per template section: product, architecture, intelligence, etc.)
CREATE NODE TABLE TemplateSection (
  section_id STRING PRIMARY KEY,
  session_id STRING,  // foreign key to ResearchSession
  section_key STRING,  // "product", "architecture", ...
  section_label STRING,
  confidence INT,  // 0-100 for this section
  findings JSON,  // structured findings object
  evidence_count INT,
  research_notes TEXT
);

// Node: KnowledgeFact (concrete facts extracted from the repo)
CREATE NODE TABLE KnowledgeFact (
  fact_id STRING PRIMARY KEY,
  section_id STRING,  // foreign key to TemplateSection
  fact_key STRING,  // "vision", "requirements", etc.
  content TEXT,
  confidence INT,
  source_evidence STRING[],  // array of evidence file paths
  layer_key STRING  // product, architecture, engineering, etc.
);

// Node: Artifact (source artifacts discovered during research)
CREATE NODE TABLE Artifact (
  evidence_id STRING PRIMARY KEY,
  session_id STRING,
  file_path STRING,
  artifact_type ENUM('code', 'doc', 'config', 'metadata'),
  relevance_to_sections STRING[],  // which sections this evidence supports
  extracted_content TEXT,
  indexing_timestamp TIMESTAMP
);

// Edge: ResearchSession → TemplateSection
CREATE RELATIONSHIP RESEARCHES (
  FROM ResearchSession TO TemplateSection,
  explored_at TIMESTAMP
);

// Edge: TemplateSection → KnowledgeFact
CREATE RELATIONSHIP CONTAINS_FACT (
  FROM TemplateSection TO KnowledgeFact
);

// Edge: TemplateSection → Artifact
CREATE RELATIONSHIP SUPPORTED_BY (
  FROM TemplateSection TO Artifact,
  relevance_score FLOAT  // 0-1
);
```

**Write operation:**
```javascript
// After research loop completes:
const session = {
  session_id: uuid(),
  kb_repo_id: config.repo_id,
  timestamp: now(),
  status: "completed",
  final_confidence: avg_confidence_all_sections,
  iterations: loop_count
};

// Write session → sections → facts → artifacts
for (const section of findings) {
  writeToGraphDB(section);  // node + relationships
}
```

### 4. CLI Commands

New commands:

```bash
# Trigger research loop
kbx research [--repo-path .] [--force] [--max-iterations 5]

# Show research results (query GraphDB)
kbx research show [--section architecture] [--format json|human]

# Update research (run loop again, merge with existing findings)
kbx research update

# Export findings (for external consumption)
kbx research export --format json --output findings.json
```

### 5. AI Prompt Template (lives in CLI docs, not files)

```markdown
# Research Prompt Framework

You are a software architecture researcher. Analyze this repository and populate a knowledge base.

## Generic Template Reference

{insert generic-template.md structure here}

## Task

1. Scan the repository artifacts:
   - Dependencies (package.json, requirements.txt, go.mod, etc.)
   - Folder structure (src/, lib/, api/, components/, etc.)
   - Code patterns (imports, frameworks, abstractions)
   - Existing documentation (README, docs/, ADRs, etc.)
   - Configuration (build, test, deploy setup)

2. For each section in the generic template:
   - Extract relevant findings from artifacts
   - Assess confidence 0-100 for that section
   - Cite evidence sources (file paths, patterns found)

3. Self-review and iterate:
  - If confidence is still too low for a reasonable conclusion → do one more pass
  - Dig deeper into uncertain areas and let the AI self-review
   - Max 5 iterations or until confident

4. Output findings as JSON structured per GraphDB schema

5. Stop when:
   - All sections >= 80% confidence, OR
   - 5 iterations completed

## Output Schema

{insert GraphDB findings structure}
```

### 6. Integration with v2-9 Web UI

Web UI queries GraphDB:

```javascript
// kbx serve (from v2-9) extends to:

app.get('/api/research/sections', async (req, res) => {
  const sections = await graphdb.query(
    'MATCH (s:TemplateSection) RETURN s.section_key, s.confidence, COUNT(s.findings) as fact_count'
  );
  res.json(sections);
});

app.get('/api/research/sections/:sectionKey', async (req, res) => {
  const findings = await graphdb.query(
    'MATCH (s:TemplateSection {section_key: ?}) WITH s MATCH (s)-[:CONTAINS_FACT]->(fact:KnowledgeFact) RETURN fact',
    [req.params.sectionKey]
  );
  res.json(findings);
});

// Web UI page: /research
// Shows: section overview, confidence per section, clickable drill-downs, evidence trails
```

## Non-Scope

- Auto-generating documentation files (findings persist in DB only)
- Network research beyond prompt-guided enrichment (advanced future)
- Multi-language support in research loop (v1 is English-only)
- Automatic KB maintenance (one-time research per init, then manual update)
- GraphDB provisioning (assumes v2-9 DB exists and is configured)

## Axiom Compliance Notes

- **Axiom 1 (Legislative vs Executive):** Research engine is KBAgent layer (Executive), not SVFactory
- **Axiom 3 (Deterministic Block):** Research produces JSON output (machine-readable), no UI inside KBAgent research code
- **Axiom 5 (End-User Invisibility):** Research findings rendered by v2-9 web UI, not by research code itself

## Acceptance Criteria

1. `kbx research` command exists and accepts `--repo-path` and `--max-iterations` flags
2. Research loop completes in <= 5 iterations and outputs findings JSON
3. AI prompt template is embedded in CLI code / docs and is customizable
4. GraphDB schema includes `ResearchSession`, `Section`, `Subsection`, `Evidence` nodes and relationships
5. Findings are persisted to GraphDB with confidence scores per section
6. `kbx research show --section <key>` queries and displays findings from DB
7. Web UI (/research page) queries GraphDB and renders findings with confidence visualization
8. Evidence trail is visible (users can click through to see which files supported which findings)
9. Confidence guidance is visible in UI, but the AI's internal confidence threshold remains prompt-driven rather than hardcoded to a specific number
10. `kbx research update` re-runs loop and merges/replaces findings in DB safely (no data loss)

## Dependencies

- `v2-9-db-and-intent-web-ui` — GraphDB exists and is queryable, `kbx serve` is available
- `v2-6-kb-ontology-foundation` — optional, but research can enrich findings against ontology if present

## Version Lock

| Version | Research Status |
|---|---|
| v2.9 | DB + Web UI ready; research features pending |
| **v2.10** | **Research engine + GraphDB persistence + CLI commands** |
| v2.11+ | Advanced: network doc indexing, multi-layer research, auto-update policies |

## Risk Notes

- AI hallucination: confident but incorrect findings → mitigated by confidence threshold + user review in UI
- Over-research: AI loops forever → mitigated by max 5 iterations + confidence gate
- DB bloat: too many evidence records → mitigated by deduplication + evidence linking strategy
- Repository change detection: KB becomes stale → mitigated by `kbx research update` manual trigger (auto-update is future)



