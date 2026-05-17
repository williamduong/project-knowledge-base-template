// Mock data for KB page slice 1. Shapes mirror notes/kbx-ui-kb-page-runtime-contract.md
// so swapping to real /api/kb/tree and /api/kb/doc is a hook-internal change later.

export type KbDocType =
  | 'orientation'
  | 'concept'
  | 'architecture'
  | 'reference'
  | 'implementation'
  | 'decision'
  | 'guide'
  | 'operations'
  | 'test-strategy'
  | 'governance'
  | 'unknown'

export type KbDocStatus = 'active' | 'draft' | 'deprecated' | 'archived' | 'unknown'
export type KbVerification = 'code-verified' | 'design-only' | 'unverified' | 'self-referential' | 'unknown'
export type KbTimeState = 'current' | 'to_be' | 'mixed' | 'historical' | 'timeless' | 'unknown'

export type KbTreeDocNode = {
  path: string
  kind: 'doc'
  title: string
  type: KbDocType
  status: KbDocStatus
  verification: KbVerification
  time_state: KbTimeState
  owner: string
  last_updated: string
  last_verified: string
  daysSinceVerified: number
  stale: boolean
  tags: string[]
}

export type KbTreeFolderNode = {
  path: string
  kind: 'folder'
  title: string
  docCount: number
  stalest: { path: string; daysSinceVerified: number } | null
  children: KbTreeNode[]
}

export type KbTreeNode = KbTreeFolderNode | KbTreeDocNode

export type KbTreeResponse = {
  generatedAt: string
  contentRoot: string
  root: KbTreeFolderNode
}

export type KbDocResponse = {
  path: string
  frontmatter: {
    title: string
    type: KbDocType
    status: KbDocStatus
    owner: string
    time_state: KbTimeState
    verification: KbVerification
    last_updated: string
    last_verified: string
    last_verified_commit: string | null
    source_of_truth: string | null
    related_strong: string[]
    related_weak: string[]
    released_in: string | null
    tags: string[]
  }
  headings: Array<{ id: string; level: number; text: string }>
  html: string
  fromCache: boolean
  snapshotAt: string
}

const today = '2026-05-17'

function doc(partial: Partial<KbTreeDocNode> & Pick<KbTreeDocNode, 'path' | 'title'>): KbTreeDocNode {
  return {
    kind: 'doc',
    type: 'unknown',
    status: 'active',
    verification: 'unverified',
    time_state: 'current',
    owner: 'knowledge-management',
    last_updated: today,
    last_verified: today,
    daysSinceVerified: 0,
    stale: false,
    tags: [],
    ...partial,
  } as KbTreeDocNode
}

export const kbTreeMock: KbTreeResponse = {
  generatedAt: `${today}T08:00:00Z`,
  contentRoot: 'knowledge-base',
  root: {
    path: 'knowledge-base',
    kind: 'folder',
    title: 'Knowledge Base',
    docCount: 8,
    stalest: { path: 'knowledge-base/03-architecture/adr-0042-runtime-split.md', daysSinceVerified: 92 },
    children: [
      {
        path: 'knowledge-base/00-start-here',
        kind: 'folder',
        title: '00-start-here',
        docCount: 2,
        stalest: null,
        children: [
          doc({
            path: 'knowledge-base/00-start-here/how-to-use-this-kb.md',
            title: 'How To Use This KB',
            type: 'orientation',
            status: 'active',
            verification: 'unverified',
            daysSinceVerified: 19,
            tags: ['index', 'navigation'],
          }),
          doc({
            path: 'knowledge-base/00-start-here/repository-revision-state.md',
            title: 'Repository Revision State',
            type: 'orientation',
            verification: 'code-verified',
            daysSinceVerified: 3,
            tags: ['baseline'],
          }),
        ],
      },
      {
        path: 'knowledge-base/03-architecture',
        kind: 'folder',
        title: '03-architecture',
        docCount: 2,
        stalest: { path: 'knowledge-base/03-architecture/adr-0042-runtime-split.md', daysSinceVerified: 92 },
        children: [
          doc({
            path: 'knowledge-base/03-architecture/runtime-overview.md',
            title: 'Runtime Overview',
            type: 'architecture',
            status: 'active',
            verification: 'design-only',
            time_state: 'mixed',
            daysSinceVerified: 41,
            tags: ['runtime', 'layers'],
          }),
          doc({
            path: 'knowledge-base/03-architecture/adr-0042-runtime-split.md',
            title: 'ADR-0042 Runtime Split',
            type: 'decision',
            status: 'active',
            verification: 'self-referential',
            daysSinceVerified: 92,
            stale: true,
            tags: ['adr', 'historical'],
          }),
        ],
      },
      {
        path: 'knowledge-base/14-templates',
        kind: 'folder',
        title: '14-templates',
        docCount: 1,
        stalest: null,
        children: [
          doc({
            path: 'knowledge-base/14-templates/doc-template.md',
            title: 'Doc Template',
            type: 'governance',
            status: 'draft',
            verification: 'self-referential',
            daysSinceVerified: 12,
            tags: ['template'],
          }),
        ],
      },
      {
        path: 'knowledge-base/15-governance',
        kind: 'folder',
        title: '15-governance',
        docCount: 3,
        stalest: null,
        children: [
          doc({
            path: 'knowledge-base/15-governance/metadata-schema.md',
            title: 'Metadata Schema',
            type: 'governance',
            status: 'active',
            verification: 'self-referential',
            last_updated: '2026-05-09',
            last_verified: '2026-05-01',
            daysSinceVerified: 16,
            tags: ['governance', 'metadata'],
          }),
          doc({
            path: 'knowledge-base/15-governance/document-taxonomy.md',
            title: 'Document Taxonomy',
            type: 'governance',
            status: 'active',
            verification: 'self-referential',
            daysSinceVerified: 19,
            tags: ['governance', 'taxonomy'],
          }),
          doc({
            path: 'knowledge-base/15-governance/old-policy.md',
            title: 'Old Policy (sample)',
            type: 'governance',
            status: 'deprecated',
            verification: 'unverified',
            daysSinceVerified: 210,
            stale: true,
            tags: ['deprecated'],
          }),
        ],
      },
    ],
  },
}

