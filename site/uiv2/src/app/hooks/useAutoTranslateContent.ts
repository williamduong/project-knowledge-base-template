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

type AttributeTarget = {
  element: Element
  attribute: 'placeholder' | 'title' | 'aria-label'
  original: string
}

const DOMAIN_TERMS = [
  'SVFactory',
  'KBX',
  'Intent',
  'Objective',
  'Key Result',
  'GraphDB',
  'DNA',
  'Flow',
  'Gate',
  'Rules',
  'Workspace',
] as const

const TEXT_SKIP_TAGS = new Set([
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

const AUTO_TRANSLATE_SKIP_SELECTOR = [
  '[data-no-auto-translate="true"]',
  '.shell-command-bar',
  '.shell-tab-strip',
  '.planning-stage-nav',
  '.planning-filter-row',
  '.system-menu-list',
  '.system-menu-trigger',
  '.workspace-tab-list',
  '.tab-strip',
  '[role="tablist"]',
  '[role="tab"]',
].join(', ')

function shouldTranslateText(value: string) {
  const text = value.trim()
  if (!text) return false
  if (text.length < 2) return false
  if (!/[A-Za-z]/.test(text)) return false
  if (/^(http|\/|[A-Z0-9_\-.:/]+)$/.test(text)) return false
  return true
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function protectDomainTerms(text: string) {
  let protectedText = text
  const replacements: Array<[string, string]> = []
  const sortedTerms = [...DOMAIN_TERMS].sort((left, right) => right.length - left.length)

  sortedTerms.forEach((term, index) => {
    const token = `ZXQTERM${index}QXZ`
    const pattern = term.includes(' ')
      ? new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi')
      : new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi')
    if (pattern.test(protectedText)) {
      replacements.push([token, term])
      protectedText = protectedText.replace(pattern, token)
    }
  })

  return {
    text: protectedText,
    replacements,
  }
}

function restoreDomainTerms(text: string, replacements: Array<[string, string]>) {
  return replacements.reduce((current, [token, term]) => current.split(token).join(term), text)
}

function shouldSkipElement(element: Element | null) {
  if (!element) return true
  if (TEXT_SKIP_TAGS.has(element.tagName)) return true
  if (element.closest(AUTO_TRANSLATE_SKIP_SELECTOR)) return true
  if (element.closest('input, textarea, select, option, code, pre')) return true
  return false
}

async function translateViaGoogleFallback(texts: string[]) {
  const items = await Promise.all(texts.map(async (text) => {
    const protectedPayload = protectDomainTerms(text)
    const endpoint = new URL('https://translate.googleapis.com/translate_a/single')
    endpoint.searchParams.set('client', 'gtx')
    endpoint.searchParams.set('sl', 'auto')
    endpoint.searchParams.set('tl', 'vi')
    endpoint.searchParams.set('dt', 't')
    endpoint.searchParams.set('q', protectedPayload.text)

    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
      },
    })
    if (!response.ok) {
      throw new Error(`Fallback translate failed: ${response.status} ${response.statusText}`)
    }
    const payload = await response.json() as unknown[]
    const translated = Array.isArray(payload?.[0])
      ? (payload[0] as unknown[])
        .filter((part): part is [string, ...unknown[]] => Array.isArray(part) && typeof part[0] === 'string')
        .map((part) => String(part[0]))
        .join('')
      : text

    return {
      source_text: text,
      translated_text: restoreDomainTerms(translated, protectedPayload.replacements),
    }
  }))

  return items
}

export function useAutoTranslateContent(language: UiLanguage) {
  const originalTextByNodeRef = useRef(new WeakMap<Text, string>())
  const originalAttrByElementRef = useRef(new WeakMap<Element, Partial<Record<AttributeTarget['attribute'], string>>>())
  const cacheRef = useRef(new Map<string, string>())
  const pendingTextsRef = useRef(new Set<string>())
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const rootElement = document.querySelector('.shell-root')
    if (!rootElement) return
    const rootEl = rootElement
    const rootNode: Node = rootElement

    const originalTextByNode = originalTextByNodeRef.current
    const originalAttrByElement = originalAttrByElementRef.current
    const cache = cacheRef.current
    const pendingTexts = pendingTextsRef.current

    async function flushBatch(texts: string[]) {
      if (!texts.length) return
      texts.forEach((text) => pendingTexts.add(text))

      try {
        let items: BatchTranslateResponse['items']
        try {
          const response = await apiPost<BatchTranslateResponse>('/api/system/translate-batch', {
            texts,
            target_language: 'vi',
          })
          items = response.items
        } catch {
          items = await translateViaGoogleFallback(texts)
        }

        items.forEach((item) => {
          cache.set(item.source_text, item.translated_text || item.source_text)
          pendingTexts.delete(item.source_text)
        })
        scheduleApply()
      } catch {
        texts.forEach((text) => pendingTexts.delete(text))
      }
    }

    function collectTextNodes() {
      const nodes: Text[] = []
      const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement
          if (!parent) return NodeFilter.FILTER_REJECT
          if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT
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

    function collectAttributeTargets() {
      const targets: AttributeTarget[] = []
      const elements = rootEl.querySelectorAll('[placeholder], [title], [aria-label]')

      elements.forEach((element) => {
        if (shouldSkipElement(element)) return
        ;(['placeholder', 'title', 'aria-label'] as const).forEach((attribute) => {
          const value = element.getAttribute(attribute)
          if (!value || !shouldTranslateText(value)) return
          targets.push({
            element,
            attribute,
            original: value,
          })
        })
      })

      return targets
    }

    function applyLanguage() {
      const textNodes = collectTextNodes()
      const attributeTargets = collectAttributeTargets()

      if (language === 'en') {
        textNodes.forEach((node) => {
          const original = originalTextByNode.get(node)
          if (original && node.textContent !== original) {
            node.textContent = original
          }
        })
        attributeTargets.forEach(({ element, attribute }) => {
          const originalMap = originalAttrByElement.get(element)
          const original = originalMap?.[attribute]
          if (original && element.getAttribute(attribute) !== original) {
            element.setAttribute(attribute, original)
          }
        })
        return
      }

      const batch: string[] = []

      for (const node of textNodes) {
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
        } else if (!pendingTexts.has(original) && !batch.includes(original)) {
          batch.push(original)
        }
      }

      for (const target of attributeTargets) {
        const originalMap = originalAttrByElement.get(target.element) || {}
        if (!originalMap[target.attribute]) {
          originalMap[target.attribute] = target.original
          originalAttrByElement.set(target.element, originalMap)
        }

        const translated = cache.get(target.original)
        if (translated) {
          if (target.element.getAttribute(target.attribute) !== translated) {
            target.element.setAttribute(target.attribute, translated)
          }
        } else if (!pendingTexts.has(target.original) && !batch.includes(target.original)) {
          batch.push(target.original)
        }
      }

      if (batch.length) {
        void flushBatch(batch.slice(0, 50))
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
    observer.observe(rootEl, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    })

    return () => {
      observer.disconnect()
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [language])
}
