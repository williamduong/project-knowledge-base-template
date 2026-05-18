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
  fileKind?: 'md' | 'html' | 'other'
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

export type KbRootNode = KbTreeFolderNode & {
  label: string
  defaultActive: boolean
}

export type KbRootDescriptor = {
  path: string
  label: string
  defaultActive: boolean
  docCount: number
}

export type KbTreeResponse = {
  generatedAt: string
  roots: KbRootNode[]
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
  body?: string
  contentHash?: string | null
  fromCache: boolean
  snapshotAt: string
}

const today = "2026-05-17"

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
