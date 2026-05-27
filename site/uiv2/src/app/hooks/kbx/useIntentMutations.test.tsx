import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useCreateIntentMutation, useUpdateIntentMutation } from './useIntentMutations'
import { apiPatch, apiPost } from '../../../shared/api/client'

vi.mock('../../../shared/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
}))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useIntentMutations', () => {
  it('creates draft intents through the canonical mutation surface', async () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    vi.mocked(apiPost).mockResolvedValue({
      ok: true,
      result: { id: 'v3-0-factory-shell' },
    })

    const { result } = renderHook(() => useCreateIntentMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        title: 'Factory shell',
        focus: 'Clean up navigation',
      })
    })

    expect(apiPost).toHaveBeenCalledWith('/api/intents/create', {
      title: 'Factory shell',
      focus: 'Clean up navigation',
    })
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled())
  })

  it('updates existing intents through the canonical mutation surface', async () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    vi.mocked(apiPatch).mockResolvedValue({
      ok: true,
      result: { id: 'v2-7-nl-rules-to-cli-logic', updated_fields: ['focus'] },
    })

    const { result } = renderHook(() => useUpdateIntentMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({
        id: 'v2-7-nl-rules-to-cli-logic',
        body: { focus: 'Lock the CLI surface' },
      })
    })

    expect(apiPatch).toHaveBeenCalledWith('/api/intents/v2-7-nl-rules-to-cli-logic', {
      focus: 'Lock the CLI surface',
    })
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled())
  })
})
