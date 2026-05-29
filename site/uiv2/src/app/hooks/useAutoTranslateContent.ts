import { useEffect, useRef } from 'react'
import { apiPost } from '../../shared/api/client'
import type { UiLanguage } from '../ui-language'

type BatchTranslateResponse = {
  ok: boolean
  provider: string
  source_language: string
  target_language: 'en' | 'vi'
  items: Array<{
    source_text: string
    translated_text: string
  }>
}

const SKIP_TAGS = new Set([
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'OPTION',
  'CODE',
  'PRE',
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'SVG',
])

function shouldTranslateText(value: string) {
  const text = value.trim()
  if (!text) return false
  if (text.length < 5) return false
  if (!/[A-Za-z]/.test(text)) return false
  if (/^(http|\/|[A-Z0-9_\-.:/]+)$/.test(text)) return false
  return true
}

export function useAutoTranslateContent(language: UiLanguage) {
  const originalTextByNodeRef = useRef(new WeakMap<Text, string>())
  const cacheRef = useRef(new Map<string, string>())
  const pendingTextsRef = useRef(new Set<string>())
  const observerRef = useRef<MutationObserver | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const root = document.querySelector('.shell-root')
    if (!root) return
    const rootNode: Node = root

    const originalTextByNode = originalTextByNodeRef.current
    const cache = cacheRef.current
    const pendingTexts = pendingTextsRef.current

    async function flushBatch(texts: string[]) {
      if (!texts.length) return
      texts.forEach((text) => pendingTexts.add(text))

      try {
        const response = await apiPost<BatchTranslateResponse>('/api/system/translate-batch', {
          texts,
          target_language: 'vi',
        })

        response.items.forEach((item) => {
          cache.set(item.source_text, item.translated_text || item.source_text)
          pendingTexts.delete(item.source_text)
        })
        scheduleApply()
      } catch {
        texts.forEach((text) => pendingTexts.delete(text))
      }
    }

    function collectTranslatableNodes() {
      const nodes: Text[] = []
      const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement
          if (!parent) return NodeFilter.FILTER_REJECT
          if (parent.closest('[data-no-auto-translate="true"]')) return NodeFilter.FILTER_REJECT
          if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT
          if (parent.closest('input, textarea, select, option, code, pre')) return NodeFilter.FILTER_REJECT
          return shouldTranslateText(node.textContent || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
        },
      })

      let current = walker.nextNode()
      while (current) {
        nodes.push(current as Text)
        current = walker.nextNode()
      }

      return nodes
    }

    function applyLanguage() {
      const nodes = collectTranslatableNodes()

      if (language === 'en') {
        nodes.forEach((node) => {
          const original = originalTextByNode.get(node)
          if (original && node.textContent !== original) {
            node.textContent = original
          }
        })
        return
      }

      const batch: string[] = []
      for (const node of nodes) {
        const currentText = node.textContent || ''
        const original = originalTextByNode.get(node) || currentText
        if (!originalTextByNode.has(node)) {
          originalTextByNode.set(node, original)
        }

        const translated = cache.get(original)
        if (translated) {
          if (node.textContent !== translated) {
            node.textContent = translated
          }
          continue
        }

        if (!pendingTexts.has(original) && !batch.includes(original)) {
          batch.push(original)
        }
      }

      if (batch.length) {
        void flushBatch(batch.slice(0, 25))
      }
    }

    function scheduleApply() {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null
        applyLanguage()
      })
    }

    scheduleApply()

    const observer = new MutationObserver(() => {
      scheduleApply()
    })
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    observerRef.current = observer

    return () => {
      observer.disconnect()
      observerRef.current = null
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [language])
}
