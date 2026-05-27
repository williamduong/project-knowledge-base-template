import { render, screen } from '@testing-library/react'
import { CodeWorkspacePage } from './CodeWorkspacePage'

vi.mock('../../hooks/svfactory/useCodeWorkspace', () => ({
  useCodeWorkspace: () => ({
    selectedKind: 'all',
    setSelectedKind: vi.fn(),
    exportedOnly: false,
    setExportedOnly: vi.fn(),
    statsQuery: {
      isLoading: false,
      data: {
        total_symbols: 42,
        by_kind: {
          function: 20,
          class: 8,
          variable: 14,
        },
        exported_count: 11,
        exported_percent: 26,
      },
    },
    coverageQuery: {
      isError: false,
      data: {
        total: 10,
        covered: 8,
        uncovered: 2,
        coverage_percent: 80,
      },
    },
    symbolsQuery: {
      isFetching: false,
      isLoading: false,
      isError: false,
      data: [
        { id: 's1', name: 'runSync', kind: 'function', file: 'src/lib/sync.js', line: 12, exported: true },
        { id: 's2', name: 'validateGraph', kind: 'function', file: 'src/graph-db/knowledge/validate.js', line: 28, exported: false },
      ],
    },
    availableKinds: ['class', 'function', 'variable'],
    topFiles: [
      { file: 'src/lib/sync.js', count: 5 },
      { file: 'src/graph-db/knowledge/validate.js', count: 4 },
    ],
  }),
}))

describe('CodeWorkspacePage', () => {
  it('renders code graph metrics and registry slices', () => {
    render(<CodeWorkspacePage />)

    expect(screen.getByRole('heading', { name: 'Code' })).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('runSync')).toBeInTheDocument()
    expect(screen.getByText('Principles covered 8')).toBeInTheDocument()
    expect(screen.getAllByText('src/lib/sync.js').length).toBeGreaterThan(0)
  })
})
