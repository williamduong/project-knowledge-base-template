export const tabs = [
  { label: 'Home', path: '/' },
  { label: 'Intents', path: '/intents' },
  { label: 'Knowledge Base', path: '/kb' },
  { label: 'Rules', path: '/rules' },
  { label: 'Graph', path: '/graph' },
  { label: 'Search', path: '/search' },
  { label: 'System', path: '/system' },
] as const

export const routeMeta: Record<string, { eyebrow: string; summary: string; selection: string }> = {
  '/': {
    eyebrow: 'Home Aggregation Deferred',
    summary: 'Home stays thin until module surfaces become trustworthy.',
    selection: 'No pinned entity. Shell-first mode remains active.',
  },
  '/intents': {
    eyebrow: 'Intent Workspace',
    summary: 'Intent list is the first real domain slice inside the compact shell.',
    selection: 'List-only selection. Detail and actions are deferred to the next slice.',
  },
  '/kb': {
    eyebrow: 'Knowledge Base Workspace',
    summary: 'Document tree and reader will land after Intent and Task flows are anchored.',
    selection: 'No document selected.',
  },
  '/rules': {
    eyebrow: 'Rules Workspace',
    summary: 'Rule registry and findings stay deferred until core document and intent context stabilizes.',
    selection: 'No rule domain selected.',
  },
  '/graph': {
    eyebrow: 'Graph Workspace',
    summary: 'Graph remains a later module with metrics first and exploration later.',
    selection: 'No graph focus selected.',
  },
  '/search': {
    eyebrow: 'Search Workspace',
    summary: 'Cross-surface retrieval depends on stable result contracts from other modules.',
    selection: 'No result selected.',
  },
  '/system': {
    eyebrow: 'System Workspace',
    summary: 'Runtime and repository diagnostics will sit in a dedicated operator workspace.',
    selection: 'No runtime artifact selected.',
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