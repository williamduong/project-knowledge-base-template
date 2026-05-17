import { useQuery } from '@tanstack/react-query'
import { kbDocFallback, type KbDocResponse, type KbTreeResponse } from '../mock/kb-mock'
import { kbDocsGenerated, kbTreeGenerated } from '../mock/kb-data.generated'

// Slice 1 uses generated mock data from scripts/gen-kb-mock.mjs. When
// /api/kb/* lands per notes/kbx-ui-kb-page-runtime-contract.md, swap the
// queryFn body to apiGet(...). Hook signatures and response shapes are stable
// across that swap.

export function useKbTree() {
  return useQuery<KbTreeResponse>({
    queryKey: ['kb', 'tree'],
    queryFn: async () => kbTreeGenerated,
    staleTime: 60_000,
  })
}

export function useKbDoc(path: string | null) {
  return useQuery<KbDocResponse>({
    queryKey: ['kb', 'doc', path],
    queryFn: async () => {
      if (!path) return kbDocFallback
      const hit = kbDocsGenerated[path]
      if (hit) return hit
      const fileName = path.split('/').pop() || path
      return {
        ...kbDocFallback,
        path,
        frontmatter: { ...kbDocFallback.frontmatter, title: fileName },
        html: `<p class="text-zinc-400">Document body is not available in the current snapshot for <code>${path}</code>.</p>`,
      }
    },
    staleTime: 60_000,
  })
}
