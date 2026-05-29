import { useMutation } from '@tanstack/react-query'
import { apiPost } from '../../shared/api/client'

export type InlineTranslateResponse = {
  ok: boolean
  provider: string
  source_language: string
  target_language: 'en' | 'vi'
  translated_text: string
}

export function useInlineTranslate() {
  return useMutation({
    mutationFn: (body: { text: string; source_language?: string; target_language: 'en' | 'vi' }) => (
      apiPost<InlineTranslateResponse>('/api/system/translate', body)
    ),
  })
}
