import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { intentRows, routeMeta, tabs } from './shell-data'

type SearchOverlayProps = {
  isOpen: boolean
  onClose: () => void
}

type SearchResult = {
  id: string
  title: string
  subtitle: string
  path?: string
}

export function SearchOverlay(props: SearchOverlayProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    const tabResults: SearchResult[] = tabs.map((tab) => ({
      id: `tab-${tab.path}`,
      title: tab.label,
      subtitle: routeMeta[tab.path]?.summary ?? 'Navigation target',
      path: tab.path,
    }))

    const intentResults: SearchResult[] = intentRows.map((intent) => ({
      id: intent.id,
      title: intent.title,
      subtitle: `${intent.state} · ${intent.nextAction}`,
      path: '/intents',
    }))

    const allResults = [...tabResults, ...intentResults]

    if (!normalizedQuery) {
      return allResults.slice(0, 7)
    }

    return allResults.filter((result) => {
      const haystack = `${result.title} ${result.subtitle}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [query])

  if (!props.isOpen) {
    return null
  }

  return (
    <div className="search-overlay-backdrop" role="dialog" aria-modal="true" aria-label="Search overlay">
      <div className="search-overlay-panel">
        <div className="search-overlay-header">
          <div>
            <p className="workspace-eyebrow">Search</p>
            <h2>Quick Navigation</h2>
          </div>
          <button className="tool-button" type="button" onClick={props.onClose}>
            Close
          </button>
        </div>

        <div className="search-input-shell">
          <span className="search-input-icon" aria-hidden="true">
            /search
          </span>
          <input
            autoFocus
            className="search-overlay-input"
            type="text"
            placeholder="Search tabs, intents, and shell surfaces"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="search-results-list">
          {results.length > 0 ? (
            results.map((result) => (
              <button
                key={result.id}
                className="search-result-card"
                type="button"
                onClick={() => {
                  if (result.path) {
                    navigate(result.path)
                  }
                  props.onClose()
                }}
              >
                <strong>{result.title}</strong>
                <span>{result.subtitle}</span>
              </button>
            ))
          ) : (
            <div className="search-empty-state">
              <strong>No result</strong>
              <span>Try intent IDs, tab names, or route titles.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}