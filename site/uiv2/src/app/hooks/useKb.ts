import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../shared/api/client'
import type { KbDocResponse, KbRootDescriptor, KbTreeResponse } from '../mock/kb-mock'

// Slice A: read endpoints (tree, doc, roots) wired to /api/kb/*.
// Slice B: roots are now server-persisted at site/kbx-ui/.runtime-state/
// kb-roots.json. UI mutations (add/remove root) go through POST /api/kb/roots
// and DELETE /api/kb/roots/:path; localStorage is gone.

type TreeApiResponse = { ok: boolean } & KbTreeResponse
type DocApiResponse = { ok: boolean } & KbDocResponse
export type KbRootCandidate = KbRootDescriptor & {
  source?: 'default' | 'discovered'
  active?: boolean
}
type RootsApiResponse = { ok: boolean; rootCandidates: KbRootCandidate[]; activeRoots: string[] }
type MutationResponse = { ok: boolean; activeRoots?: string[]; rootCandidates?: KbRootCandidate[]; error?: string }

export const kbRootsQueryKey = ['kb', 'roots'] as const

export function useKbTree() {
  return useQuery<KbTreeResponse>({
    queryKey: ['kb', 'tree'],
    queryFn: async () => {
      const r = await apiGet<TreeApiResponse>('/api/kb/tree')
      return { generatedAt: r.generatedAt, roots: r.roots }
    },
    staleTime: 60_000,
  })
}

type KbRootsState = { rootCandidates: KbRootCandidate[]; activeRoots: string[] }

export function useKbRoots() {
  return useQuery<KbRootsState>({
    queryKey: kbRootsQueryKey,
    queryFn: async () => {
      const r = await apiGet<RootsApiResponse>('/api/kb/roots')
      return { rootCandidates: r.rootCandidates, activeRoots: r.activeRoots }
    },
    staleTime: 60_000,
  })
}

function applyMutationResult(qc: ReturnType<typeof useQueryClient>, data: MutationResponse) {
  if (data.activeRoots) {
    qc.setQueryData<KbRootsState>(kbRootsQueryKey, (old) => {
      if (!old) return data.rootCandidates ? { rootCandidates: data.rootCandidates, activeRoots: data.activeRoots! } : old
      return {
        rootCandidates: data.rootCandidates ?? old.rootCandidates,
        activeRoots: data.activeRoots!,
      }
    })
  }
  // Tree refetch picks up the new active set; the server will lazy-rebuild
  // its cache on that GET.
  qc.invalidateQueries({ queryKey: ['kb', 'tree'] })
  qc.invalidateQueries({ queryKey: kbRootsQueryKey })
}

export function useAddKbRoot() {
  const qc = useQueryClient()
  return useMutation<MutationResponse, Error, string>({
    mutationFn: (rootPath) => apiPost<MutationResponse>('/api/kb/roots', { path: rootPath }),
    onSuccess: (data) => applyMutationResult(qc, data),
  })
}

export function useRemoveKbRoot() {
  const qc = useQueryClient()
  return useMutation<MutationResponse, Error, string>({
    mutationFn: async (rootPath) => {
      const r = await fetch(`/api/kb/roots/${rootPath.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE' })
      if (!r.ok) throw new Error(`DELETE failed: ${r.status}`)
      return r.json() as Promise<MutationResponse>
    },
    onSuccess: (data) => applyMutationResult(qc, data),
  })
}

export function useKbDoc(path: string | null) {
  return useQuery<KbDocResponse>({
    queryKey: ['kb', 'doc', path],
    queryFn: async () => {
      if (!path) {
        return {
          path: '',
          frontmatter: {
            title: 'No document selected', type: 'unknown', status: 'unknown',
            owner: '', time_state: 'unknown', verification: 'unknown',
            last_updated: '', last_verified: '', last_verified_commit: null,
            source_of_truth: null, related_strong: [], related_weak: [],
            released_in: null, tags: [],
          },
          headings: [], html: '', fromCache: false, snapshotAt: new Date().toISOString(),
        } as KbDocResponse
      }
      try {
        const r = await apiGet<DocApiResponse>(`/api/kb/doc?path=${encodeURIComponent(path)}`)
        return r
      } catch {
        const fileName = path.split('/').pop() || path
        return {
          path,
          frontmatter: {
            title: fileName, type: 'unknown', status: 'unknown', owner: '',
            time_state: 'unknown', verification: 'unknown',
            last_updated: '', last_verified: '', last_verified_commit: null,
            source_of_truth: null, related_strong: [], related_weak: [],
            released_in: null, tags: [],
          },
          headings: [],
          html: `<p class="text-zinc-400">Document body unavailable for <code>${path}</code>.</p>`,
          fromCache: false,
          snapshotAt: new Date().toISOString(),
        } as KbDocResponse
      }
    },
    staleTime: 60_000,
  })
}

export function useRefreshKb() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (path?: string) => apiPost<{ ok: boolean; generatedAt: string }>('/api/kb/refresh', path ? { path } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb'] })
    },
  })
}
