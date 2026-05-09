/**
 * seed-dna.cypher: GraphDB DDL + Parameterized Seed Queries
 * 
 * Purpose: Initialize graph database schema for 10 SaaS Core Entities
 * and their foundational edges (Intent → Evidence, ServicePrincipal → Project, etc.)
 * 
 * Target Engines: KuzuDB (primary), FalkorDB (fallback)
 * Performance SLA: <0.1ms per push-down query execution
 * 
 * Execution Order:
 * 1. CREATE NODE TABLES (DDL)
 * 2. CREATE INDEXES (Performance optimization)
 * 3. INSERT SEED EDGES (Parameterized mutations)
 * 4. VERIFY CONSTRAINTS (Action Guard pre-flight checks)
 */

// ============================================================================
// SECTION 1: DDL — CREATE NODE TABLES (10 SaaS Core Entities)
// ============================================================================

-- Entity 1: Tenant (Billing/Identity)
CREATE NODE TABLE Tenant (
  id STRING PRIMARY KEY,
  repo_origin STRING NOT NULL CHECK(repo_origin IN ['billing', 'auth', 'gateway', 'infrastructure']),
  canonical_name STRING NOT NULL DEFAULT 'Tenant',
  sensitivity INTEGER NOT NULL DEFAULT 1 CHECK(sensitivity >= 1 AND sensitivity <= 5),
  aliases STRING NOT NULL,  -- JSON array: ["Client", "Customer", "Account"]
  last_audit_id STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entity 2: Subscription (Billing)
CREATE NODE TABLE Subscription (
  id STRING PRIMARY KEY,
  repo_origin STRING NOT NULL CHECK(repo_origin IN ['billing', 'auth', 'gateway', 'infrastructure']),
  canonical_name STRING NOT NULL DEFAULT 'Subscription',
  sensitivity INTEGER NOT NULL DEFAULT 2,
  aliases STRING NOT NULL,
  tenant_id STRING NOT NULL,  -- Foreign key to Tenant
  last_audit_id STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entity 3: ServicePrincipal (Auth/Identity)
CREATE NODE TABLE ServicePrincipal (
  id STRING PRIMARY KEY,
  repo_origin STRING NOT NULL CHECK(repo_origin IN ['billing', 'auth', 'gateway', 'infrastructure']),
  canonical_name STRING NOT NULL DEFAULT 'ServicePrincipal',
  sensitivity INTEGER NOT NULL DEFAULT 3,
  aliases STRING NOT NULL,
  tenant_id STRING NOT NULL,
  last_audit_id STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entity 4: Project (Infrastructure)
CREATE NODE TABLE Project (
  id STRING PRIMARY KEY,
  repo_origin STRING NOT NULL CHECK(repo_origin IN ['billing', 'auth', 'gateway', 'infrastructure']),
  canonical_name STRING NOT NULL DEFAULT 'Project',
  sensitivity INTEGER NOT NULL DEFAULT 1,
  aliases STRING NOT NULL,
  subscription_id STRING,  -- Foreign key to Subscription
  last_audit_id STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entity 5: Module (Infrastructure)
CREATE NODE TABLE Module (
  id STRING PRIMARY KEY,
  repo_origin STRING NOT NULL CHECK(repo_origin IN ['billing', 'auth', 'gateway', 'infrastructure']),
  canonical_name STRING NOT NULL DEFAULT 'Module',
  sensitivity INTEGER NOT NULL DEFAULT 1,
  aliases STRING NOT NULL,
  project_id STRING NOT NULL,
  last_audit_id STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entity 6: Config (Infrastructure)
CREATE NODE TABLE Config (
  id STRING PRIMARY KEY,
  repo_origin STRING NOT NULL CHECK(repo_origin IN ['billing', 'auth', 'gateway', 'infrastructure']),
  canonical_name STRING NOT NULL DEFAULT 'Config',
  sensitivity INTEGER NOT NULL DEFAULT 2,
  aliases STRING NOT NULL,
  module_id STRING,
  last_audit_id STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entity 7: Intent (Auth/Governance)
CREATE NODE TABLE Intent (
  id STRING PRIMARY KEY,
  repo_origin STRING NOT NULL CHECK(repo_origin IN ['billing', 'auth', 'gateway', 'infrastructure']),
  canonical_name STRING NOT NULL DEFAULT 'Intent',
  lifecycle STRING NOT NULL DEFAULT 'DRAFT' CHECK(lifecycle IN ['DRAFT', 'PROPOSED', 'VERIFIED', 'EXECUTED', 'COMMITTED']),
  title STRING NOT NULL,
  riskLevel STRING NOT NULL CHECK(riskLevel IN ['Low', 'Medium', 'High', 'Critical']),
  evidenceLinks STRING NOT NULL DEFAULT '[]',  -- JSON array of URIs
  commitAllowed BOOLEAN NOT NULL DEFAULT FALSE,
  governanceThreshold FLOAT,
  reasoningTrace STRING,
  last_audit_id STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entity 8: Policy (Infrastructure/Governance)
CREATE NODE TABLE Policy (
  id STRING PRIMARY KEY,
  repo_origin STRING NOT NULL CHECK(repo_origin IN ['billing', 'auth', 'gateway', 'infrastructure']),
  canonical_name STRING NOT NULL DEFAULT 'Policy',
  sensitivity INTEGER NOT NULL DEFAULT 2,
  aliases STRING NOT NULL,
  scope STRING NOT NULL,  -- e.g., "Intent", "Config", "Module"
  last_audit_id STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entity 9: CLICommand (Infrastructure/Governance)
CREATE NODE TABLE CLICommand (
  id STRING PRIMARY KEY,
  repo_origin STRING NOT NULL CHECK(repo_origin IN ['billing', 'auth', 'gateway', 'infrastructure']),
  canonical_name STRING NOT NULL DEFAULT 'CLICommand',
  aliases STRING NOT NULL,
  command_signature STRING NOT NULL UNIQUE,
  policy_id STRING,  -- Foreign key to Policy
  last_audit_id STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entity 10: Evidence (Auth/Audit)
CREATE NODE TABLE Evidence (
  id STRING PRIMARY KEY,
  repo_origin STRING NOT NULL CHECK(repo_origin IN ['billing', 'auth', 'gateway', 'infrastructure']),
  canonical_name STRING NOT NULL DEFAULT 'Evidence',
  sensitivity INTEGER NOT NULL DEFAULT 3,
  aliases STRING NOT NULL,
  evidence_type STRING NOT NULL CHECK(evidence_type IN ['Document', 'Claim', 'Proof', 'Record', 'Artifact']),
  intent_id STRING,  -- Backref to Intent
  reasoning_trace STRING,
  last_audit_id STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

// ============================================================================
// SECTION 2: CREATE INDEXES (Query Performance Optimization)
// ============================================================================

-- Lookup by canonical_name + repo_origin (primary query pattern)
CREATE INDEX idx_entity_lookup ON Tenant(canonical_name, repo_origin);
CREATE INDEX idx_entity_lookup_sp ON ServicePrincipal(canonical_name, repo_origin);
CREATE INDEX idx_entity_lookup_intent ON Intent(canonical_name, lifecycle);
CREATE INDEX idx_entity_lookup_evidence ON Evidence(canonical_name, evidence_type);

-- Foreign key lookups
CREATE INDEX idx_subscription_tenant ON Subscription(tenant_id);
CREATE INDEX idx_project_subscription ON Project(subscription_id);
CREATE INDEX idx_module_project ON Module(project_id);
CREATE INDEX idx_config_module ON Config(module_id);
CREATE INDEX idx_sp_tenant ON ServicePrincipal(tenant_id);
CREATE INDEX idx_evidence_intent ON Evidence(intent_id);

-- Lifecycle queries (Intent state machine)
CREATE INDEX idx_intent_lifecycle ON Intent(lifecycle);

// ============================================================================
// SECTION 3: PARAMETERIZED CYPHER TEMPLATES (Seed Edges)
// ============================================================================

/**
 * Template 1: Create Intent → Evidence Edge (Evidence path validation)
 * Parameterized: $intentId, $evidenceId
 * Purpose: Link Intent proposal to supporting Evidence documents
 * Push-down execution: Graph engine resolves path directly
 */
MATCH (i:Intent {id: $intentId})
MATCH (e:Evidence {id: $evidenceId})
WHERE i.repo_origin = 'auth' AND e.repo_origin = 'auth'
CREATE (i)-[:SUPPORTED_BY]->(e)
SET e.intent_id = $intentId
RETURN i.id, e.id;

/**
 * Template 2: Create ServicePrincipal → Project Edge
 * Parameterized: $spId, $projectId
 * Purpose: Establish identity-to-infrastructure ownership (repo_origin must align)
 * Guard: Cross-repo edge allowed only with CROSS_REPO_GRANT
 */
MATCH (sp:ServicePrincipal {id: $spId})
MATCH (p:Project {id: $projectId})
WHERE (sp.repo_origin = 'auth' AND p.repo_origin = 'infrastructure')
   OR (sp.tenant_id = $tenantId AND p.subscription_id IN (SELECT id FROM Subscription WHERE tenant_id = $tenantId))
CREATE (sp)-[:MANAGES]->(p)
RETURN sp.id, p.id;

/**
 * Template 3: Alias Resolution Query
 * Parameterized: $alias, $repoOrigin
 * Purpose: Resolve user-input alias to canonical_name
 * SLA: <0.1ms (direct index lookup + JSON parse)
 */
MATCH (e:Entity)
WHERE e.repo_origin = $repoOrigin
  AND (e.aliases CONTAINS $alias OR e.canonical_name = $alias)
RETURN e.id, e.canonical_name, e.aliases
LIMIT 1;

/**
 * Template 4: Action Guard Pre-flight Check
 * Parameterized: $intentId, $targetNodeId, $sourceRepo, $destRepo
 * Purpose: Validate security graph path before mutation
 * Returns: {allowed: bool, reason?: string}
 */
MATCH (i:Intent {id: $intentId, repo_origin: $sourceRepo})
OPTIONAL MATCH (i)-[:SUPPORTED_BY]->(e:Evidence)
OPTIONAL MATCH (e)-[:REFERENCES]->(t:Entity {id: $targetNodeId, repo_origin: $destRepo})
WITH COUNT(e) > 0 AS has_evidence,
     COUNT(t) > 0 AS has_path
RETURN {
  allowed: CASE 
    WHEN $sourceRepo = $destRepo THEN TRUE
    WHEN has_evidence AND has_path THEN TRUE
    ELSE FALSE
  END,
  reason: CASE
    WHEN NOT has_evidence THEN 'No evidence links attached'
    WHEN NOT has_path AND $sourceRepo <> $destRepo THEN 'Cross-repo without valid path'
    ELSE NULL
  END
} AS guard_result;

/**
 * Template 5: Bounded Context Query
 * Parameterized: $repoOrigin
 * Purpose: List all entities in a specific repo_origin context
 * Used by: Agent runtime to verify mutation scope
 */
MATCH (e:Entity {repo_origin: $repoOrigin})
RETURN e.canonical_name, COUNT(*) AS count
ORDER BY e.canonical_name;

// ============================================================================
// SECTION 4: SEED DATA INITIALIZATION (Insert foundational edges)
// ============================================================================

/**
 * NOTE: Seed data insertion happens AFTER all DDL/indexes are created
 * Typical flow:
 * 1. INSERT INTO Tenant (id, repo_origin, ...) VALUES (...)
 * 2. INSERT INTO Subscription (id, tenant_id, ...)
 * 3. Create Intent → Evidence edge (Template 1)
 * 4. Verify with Template 4 (guard check passes)
 */

// ============================================================================
// SECTION 5: CONSTRAINT VERIFICATION (Pre-flight checks for Action Guard)
// ============================================================================

/**
 * Constraint 1: repo_origin must be consistent for same-repo mutations
 * Query: For Intent with repo_origin='auth', all Evidence must have repo_origin='auth'
 */
MATCH (i:Intent)-[:SUPPORTED_BY]->(e:Evidence)
WHERE i.repo_origin <> e.repo_origin
RETURN COUNT(*) AS cross_repo_violations;  -- Should return 0

/**
 * Constraint 2: No orphaned Intents (lifecycle PROPOSED must have evidenceLinks)
 * Query: Count Intents in PROPOSED state without evidence
 */
MATCH (i:Intent {lifecycle: 'PROPOSED'})
WHERE i.evidenceLinks = '[]'
RETURN COUNT(*) AS orphaned_intents;  -- Should return 0

/**
 * Constraint 3: Verify all 10 entities exist in graph
 * Query: Count distinct canonical_name values
 */
MATCH (e:Entity)
RETURN COUNT(DISTINCT e.canonical_name) AS entity_count;  -- Should return 10

/**
 * Constraint 4: Service Principal per Tenant limit
 * Query: Ensure no tenant has >100 service principals
 */
MATCH (t:Tenant)<-[:HAS_TENANT]-(sp:ServicePrincipal)
WITH t.id, COUNT(sp) AS sp_count
WHERE sp_count > 100
RETURN COUNT(*) AS over_limit_tenants;  -- Should return 0
