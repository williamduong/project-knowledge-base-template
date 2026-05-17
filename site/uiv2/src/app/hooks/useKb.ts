import { useQuery } from '@tanstack/react-query'
import { kbDocFallback, kbDocMock, kbTreeMock, type KbDocResponse, type KbTreeResponse } from '../mock/kb-mock'

// Slice 1 uses local mock data. When /api/kb/* lands per
// notes/kbx-ui-kb-page-runtime-contract.md, swap the queryFn body to apiGet(...).
// The hook signatures and response shapes are stable across that swap.

export function useKbTree() {
  return useQuery<KbTreeResponse>({
    queryKey: ['kb', 'tree'],
    queryFn: async () => kbTreeMock,
    staleTime: 60_000,
  })
}

export function useKbDoc(path: string | null) {
  return useQuery<KbDocResponse>({
    queryKey: ['kb', 'doc', path],
    queryFn: async () => {
      if (!path) return kbDocFallback
      return kbDocMock[path] ?? { ...kbDocFallback, path }
    },
    enabled: true,
    staleTime: 60_000,
  })
}
