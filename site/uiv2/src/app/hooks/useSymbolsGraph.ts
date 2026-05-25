import { useQuery, UseQueryResult } from '@tanstack/react-query';

/**
 * React Query hooks for Code Graph symbols (Phase 6 Track A)
 *
 * Hooks for fetching code symbols extracted from source code.
 * Used by UIv2 workspace pages (e.g., PrinciplesPage for code coverage).
 */

interface Symbol {
  id: string;
  name: string;
  kind: string;
  file: string;
  line: number;
  exported?: boolean;
  location?: string;
}

interface SymbolDetail extends Symbol {
  calls: Symbol[];
  callers: Symbol[];
  call_count: number;
  caller_count: number;
}

interface SymbolsStats {
  total_symbols: number;
  by_kind: Record<string, number>;
  exported_count: number;
  exported_percent: number;
}

/**
 * List all symbols with optional filtering
 */
export function useSymbolsList(
  filters?: { kind?: string; file?: string; exported?: boolean }
): UseQueryResult<Symbol[], Error> {
  const queryKey = ['symbols', 'list', filters];
  const url = new URL('/api/graph/symbols', window.location.origin);

  if (filters?.kind) url.searchParams.set('kind', filters.kind);
  if (filters?.file) url.searchParams.set('file', filters.file);
  if (filters?.exported !== undefined) url.searchParams.set('exported', String(filters.exported));

  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch symbols');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/**
 * Fetch single symbol with call graph
 */
export function useSymbol(symbolId: string): UseQueryResult<SymbolDetail, Error> {
  return useQuery({
    queryKey: ['symbols', symbolId],
    queryFn: async () => {
      const response = await fetch(`/api/graph/symbols/${symbolId}`);
      if (!response.ok) throw new Error('Symbol not found');
      return response.json();
    },
    enabled: !!symbolId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch symbol statistics
 */
export function useSymbolsStats(): UseQueryResult<SymbolsStats, Error> {
  return useQuery({
    queryKey: ['symbols', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/graph/symbols/stats');
      if (!response.ok) throw new Error('Failed to fetch symbol stats');
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

/**
 * Fetch call graph for a symbol (depth-limited traversal)
 */
export function useSymbolCallGraph(
  symbolId: string,
  depth: number = 2
): UseQueryResult<{ root_id: string; calls: Symbol[]; callers: Symbol[]; call_count: number; caller_count: number }, Error> {
  return useQuery({
    queryKey: ['symbols', symbolId, 'calls', depth],
    queryFn: async () => {
      const response = await fetch(`/api/graph/symbols/${symbolId}/calls?depth=${depth}`);
      if (!response.ok) throw new Error('Failed to fetch call graph');
      return response.json();
    },
    enabled: !!symbolId,
    staleTime: 10 * 60 * 1000,
  });
}
