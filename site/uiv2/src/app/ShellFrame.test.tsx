import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ShellFrame } from './ShellFrame'

vi.mock('./hooks/useShellStatus', () => ({
  useShellStatus: () => ({
    data: {
      fingerprint: 'test-fingerprint',
      items: [
        { key: 'focus-intent', label: 'Focus Intent', value: 'v3.0', tone: 'live' },
        { key: 'chaos', label: 'Chaos', value: '18', tone: 'good' },
      ],
    },
    isFetching: false,
  }),
}))

vi.mock('./hooks/useSystemSnapshot', () => ({
  useRefreshSystemSnapshot: () => ({
    isPending: false,
    mutateAsync: async () => ({
      metadata: { fingerprint: 'test-fingerprint' },
    }),
  }),
}))

vi.mock('./hooks/svfactory/useAiSettings', () => ({
  useAiSettings: () => ({
    data: {
      ok: true,
      settings: {
        schema_version: '0.1.0',
        provider: 'deepseek',
        ui_language: 'en',
        model: 'deepseek-v4-flash',
        endpoint: 'https://api.deepseek.com',
        system_prompt: '',
        planning_harness_prompt: '',
        app_primary_goals: '',
        app_description: '',
        has_api_key: false,
        api_key_masked: null,
        updated_at: null,
      },
    },
  }),
  useSaveAiSettings: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}))

vi.mock('./SearchOverlay', () => ({
  SearchOverlay: () => null,
}))

vi.mock('./pages/svfactory/HomePage', () => ({
  HomePage: () => <h1>Dashboard</h1>,
}))

vi.mock('./pages/svfactory/CodeWorkspacePage', () => ({
  CodeWorkspacePage: () => <h1>Code</h1>,
}))

vi.mock('./pages/svfactory/PlaceholderPage', () => ({
  PlaceholderPage: ({ title }: { title: string }) => <h1>{title}</h1>,
}))

vi.mock('./pages/svfactory/RuntimeServicesPage', () => ({
  RuntimeServicesPage: ({ title }: { title: string }) => <h1>{title}</h1>,
}))

vi.mock('./pages/svfactory/PrototypePage', () => ({
  PrototypePage: () => <h1>Prototype</h1>,
}))

vi.mock('./pages/svfactory/ToolsWorkspacePage', () => ({
  ToolsWorkspacePage: () => <h1>Tools</h1>,
}))

vi.mock('./pages/kbx/IntentsListPage', () => ({
  IntentsListPage: () => <h1>Intent</h1>,
}))

vi.mock('./pages/kbx/KnowledgeBasePage', () => ({
  KnowledgeBasePage: () => <h1>Knowledge Base</h1>,
}))

vi.mock('./pages/kbx/GoalsPage', () => ({
  GoalsPage: () => <h1>Graph Goals</h1>,
}))

vi.mock('./pages/kbx/DecisionsPage', () => ({
  DecisionsPage: () => <h1>Graph Decisions</h1>,
}))

vi.mock('./pages/kbx/PrinciplesPage', () => ({
  PrinciplesPage: () => <h1>Graph Principles</h1>,
}))

describe('ShellFrame routes', () => {
  it.each([
    ['/', 'Dashboard'],
    ['/code', 'Code'],
    ['/intents', 'Intent'],
    ['/rules', 'Rules'],
    ['/flow', 'Flow'],
    ['/tools', 'Tools'],
    ['/dna', 'DNA'],
    ['/system', 'System'],
    ['/kb', 'Knowledge Base'],
    ['/graph', 'Graph Goals'],
    ['/graph/decisions', 'Graph Decisions'],
    ['/graph/principles', 'Graph Principles'],
    ['/search', 'Search'],
    ['/prototype', 'Prototype'],
  ])('renders %s without route crashes', (path, heading) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <ShellFrame />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })
})
