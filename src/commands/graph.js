'use strict';

const fs   = require('fs');
const path = require('path');

const { resolveExistingState } = require('../lib/context');
const { exportGraph, checkGraph, buildGraphData } = require('../lib/graph');
const { exportGraphIngest } = require('../lib/rule-lifecycle');
const { listIntentRecords } = require('../lib/intent');
const { selectApplicableRules } = require('./dispatch');

const VALID_LANES = new Set(['rules', 'intents', 'source']);
const WORKFLOW_LIFECYCLE_STATES = new Set(['backlog', 'active', 'closed', 'archived']);
const ONTOLOGY_LIFECYCLE_STATES = new Set(['DRAFT', 'PROPOSED', 'VERIFIED', 'EXECUTED', 'COMMITTED']);

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

function parseArgs(args) {
  const options = {
    sub: null,
    output: null,
    lane: null,
    format: null,
    json: false,
    cwd: null,
  };

  const rest = [];
  for (let i = 0; i < (args || []).length; i += 1) {
    const arg = args[i];
    if (arg === '--json') { options.json = true; continue; }
    if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length).trim();
      continue;
    }
    if (arg.startsWith('--lane=')) {
      options.lane = arg.slice('--lane='.length).trim();
      continue;
    }
    if (arg.startsWith('--format=')) {
      options.format = arg.slice('--format='.length).trim().toLowerCase();
      continue;
    }
    if (arg.startsWith('--out=')) {
      options.output = arg.slice('--out='.length).trim();
      continue;
    }
    if (arg === '--output' || arg === '-o') {
      options.output = args[++i];
      continue;
    }
    if (arg === '--out') {
      options.output = args[++i];
      continue;
    }
    if (arg === '--lane') {
      options.lane = args[++i];
      continue;
    }
    if (arg === '--format') {
      options.format = String(args[++i] || '').trim().toLowerCase();
      continue;
    }
    if (arg.startsWith('--cwd=')) {
      options.cwd = arg.slice('--cwd='.length).trim();
      continue;
    }
    if (!arg.startsWith('--')) {
      rest.push(arg);
      continue;
    }
    throw new Error(`Unknown graph option "${arg}". Run "kbx graph help" for usage.`);
  }

  if (rest.length === 0) {
    throw new Error('kbx graph requires a subcommand: export | lane | check | help');
  }
  options.sub = rest[0];

  if (options.sub === 'lane' || options.sub === 'export-lane') {
    options.sub = 'export';
    if (!options.lane) {
      options.lane = rest[1] || null;
    }
  } else if (options.sub === 'export' && !options.lane && rest[1]) {
    options.lane = rest[1];
  }

  if (options.lane && !VALID_LANES.has(options.lane)) {
    throw new Error(`Invalid lane "${options.lane}". Allowed: rules, intents, source`);
  }

  if (options.format && options.format !== 'json') {
    throw new Error(`Invalid format "${options.format}". Allowed: json`);
  }

  return options;
}

// ---------------------------------------------------------------------------
// Subcommand: export
// ---------------------------------------------------------------------------

function resolveLaneOutputPath(contentRoot, lane) {
  return path.join(contentRoot, '.kb', 'graph-ingest', `${lane}.json`);
}

function parseDependsOn(meta) {
  const raw = meta && meta.depends_on;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === 'string') {
    return raw.split(',').map((part) => part.trim()).filter(Boolean);
  }
  return [];
}

