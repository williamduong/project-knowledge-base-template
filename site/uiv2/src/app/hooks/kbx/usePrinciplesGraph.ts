import { useQuery } from '@tanstack/react-query'

export interface Principle {
  id: string
  title: string
  statement: string
  domain: string
  motivation: string
  examples?: string
  code_symbol_count: number
  code_symbols: string[]
  extracted_at: string
}

export interface PrincipleDetail extends Principle {
  code_symbols: Array<{
    id: string
    edge_provenance?: string
  }>
}

export interface PrinciplesDomainStats {
  domain: string
  count: number
}

export interface PrinciplesCoverageStatus {
  total: number
  covered: number
  uncovered: number
  coverage_percent: number
  principles: Array<{
    id: string
    title: string
    has_code_coverage: boolean
    code_symbol_count: number
  }>
}

// Fetch all principles
export function usePrinciplesList() {
  return useQuery({
    queryKey: ['principles', 'list'],
    queryFn: async () => {
      const response = await fetch('/api/graph/principles')
      if (!response.ok) throw new Error(`Failed to fetch principles: ${response.statusText}`)
      return (await response.json()) as Principle[]
    },
  })
}

// Fetch single principle with full context
export function usePrinciple(principleId: string | null) {
  return useQuery({
    queryKey: ['principles', principleId],
    queryFn: async () => {
      if (!principleId) return null
      const response = await fetch(`/api/graph/principles/${encodeURIComponent(principleId)}`)
      if (!response.ok) throw new Error(`Failed to fetch principle: ${response.statusText}`)
      return (await response.json()) as PrincipleDetail
    },
    enabled: !!principleId,
  })
}

// Fetch principles by domain
export function usePrinciplesByDomain(domain: string | null) {
  return useQuery({
    queryKey: ['principles', 'domain', domain],
    queryFn: async () => {
      if (!domain) return []
      const response = await fetch(`/api/graph/principles?domain=${encodeURIComponent(domain)}`)
      if (!response.ok) throw new Error(`Failed to fetch principles by domain: ${response.statusText}`)
      return (await response.json()) as Principle[]
    },
    enabled: !!domain,
  })
}

// Fetch domain statistics
export function usePrinciplesDomainStats() {
  return useQuery({
    queryKey: ['principles', 'domains'],
    queryFn: async () => {
      const response = await fetch('/api/graph/principles/domains')
      if (!response.ok) throw new Error(`Failed to fetch principle domains: ${response.statusText}`)
      return (await response.json()) as {
        total: number
        by_domain: Record<string, number>
      }
    },
  })
}

// Fetch principles code coverage status (Phase 5+ metric)
export function usePrinciplesCoverageStatus() {
  return useQuery({
    queryKey: ['principles', 'coverage'],
    queryFn: async () => {
      const response = await fetch('/api/graph/principles/coverage')
      if (!response.ok) throw new Error(`Failed to fetch principles coverage: ${response.statusText}`)
      return (await response.json()) as PrinciplesCoverageStatus
    },
  })
}
