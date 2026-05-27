import { useMemo, useState } from 'react'
import { useSymbolsList, useSymbolsStats } from '../kbx/useSymbolsGraph'
import { usePrinciplesCoverageStatus } from '../kbx/usePrinciplesGraph'

export function useCodeWorkspace() {
  const [selectedKind, setSelectedKind] = useState<string>('all')
  const [exportedOnly, setExportedOnly] = useState(false)

  const statsQuery = useSymbolsStats()
  const coverageQuery = usePrinciplesCoverageStatus()
  const symbolsQuery = useSymbolsList({
    kind: selectedKind !== 'all' ? selectedKind : undefined,
    exported: exportedOnly ? true : undefined,
  })

  const availableKinds = useMemo(() => {
    const stats = statsQuery.data?.by_kind ?? {}
    return Object.keys(stats).sort((left, right) => left.localeCompare(right))
  }, [statsQuery.data?.by_kind])

  const topFiles = useMemo(() => {
    const symbols = symbolsQuery.data ?? []
    const counts = new Map<string, number>()

    symbols.forEach((symbol) => {
      counts.set(symbol.file, (counts.get(symbol.file) ?? 0) + 1)
    })

    return Array.from(counts.entries())
      .map(([file, count]) => ({ file, count }))
      .sort((left, right) => right.count - left.count || left.file.localeCompare(right.file))
      .slice(0, 8)
  }, [symbolsQuery.data])

  return {
    selectedKind,
    setSelectedKind,
    exportedOnly,
    setExportedOnly,
    statsQuery,
    coverageQuery,
    symbolsQuery,
    availableKinds,
    topFiles,
  }
}
