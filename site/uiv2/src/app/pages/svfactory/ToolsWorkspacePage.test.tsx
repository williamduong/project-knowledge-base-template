import { render, screen } from '@testing-library/react'
import { ToolsWorkspacePage } from './ToolsWorkspacePage'

vi.mock('../../hooks/svfactory/useToolsRegistry', () => ({
  useToolsRegistry: () => ({
    query: { isLoading: false },
    filteredTools: [
      {
        id: 'intent.create_draft',
        label: 'Create Draft Intent',
        workspace: 'intent',
        kind: 'mutation',
        status: 'ready',
        allowedContexts: ['svfactory'],
        allowedActors: ['codex'],
        execution: { transport: 'http', method: 'POST', path: '/api/intents/create' },
        inputContract: 'intents.create',
        outputContract: 'intents.create',
        summary: 'Create a new draft intent through the canonical bridge route.',
        sideEffects: ['writes a new intent draft via kbx CLI'],
      },
    ],
    statuses: ['ready', 'planned'],
    statusFilter: 'all',
    setStatusFilter: vi.fn(),
    summary: {
      total: 1,
      byStatus: { ready: 1, planned: 0 },
      byWorkspace: { intent: 1 },
    },
  }),
}))

describe('ToolsWorkspacePage', () => {
  it('renders governed tool registry content', () => {
    render(<ToolsWorkspacePage />)

    expect(screen.getByRole('heading', { name: 'Tools' })).toBeInTheDocument()
    expect(screen.getByText('Create Draft Intent')).toBeInTheDocument()
    expect(screen.getByText('POST /api/intents/create')).toBeInTheDocument()
    expect(screen.getByText(/Contract intents.create/i)).toBeInTheDocument()
  })
})