function validateIntentLifecycleDomains(properties, { nodeId = 'unknown', laneName = 'intents' } = {}) {
  const props = properties && typeof properties === 'object' ? properties : {};

  if (Object.prototype.hasOwnProperty.call(props, 'lifecycle')) {
    throw new Error(
      `${laneName} lane intent node "${nodeId}" uses legacy "lifecycle" field. ` +
      'Use "workflow_lifecycle" and "ontology_lifecycle" explicitly.'
    );
  }

  const workflow = props.workflow_lifecycle;
  const ontology = props.ontology_lifecycle;

  if (workflow !== undefined && workflow !== null) {
    if (ONTOLOGY_LIFECYCLE_STATES.has(workflow)) {
      throw new Error(
        `${laneName} lane intent node "${nodeId}" has ontology lifecycle "${workflow}" in workflow_lifecycle.`
      );
    }
    if (!WORKFLOW_LIFECYCLE_STATES.has(workflow)) {
      throw new Error(
        `${laneName} lane intent node "${nodeId}" has invalid workflow_lifecycle "${workflow}". ` +
        `Allowed: ${Array.from(WORKFLOW_LIFECYCLE_STATES).join(', ')}`
      );
    }
  }

  if (ontology !== undefined && ontology !== null) {
    if (WORKFLOW_LIFECYCLE_STATES.has(ontology)) {
      throw new Error(
        `${laneName} lane intent node "${nodeId}" has workflow lifecycle "${ontology}" in ontology_lifecycle.`
      );
    }
    if (!ONTOLOGY_LIFECYCLE_STATES.has(ontology)) {
      throw new Error(
        `${laneName} lane intent node "${nodeId}" has invalid ontology_lifecycle "${ontology}". ` +
        `Allowed: ${Array.from(ONTOLOGY_LIFECYCLE_STATES).join(', ')}`
      );
    }
  }

  if (!Object.prototype.hasOwnProperty.call(props, 'workflow_lifecycle')) {
    throw new Error(
      `${laneName} lane intent node "${nodeId}" is missing required workflow_lifecycle field.`
    );
  }

  return {
    workflow_lifecycle: workflow ?? null,
    ontology_lifecycle: ontology ?? null,
  };
}

function buildIntentsLanePayload(contentRoot) {
  const records = listIntentRecords(contentRoot);
  const nodes = [];
  const edges = [];

  for (const record of records) {
    const intentId = String(record.id || record.folderName || 'unknown');
    nodes.push({
      id: `intent:${intentId}`,
      type: 'Intent',
      properties: {
        id: intentId,
        slug: record.slug || null,
        scope: record.scope,
        workflow_lifecycle: record.lifecycle,
        ontology_lifecycle: null,
        close_type: record.closeType || null,
      },
    });

    const dependencies = parseDependsOn(record.meta || {});
    for (const dep of dependencies) {
      edges.push({
        type: 'INTENT_DEPENDS_ON',
        from: `intent:${dep}`,
        to: `intent:${intentId}`,
        properties: {
          dependency: dep,
        },
      });
    }
  }

  return {
    format: 'graph-ingest-v1',
    lane: 'intents',
    exported_at: new Date().toISOString(),
    nodes,
    edges,
    stats: {
      intent_count: nodes.length,
      dependency_count: edges.length,
      node_count: nodes.length,
      edge_count: edges.length,
    },
  };
}

function buildSourceLanePayload(contentRoot) {
  const { entities, relations } = buildGraphData(contentRoot);
  const nodes = entities.map((entity) => ({
    id: entity.id,
    type: 'SourceEntity',
    properties: {
      kind: entity.kind,
      source_path: entity.source_path,
      status: entity.status,
      updated_at: entity.updated_at,
    },
  }));

  const edges = relations.map((relation) => ({
    type: relation.type,
    from: relation.from_id,
    to: relation.to_id,
    properties: {
      relation_id: relation.id,
      direction: relation.direction,
      source: relation.source,
      updated_at: relation.updated_at,
    },
  }));

  return {
    format: 'graph-ingest-v1',
    lane: 'source',
    exported_at: new Date().toISOString(),
    nodes,
    edges,
    stats: {
      entity_count: entities.length,
      relation_count: relations.length,
      node_count: nodes.length,
      edge_count: edges.length,
    },
  };
}

function buildLanePayload(workspaceRoot, contentRoot, lane) {
  if (lane === 'rules') {
    const payload = exportGraphIngest(workspaceRoot, { includeHistory: true });
    return { ...payload, lane: 'rules' };
  }
  if (lane === 'intents') {
    return buildIntentsLanePayload(contentRoot);
  }
  if (lane === 'source') {
    return buildSourceLanePayload(contentRoot);
  }
  throw new Error(`Unsupported lane "${lane}"`);
}

function writeLanePayload(outputPath, payload) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
}

