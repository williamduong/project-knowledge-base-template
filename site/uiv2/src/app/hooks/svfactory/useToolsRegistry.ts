import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../../shared/api/client'

export type ToolRegistryItem = {
  id: string
  label: string
  workspace: string
  kind: string
  status: string
  allowedContexts: string[]
  allowedActors: string[]
  execution: {
    transport: string
    method: string
    path: string
  }
  inputContract: string
  outputContract: string
  summary: string
  sideEffects: string[]
}

type ToolsRegistryResponse = {
  ok: boolean
  tools: ToolRegistryItem[]
  summary: {
    total: number
    byStatus: Record<string, number>
    byWorkspace: Record<string, number>
  }
}

export function useToolsRegistry() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const query = useQuery({
    queryKey: ['tools-registry'],
    queryFn: () => apiGet<ToolsRegistryResponse>('/api/tools-registry'),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const tools = query.data?.tools ?? []
  const statuses = useMemo(() => Array.from(new Set(tools.map((tool) => tool.status))).sort(), [tools])
  const filteredTools = useMemo(
    () => tools.filter((tool) => statusFilter === 'all' || tool.status === statusFilter),
    [statusFilter, tools],
  )

  return {
    query,
    tools,
    filteredTools,
    statuses,
    statusFilter,
    setStatusFilter,
    summary: query.data?.summary,
  }
}
