import { useEffect, useState } from 'react'
import { useInlineTranslate } from '../hooks/useInlineTranslate'
import { useUiLanguage } from '../ui-language'

type InlineTranslateProps = {
  text: string
  className?: string
  as?: 'p' | 'div' | 'span'
}

export function InlineTranslate({
  text,
  className,
  as = 'p',
}: InlineTranslateProps) {
  const { language } = useUiLanguage()
  const translateMutation = useInlineTranslate()
  const [showOriginal, setShowOriginal] = useState(false)
  const [translatedText, setTranslatedText] = useState('')
  const Tag = as
  const sourceText = String(text || '').trim()

  useEffect(() => {
    setShowOriginal(false)
    setTranslatedText('')
  }, [sourceText, language])

  if (!sourceText) {
    return null
  }

  if (language === 'en') {
    return <Tag className={className}>{sourceText}</Tag>
  }

  const visibleText = translatedText && !showOriginal ? translatedText : sourceText

  return (
    <div className="inline-translate-block">
      <Tag className={className}>{visibleText}</Tag>
      <div className="inline-translate-actions">
        {!translatedText ? (
          <button
            type="button"
            className="inline-translate-button"
            disabled={translateMutation.isPending}
            onClick={async () => {
              const result = await translateMutation.mutateAsync({
                text: sourceText,
                target_language: language,
              })
              setTranslatedText(result.translated_text || sourceText)
              setShowOriginal(false)
            }}
          >
            {translateMutation.isPending ? 'Dang dich...' : 'Dich sang tieng Viet'}
          </button>
        ) : (
          <button
            type="button"
            className="inline-translate-button"
            onClick={() => setShowOriginal((current) => !current)}
          >
            {showOriginal ? 'Xem ban dich' : 'Xem ban goc'}
          </button>
        )}
        {translateMutation.isError ? (
          <span className="inline-translate-error">
            {translateMutation.error instanceof Error ? translateMutation.error.message : 'Dich that bai'}
          </span>
        ) : null}
      </div>
    </div>
  )
}