function runExport(workspaceRoot, contentRoot, options) {
  if (!options.lane && options.format === 'json') {
    const outputPath = options.output
      ? path.resolve(options.output)
      : path.join(workspaceRoot, '.kbx-graph', 'latest.json');

    const payload = buildFrontendGraphExport(workspaceRoot, contentRoot);
    writeLanePayload(outputPath, payload);

    if (options.json) {
      console.log(JSON.stringify({
        ok: true,
        command: 'kbx graph export',
        format: 'json',
        output: outputPath,
        schema_version: payload.schema_version,
        node_count: payload.stats.node_count,
        edge_count: payload.stats.edge_count,
        node_type_counts: payload.stats.node_type_counts,
        edge_type_counts: payload.stats.edge_type_counts,
        missing_data_lanes: payload.missing_data_lanes,
        validation: payload.validation,
      }));
      return;
    }

    const relOut = path.relative(process.cwd(), outputPath);
    console.log(`Graph export (frontend json) -> ${relOut}`);
    console.log(`  nodes=${payload.stats.node_count} edges=${payload.stats.edge_count}`);
    return;
  }

  if (options.lane) {
    const outputPath = options.output ? path.resolve(options.output) : resolveLaneOutputPath(contentRoot, options.lane);
    const payload = buildLanePayload(workspaceRoot, contentRoot, options.lane);
    writeLanePayload(outputPath, payload);

    if (options.json) {
      console.log(JSON.stringify({
        ok: true,
        command: 'kbx graph export',
        format: payload.format,
        lane: options.lane,
        output: outputPath,
        stats: payload.stats,
      }));
      return;
    }

    const relOut = path.relative(process.cwd(), outputPath);
    console.log(`Graph ingest exported (${options.lane}) -> ${relOut}`);
    return;
  }

  const { entities, relations, jsonl } = exportGraph(contentRoot, options.output || null);

  if (options.output) {
    const relOut = path.relative(process.cwd(), options.output);
    if (options.json) {
      console.log(JSON.stringify({
        ok: true,
        output: options.output,
        entity_count: entities.length,
        relation_count: relations.length,
      }));
    } else {
      console.log(`Graph exported: ${entities.length} entities, ${relations.length} relations → ${relOut}`);
    }
  } else {
    // Stdout mode: print JSONL directly
    process.stdout.write(jsonl);
  }
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readJsonLinesIfExists(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function deriveTupleFromClassification(classification) {
  const targetScope = String(classification.target_scope || 'docs');
  const mutationClass = String(classification.mutation_class || 'docs-only');
  const intentType = String(classification.intent_type || 'update');

  const ontologyEntity = targetScope === 'rules'
    ? 'Rule'
    : (targetScope === 'source' || targetScope === 'package' ? 'Module' : 'Artifact');

  let riskLevel = 'low';
  if (mutationClass === 'contract-changing') riskLevel = 'medium';
  if (mutationClass === 'source-changing' || mutationClass === 'release-changing') riskLevel = 'high';

  const evidenceState = mutationClass === 'read-only' || mutationClass === 'docs-only' ? 'sufficient' : 'partial';

  return {
    intent_type: intentType,
    intent_state: 'active',
    ontology_entity: ontologyEntity,
    target_scope: targetScope,
    mutation_class: mutationClass,
    risk_level: riskLevel,
    evidence_state: evidenceState,
    actor_mode: 'agent-assisted',
  };
}

function addNode(store, node) {
  if (!node || !node.id) return;
  if (!store.nodesById.has(node.id)) {
    store.nodesById.set(node.id, node);
  }
}

function addEdge(store, edge) {
  if (!edge || !edge.type || !edge.from || !edge.to) return;
  const key = `${edge.type}|${edge.from}|${edge.to}|${JSON.stringify(edge.properties || {})}`;
  if (!store.edgeKeys.has(key)) {
    store.edgeKeys.add(key);
    store.edges.push(edge);
  }
}

function importLanePayload(store, laneName, payload) {
  if (!payload || !Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) return;

  for (const node of payload.nodes) {
    if (laneName === 'source') {
      addNode(store, {
        id: node.id,
        type: 'Artifact',
        properties: {
          lane: laneName,
          source_type: node.type,
          ...(node.properties || {}),
        },
      });
      continue;
    }

    if (laneName === 'rules' && node.type !== 'Rule') {
      addNode(store, {
        id: node.id,
        type: 'Artifact',
        properties: {
          lane: laneName,
          source_type: node.type,
          ...(node.properties || {}),
        },
      });
      continue;
    }

    if (laneName === 'intents' && node.type === 'Intent') {
      const validated = validateIntentLifecycleDomains(node.properties || {}, { nodeId: node.id, laneName });
      addNode(store, {
        id: node.id,
        type: node.type,
        properties: {
          lane: laneName,
          ...(node.properties || {}),
          workflow_lifecycle: validated.workflow_lifecycle,
          ontology_lifecycle: validated.ontology_lifecycle,
        },
      });
      continue;
    }

    addNode(store, {
      id: node.id,
      type: node.type,
      properties: {
        lane: laneName,
        ...(node.properties || {}),
      },
    });
  }

  for (const edge of payload.edges) {
    addEdge(store, {
      type: edge.type,
      from: edge.from,
      to: edge.to,
      properties: {
        lane: laneName,
        ...(edge.properties || {}),
      },
    });
  }
}

function addApplyAuditGraph(store, contentRoot) {
  const applyRoot = path.join(contentRoot, '.kb', 'apply');
  const receiptsRoot = path.join(applyRoot, 'receipts');
  const ledgerPath = path.join(applyRoot, 'ledger.jsonl');

  const ledger = readJsonLinesIfExists(ledgerPath);
  const receiptFiles = fs.existsSync(receiptsRoot)
    ? fs.readdirSync(receiptsRoot).filter((name) => name.endsWith('.json')).sort()
    : [];

  const unassignedIntentId = 'intent:unassigned';
  addNode(store, {
    id: unassignedIntentId,
    type: 'Intent',
    properties: {
      id: 'unassigned',
      title: 'Unassigned audit intent context',
      source: 'apply-audit',
    },
  });

  receiptFiles.forEach((name, index) => {
    const abs = path.join(receiptsRoot, name);
    const receipt = readJsonIfExists(abs);
    if (!receipt) return;

    const runId = `run:apply:${index + 1}`;
    const decisionId = `decision:apply:${index + 1}`;
    const resultId = `result:apply:${index + 1}`;
    const artifactId = `artifact:receipt:${name}`;

    addNode(store, {
      id: runId,
      type: 'Run',
      properties: {
        command: 'kbx apply',
        applied_at: receipt.applied_at || null,
        request: receipt.request || null,
        status: receipt.status || null,
      },
    });

    addNode(store, {
      id: decisionId,
      type: 'Decision',
      properties: {
        request: receipt.request || null,
        classification: receipt.classification || {},
        fallback_or_escalation: receipt.suggestion ? receipt.suggestion.fallback_or_escalation : null,
      },
    });

    addNode(store, {
      id: resultId,
      type: 'Result',
      properties: {
        status: receipt.status || 'unknown',
      },
    });

    addNode(store, {
      id: artifactId,
      type: 'Artifact',
      properties: {
        path: `.kb/apply/receipts/${name}`,
        format: receipt.schema || null,
      },
    });

    addEdge(store, { type: 'INTENT_RUN', from: unassignedIntentId, to: runId, properties: {} });
    addEdge(store, { type: 'RUN_DECISION', from: runId, to: decisionId, properties: {} });
    addEdge(store, { type: 'RUN_RESULT', from: runId, to: resultId, properties: {} });
    addEdge(store, { type: 'RUN_ARTIFACT', from: runId, to: artifactId, properties: {} });

    const pipe = receipt.suggestion && receipt.suggestion.primary_pipe;
    if (pipe) {
      const pipeId = `pipe:${pipe}`;
      addNode(store, {
        id: pipeId,
        type: 'Pipe',
        properties: {
          name: pipe,
        },
      });
      addEdge(store, { type: 'DECISION_PIPE', from: decisionId, to: pipeId, properties: {} });
    }

    const tuple = deriveTupleFromClassification(receipt.classification || {});
    const selected = selectApplicableRules(tuple);
    for (const ruleIdRaw of selected.applicable_rules || []) {
      const ruleId = String(ruleIdRaw);
      const ruleNodeId = ruleId.startsWith('rule:') ? ruleId : `rule:${ruleId}`;
      addNode(store, {
        id: ruleNodeId,
        type: 'Rule',
        properties: {
          rule_id: ruleId,
          source: 'derived-from-apply-audit',
        },
      });
      addEdge(store, { type: 'DECISION_RULE', from: decisionId, to: ruleNodeId, properties: {} });
    }

    const requiredGates = receipt.suggestion && Array.isArray(receipt.suggestion.required_gates)
      ? receipt.suggestion.required_gates
      : [];

    for (const gateNameRaw of requiredGates) {
      const gateName = String(gateNameRaw);
      const gateId = `gate:${gateName}`;
      const evidenceId = `evidence:${name}:${gateName}`;

      addNode(store, {
        id: gateId,
        type: 'Gate',
        properties: {
          gate_id: gateName,
          status: 'pass',
          source: 'apply-audit',
        },
      });

      addNode(store, {
        id: evidenceId,
        type: 'Evidence',
        properties: {
          source_artifact: `.kb/apply/receipts/${name}`,
          gate_id: gateName,
        },
      });

      addEdge(store, { type: 'DECISION_GATE', from: decisionId, to: gateId, properties: { status: 'pass' } });
      addEdge(store, { type: 'GATE_EVIDENCE', from: gateId, to: evidenceId, properties: {} });
    }

    const fallback = receipt.suggestion ? receipt.suggestion.fallback_or_escalation : null;
    if (fallback === 'HumanGateRequired') {
      const humanGateId = `human-gate:${index + 1}`;
      addNode(store, {
        id: humanGateId,
        type: 'HumanGate',
        properties: {
          reason: fallback,
          source: 'apply-audit',
        },
      });
      addEdge(store, { type: 'DECISION_HUMAN_GATE', from: decisionId, to: humanGateId, properties: {} });
    }
  });

  if (ledger.length > 0) {
    addNode(store, {
      id: 'artifact:apply-ledger',
      type: 'Artifact',
      properties: {
        path: '.kb/apply/ledger.jsonl',
        record_count: ledger.length,
      },
    });
  }
}

function addDispatchFixtureDerivedGraph(store, workspaceRoot) {
  const fixturesDir = path.join(workspaceRoot, 'template', '15-governance', 'fixtures', 'dispatch-cases');
  if (!fs.existsSync(fixturesDir) || !fs.statSync(fixturesDir).isDirectory()) {
    return;
  }

  const files = fs.readdirSync(fixturesDir)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
    .sort();

  for (const fileName of files) {
    const abs = path.join(fixturesDir, fileName);
    const raw = fs.readFileSync(abs, 'utf8');

    let tuple = null;
    let expected = null;
    let caseId = fileName.replace(/\.ya?ml$/i, '');
    try {
      const yaml = require('js-yaml');
      const parsed = yaml.load(raw);
      if (!parsed || typeof parsed !== 'object') continue;
      tuple = parsed.dispatch_tuple;
      expected = parsed.expected_output;
      if (!tuple || !expected) continue;
      if (parsed.case_id) caseId = String(parsed.case_id);
    } catch {
      continue;
    }

    const intentId = `intent:dispatch:${caseId}`;
    const runId = `run:dispatch:${caseId}`;
    const decisionId = `decision:dispatch:${caseId}`;
    const resultId = `result:dispatch:${caseId}`;
    const artifactId = `artifact:fixture:${fileName}`;

    addNode(store, {
      id: intentId,
      type: 'Intent',
      properties: {
        id: caseId,
        source: 'dispatch-fixture',
      },
    });

    addNode(store, {
      id: runId,
      type: 'Run',
      properties: {
        command: 'kbx dispatch',
        fixture: `template/15-governance/fixtures/dispatch-cases/${fileName}`,
        source: 'dispatch-fixture',
      },
    });

    addNode(store, {
      id: decisionId,
      type: 'Decision',
      properties: {
        source: 'dispatch-fixture',
        dispatch_tuple: tuple,
        fallback_or_escalation: expected && expected.fallback_or_escalation ? expected.fallback_or_escalation : null,
      },
    });

    addNode(store, {
      id: resultId,
      type: 'Result',
      properties: {
        source: 'dispatch-fixture',
        status: expected && expected.fallback_or_escalation ? 'escalated' : 'pass',
      },
    });

    addNode(store, {
      id: artifactId,
      type: 'Artifact',
      properties: {
        path: `template/15-governance/fixtures/dispatch-cases/${fileName}`,
        source: 'dispatch-fixture',
      },
    });

    addEdge(store, { type: 'INTENT_RUN', from: intentId, to: runId, properties: { source: 'dispatch-fixture' } });
    addEdge(store, { type: 'RUN_DECISION', from: runId, to: decisionId, properties: { source: 'dispatch-fixture' } });
    addEdge(store, { type: 'RUN_RESULT', from: runId, to: resultId, properties: { source: 'dispatch-fixture' } });
    addEdge(store, { type: 'RUN_ARTIFACT', from: runId, to: artifactId, properties: { source: 'dispatch-fixture' } });

    if (expected && expected.primary_pipe) {
      const pipeId = `pipe:${expected.primary_pipe}`;
      addNode(store, {
        id: pipeId,
        type: 'Pipe',
        properties: {
          name: expected.primary_pipe,
          source: 'dispatch-fixture',
        },
      });
      addEdge(store, { type: 'DECISION_PIPE', from: decisionId, to: pipeId, properties: { source: 'dispatch-fixture' } });
    }

    const rules = expected && Array.isArray(expected.applicable_rules) ? expected.applicable_rules : [];
    for (const ruleRaw of rules) {
      const ruleId = String(ruleRaw);
      const ruleNodeId = ruleId.startsWith('rule:') ? ruleId : `rule:${ruleId}`;
      addNode(store, {
        id: ruleNodeId,
        type: 'Rule',
        properties: {
          rule_id: ruleId,
          source: 'dispatch-fixture',
        },
      });
      addEdge(store, { type: 'DECISION_RULE', from: decisionId, to: ruleNodeId, properties: { source: 'dispatch-fixture' } });
    }

    const gates = expected && Array.isArray(expected.required_gates) ? expected.required_gates : [];
    const gateStatus = expected && expected.fallback_or_escalation ? 'fail' : 'pass';
    for (const gateRaw of gates) {
      const gateName = String(gateRaw);
      const gateId = `gate:${gateName}`;
      const evidenceId = `evidence:${caseId}:${gateName}`;

      addNode(store, {
        id: gateId,
        type: 'Gate',
        properties: {
          gate_id: gateName,
          status: gateStatus,
          source: 'dispatch-fixture',
        },
      });

      addNode(store, {
        id: evidenceId,
        type: 'Evidence',
        properties: {
          source_artifact: `template/15-governance/fixtures/dispatch-cases/${fileName}`,
          gate_id: gateName,
          source: 'dispatch-fixture',
        },
      });

      addEdge(store, { type: 'DECISION_GATE', from: decisionId, to: gateId, properties: { status: gateStatus, source: 'dispatch-fixture' } });
      addEdge(store, { type: 'GATE_EVIDENCE', from: gateId, to: evidenceId, properties: { source: 'dispatch-fixture' } });
    }

    if (expected && expected.fallback_or_escalation === 'HumanGateRequired') {
      const humanGateId = `human-gate:${caseId}`;
      addNode(store, {
        id: humanGateId,
        type: 'HumanGate',
        properties: {
          reason: 'HumanGateRequired',
          source: 'dispatch-fixture',
        },
      });
      addEdge(store, { type: 'DECISION_HUMAN_GATE', from: decisionId, to: humanGateId, properties: { source: 'dispatch-fixture' } });
    }
  }
}

function countByType(items, field) {
  const counts = {};
  for (const item of items) {
    const key = String(item[field] || 'Unknown');
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function validateFrontendGraph(payload) {
  const nodeTypes = new Set(payload.nodes.map((n) => n.type));
  const gateStatuses = payload.nodes
    .filter((n) => n.type === 'Gate')
    .map((n) => n.properties && n.properties.status)
    .filter(Boolean);

  const checks = {
    parses: true,
    has_nodes: Array.isArray(payload.nodes),
    has_edges: Array.isArray(payload.edges),
    has_schema_version: Boolean(payload.schema_version),
    has_intents_nodes: nodeTypes.has('Intent'),
    has_rules_nodes: nodeTypes.has('Rule'),
    has_source_or_artifact_nodes: nodeTypes.has('Artifact'),
    has_human_gate_or_gate_status: nodeTypes.has('HumanGate') || gateStatuses.length > 0,
  };

  return {
    checks,
    ok: Object.values(checks).every(Boolean),
  };
}

function buildFrontendGraphExport(workspaceRoot, contentRoot) {
  const store = {
    nodesById: new Map(),
    edgeKeys: new Set(),
    edges: [],
  };

  const ingestDir = path.join(contentRoot, '.kb', 'graph-ingest');
  const laneNames = ['intents', 'rules', 'source'];
  const sources = [];

  for (const laneName of laneNames) {
    const lanePath = path.join(ingestDir, `${laneName}.json`);
    let payload = readJsonIfExists(lanePath);
    if (!payload) {
      payload = buildLanePayload(workspaceRoot, contentRoot, laneName);
    }
    importLanePayload(store, laneName, payload);
    sources.push({
      lane: laneName,
      path: fs.existsSync(lanePath) ? lanePath : null,
      node_count: Array.isArray(payload.nodes) ? payload.nodes.length : 0,
      edge_count: Array.isArray(payload.edges) ? payload.edges.length : 0,
    });
  }

  addApplyAuditGraph(store, contentRoot);
  addDispatchFixtureDerivedGraph(store, workspaceRoot);

  const nodes = Array.from(store.nodesById.values()).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const edges = store.edges.sort((a, b) => {
    const left = `${a.type}|${a.from}|${a.to}`;
    const right = `${b.type}|${b.from}|${b.to}`;
    return left.localeCompare(right);
  });

  const missingDataLanes = ['runs', 'decisions', 'gates', 'evidence']
    .filter((name) => !fs.existsSync(path.join(ingestDir, `${name}.json`)));

  const payload = {
    schema_version: 'kbx-observability-graph-v1',
    format: 'kbx-graph-json-v1',
    exported_at: new Date().toISOString(),
    read_only: true,
    nodes,
    edges,
    data_sources: sources,
    missing_data_lanes: missingDataLanes,
    stats: {
      node_count: nodes.length,
      edge_count: edges.length,
      node_type_counts: countByType(nodes, 'type'),
      edge_type_counts: countByType(edges, 'type'),
    },
  };

  payload.validation = validateFrontendGraph(payload);
  return payload;
}

// ---------------------------------------------------------------------------
// Subcommand: check
// ---------------------------------------------------------------------------

function runCheck(contentRoot, options) {
  const result = checkGraph(contentRoot);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Graph check: ${result.entity_count} entities, ${result.relation_count} relations`);

  if (result.issue_count === 0) {
    console.log('✓ No issues found.');
    return;
  }

  console.log(`\n${result.issue_count} issue(s) found:\n`);
  for (const issue of result.issues) {
    const sev = issue.severity === 'error' ? '[ERROR]' : '[WARN] ';
    console.log(`${sev} [${issue.check_id}]`);
    console.log(`        ${issue.message}`);
    console.log(`        Evidence: ${issue.evidence_path}`);
    console.log(`        Fix:      ${issue.suggested_fix}`);
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`
kbx graph — graph export and consistency check (v1.9 mini)

Usage:
  kbx graph export [--output=<path>] [--lane=<rules|intents|source>] [--json]
  kbx graph export --format=json [--out=<path>] [--json]
  kbx graph export <rules|intents|source> [--output=<path>] [--json]
  kbx graph lane <rules|intents|source> [--output=<path>] [--json]
  kbx graph check  [--json]

Subcommands:
  export    Export KB entities and relations as JSONL. Writes to stdout unless
            --output=<path> is given. When --lane is set, exports graph-ingest-v1
            JSON payload to file. Default path: knowledge-base/.kb/graph-ingest/<lane>.json.
            When --format=json is set (without --lane), exports a read-only
            frontend graph model to .kbx-graph/latest.json (or --out path).
  check     Run basic consistency checks:
              - missing node reference (broken relation target)
              - invalid relation type (outside allowed dictionary)
              - duplicate entity id
  help      Show this message.

Options:
  --output=<path>   Write JSONL to file instead of stdout.
  --out=<path>      Alias of --output (recommended with --format=json).
  --lane=<name>     Export lane payload: rules | intents | source.
  --format=json     Export schema-versioned frontend graph JSON (read-only mode).
  --json            Machine-readable JSON output (for check) or summary JSON (for export).
  `.trim());
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

function runGraph(args, { workspaceRoot }) {
  let options;
  try {
    options = parseArgs(args);
  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }

  if (options.sub === 'help') {
    printHelp();
    return;
  }

  const resolvedRoot = options.cwd
    ? path.resolve(options.cwd)
    : (workspaceRoot || process.cwd());

  let ctx;
  try {
    ctx = resolveExistingState({ workspaceRoot: resolvedRoot });
  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }

  const { contentRoot } = ctx;

  try {
    if (options.sub === 'export') {
      runExport(resolvedRoot, contentRoot, options);
    } else if (options.sub === 'check') {
      runCheck(contentRoot, options);
    } else {
      console.error(`Unknown subcommand "${options.sub}". Run "kbx graph help" for usage.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error: ' + err.message);
    process.exit(1);
  }
}

module.exports = {
  runGraph,
  parseArgs,
  validateIntentLifecycleDomains,
  WORKFLOW_LIFECYCLE_STATES,
  ONTOLOGY_LIFECYCLE_STATES,
};
