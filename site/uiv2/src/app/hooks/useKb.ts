import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../shared/api/client'
import type { KbDocResponse, KbRootDescriptor, KbTreeResponse } from '../mock/kb-mock'

// Slice A wires the UI to the live /api/kb/* endpoints implemented in
// site/kbx-ui/server.mjs (see notes/kbx-ui-kb-page-svfactory-handoff.md).
// Active-roots persistence is still UI-local (localStorage) — Slice B will
// move it to L5 state via POST/DELETE /api/kb/roots.

type TreeApiResponse = { ok: boolean } & KbTreeResponse
type DocApiResponse = { ok: boolean } & KbDocResponse
type RootsApiResponse = { ok: boolean; rootCandidates: KbRootDescriptor[] }

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

export function useKbRootCandidates() {
  return useQuery<KbRootDescriptor[]>({
    queryKey: ['kb', 'roots'],
    queryFn: async () => {
      const r = await apiGet<RootsApiResponse>('/api/kb/roots')
      return r.rootCandidates
    },
    staleTime: 60_000,
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