export const kbDocMock: Record<string, KbDocResponse> = {
  'knowledge-base/15-governance/metadata-schema.md': {
    path: 'knowledge-base/15-governance/metadata-schema.md',
    frontmatter: {
      title: 'Metadata Schema',
      type: 'governance',
      status: 'active',
      owner: 'knowledge-management',
      time_state: 'current',
      verification: 'self-referential',
      last_updated: '2026-05-09',
      last_verified: '2026-05-01',
      last_verified_commit: null,
      source_of_truth: null,
      related_strong: ['knowledge-base/15-governance/document-taxonomy.md'],
      related_weak: ['knowledge-base/00-start-here/how-to-use-this-kb.md'],
      released_in: null,
      tags: ['governance', 'metadata'],
    },
    headings: [
      { id: 'boundary-and-naming-reference', level: 2, text: 'Boundary and Naming Reference' },
      { id: 'required-frontmatter', level: 2, text: 'Required Frontmatter' },
      { id: 'field-rules', level: 2, text: 'Field Rules' },
      { id: 'validation-checklist', level: 2, text: 'Validation Checklist' },
    ],
    html: `
<h2 id="boundary-and-naming-reference">Boundary and Naming Reference</h2>
<p>Use one canonical boundary and naming vocabulary across governance docs.</p>
<h2 id="required-frontmatter">Required Frontmatter</h2>
<p>Every KB document must declare frontmatter with the fields below.</p>
<pre><code>title, type, status, owner, time_state, verification, last_updated, last_verified</code></pre>
<h2 id="field-rules">Field Rules</h2>
<ul>
  <li><code>source_of_truth</code> mandatory when verification is code-verified.</li>
  <li><code>last_verified</code> only changes when claims are re-checked against source.</li>
</ul>
<h2 id="validation-checklist">Validation Checklist</h2>
<p>Doctor validates these fields per file.</p>
`.trim(),
    fromCache: true,
    snapshotAt: `${today}T08:00:00Z`,
  },
  'knowledge-base/03-architecture/runtime-overview.md': {
    path: 'knowledge-base/03-architecture/runtime-overview.md',
    frontmatter: {
      title: 'Runtime Overview',
      type: 'architecture',
      status: 'active',
      owner: 'platform',
      time_state: 'mixed',
      verification: 'design-only',
      last_updated: '2026-04-06',
      last_verified: '2026-04-06',
      last_verified_commit: null,
      source_of_truth: null,
      related_strong: [],
      related_weak: ['knowledge-base/03-architecture/adr-0042-runtime-split.md'],
      released_in: null,
      tags: ['runtime', 'layers'],
    },
    headings: [
      { id: 'purpose', level: 2, text: 'Purpose' },
      { id: 'current-state', level: 2, text: 'Current State' },
      { id: 'target-state', level: 2, text: 'Target State' },
    ],
    html: `
<h2 id="purpose">Purpose</h2>
<p>Describe how the runtime is layered today and where it must move.</p>
<h2 id="current-state">Current State</h2>
<p>L1 still calls some legacy endpoints directly.</p>
<h2 id="target-state">Target State</h2>
<p>All reads flow through the snapshot store.</p>
`.trim(),
    fromCache: true,
    snapshotAt: `${today}T08:00:00Z`,
  },
}

export const kbDocFallback: KbDocResponse = {
  path: '',
  frontmatter: {
    title: 'No document selected',
    type: 'unknown',
    status: 'unknown',
    owner: '',
    time_state: 'unknown',
    verification: 'unknown',
    last_updated: '',
    last_verified: '',
    last_verified_commit: null,
    source_of_truth: null,
    related_strong: [],
    related_weak: [],
    released_in: null,
    tags: [],
  },
  headings: [],
  html: '<p class="text-zinc-400">Pick a document from the tree to start reading.</p>',
  fromCache: false,
  snapshotAt: `${today}T08:00:00Z`,
}
