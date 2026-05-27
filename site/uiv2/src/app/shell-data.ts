export const projectName = 'project-knowledge-base-template'

export const productLabel = 'Control Plane'

export const shellStatusFallback = {
  chaosScore: { value: 18, level: 'stable' },
  focusIntent: {
    id: 'v2-7-nl-rules-to-cli-logic',
    state: 'READY TO CLOSE',
  },
  environments: [
    { name: 'UI Local', status: 'live' },
    { name: 'Bridge API', status: 'offline' },
    { name: 'Downstream', status: 'offline' },
  ],
} as const

export const tabs = [
  { label: 'Dashboard', path: '/' },
  { label: 'Code', path: '/code' },
  { label: 'Intent', path: '/intents' },
  { label: 'Rules', path: '/rules' },
  { label: 'Flow', path: '/flow' },
  { label: 'Tools', path: '/tools' },
  { label: 'DNA', path: '/dna' },
  { label: 'System', path: '/system' },
] as const

export const routeMeta: Record<string, { eyebrow: string; summary: string; selection: string }> = {
  '/': {
    eyebrow: 'Dashboard Deferred',
    summary: 'Dashboard stays intentionally thin until mature workspaces can provide trustworthy summaries.',
    selection: 'No pinned entity. Shell-first mode remains active.',
  },
  '/code': {
    eyebrow: 'Code Workspace',
    summary: 'Code Graph is the first completed factory workspace because it becomes substrate for impact, rules, and DNA generation checks.',
    selection: 'Symbol and coverage slices are active.',
  },
  '/intents': {
    eyebrow: 'Intent Workspace',
    summary: 'Intent remains the graph-backed governance workflow surface and will mature after Code.',
    selection: 'List-only selection. Detail and actions are deferred to the next slice.',
  },
  '/kb': {
    eyebrow: 'Knowledge Base Workspace',
    summary: 'Document tree and reader will land after Intent and Task flows are anchored.',
    selection: 'No document selected.',
  },
  '/rules': {
    eyebrow: 'Rules Workspace',
    summary: 'Rules are the harness for agents and become the policy backbone for Flow, Tools, and DNA.',
    selection: 'No rule domain selected.',
  },
  '/flow': {
    eyebrow: 'Flow Workspace',
    summary: 'Flow is the future execution grammar: pipelines, gates, triggers, runs, and maps.',
    selection: 'No flow surface selected.',
  },
  '/tools': {
    eyebrow: 'Tools Workspace',
    summary: 'Tools will become the governed registry of approved agent action surfaces.',
    selection: 'No tool contract selected.',
  },
  '/dna': {
    eyebrow: 'DNA Workspace',
    summary: 'DNA will package ontology, rules, flow, tools, templates, checklist, and release readiness for KBX variants.',
    selection: 'No DNA package selected.',
  },
  '/graph': {
    eyebrow: 'Graph Workspace',
    summary: 'Graph remains a compatibility bridge while graph lenses move into Code, Intent, and later DNA.',
    selection: 'No graph focus selected.',
  },
  '/search': {
    eyebrow: 'Search Workspace',
    summary: 'Search is now treated primarily as a utility overlay rather than a first-class workspace.',
    selection: 'No result selected.',
  },
  '/system': {
    eyebrow: 'System Workspace',
    summary: 'System owns runtime services, health, snapshots, cron, and recovery only.',
    selection: 'No runtime artifact selected.',
  },
  '/prototype': {
    eyebrow: 'Prototype Sandbox',
    summary: 'R&D route for testing shell patterns, tables, forms, and states before promoting them into production workspaces.',
    selection: 'No production artifact selected.',
  },
}

export const intentRows = [
  {
    id: 'v2-9-uiv2-shadcn-admin-shell-adoption',
    title: 'Rebuild KBX UIV2 shell with donor-driven visual language',
    state: 'active',
    priority: 'high',
    focus: 'Compact shell correction and Intent-first execution surface.',
    nextAction: 'Build Intent detail in the new shell instead of extending the old page shell.',
    blockReason: 'Legacy source parity on this branch is still notes-backed.',
  },
  {
    id: 'v2-10-intent-lifecycle-domain-separation',
    title: 'Separate intent lifecycle from broader domain aggregation',
    state: 'closed',
    priority: 'medium',
    focus: 'Historical reference for state ownership and lifecycle boundaries.',
    nextAction: 'Reuse contract decisions when action surfaces are added.',
    blockReason: 'No active blocker.',
  },
  {
    id: 'v2-9-kbagent-observability-graph',
    title: 'Legacy observability and graph checkpoint reference',
    state: 'dropped',
    priority: 'low',
    focus: 'Reference-only artifact from an older direction.',
    nextAction: 'Extract only reusable signals, not the old surface structure.',
    blockReason: 'Superseded by the module-first rebuild.',
  },
] as const
