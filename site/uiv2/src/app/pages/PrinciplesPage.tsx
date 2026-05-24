import { Icon } from '@iconify/react'
import ruleIcon from '@iconify-icons/lucide/scroll'
import folderIcon from '@iconify-icons/lucide/folder'
import alertIcon from '@iconify-icons/lucide/alert-circle'
import checkIcon from '@iconify-icons/lucide/check'
import { useState } from 'react'
import { usePrinciplesList, usePrinciple, usePrinciplesDomainStats, usePrinciplesCoverageStatus, type Principle, type PrincipleDetail } from '../hooks/usePrinciplesGraph'

function PrincipleListItem({ principle, isSelected, onSelect }: { principle: Principle; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      className={`principles-list-item${isSelected ? ' principles-list-item-selected' : ''}`}
      onClick={onSelect}
    >
      <div className="principles-list-item-header">
        <Icon icon={ruleIcon} className="principles-list-icon" aria-hidden="true" />
        <span className="principles-list-title">{principle.title}</span>
        {principle.code_symbol_count > 0 && (
          <span className="status-pill status-good" title="Has code coverage">
            {principle.code_symbol_count}
          </span>
        )}
        {principle.code_symbol_count === 0 && (
          <span className="status-pill status-warn" title="No code coverage yet">
            0
          </span>
        )}
      </div>
      <div className="principles-list-meta">
        <Icon icon={folderIcon} aria-hidden="true" />
        <span className="principles-list-domain">{principle.domain}</span>
      </div>
    </button>
  )
}

function PrincipleDetailPanel({ principle }: { principle: PrincipleDetail | null }) {
  if (!principle) {
    return (
      <div className="principles-detail-empty">
        <Icon icon={ruleIcon} className="principles-detail-empty-icon" aria-hidden="true" />
        <p>Select a principle to view details</p>
      </div>
    )
  }

  return (
    <div className="principles-detail-panel">
      <div className="principles-detail-header">
        <h2 className="principles-detail-title">{principle.title}</h2>
        <span className="meta-pill">{principle.domain}</span>
      </div>

      {principle.statement && (
        <section className="principles-detail-section">
          <h3>Principle Statement</h3>
          <p className="principles-detail-text">{principle.statement}</p>
        </section>
      )}

      {principle.motivation && (
        <section className="principles-detail-section">
          <h3>Motivation</h3>
          <p className="principles-detail-text">{principle.motivation}</p>
        </section>
      )}

      {principle.examples && (
        <section className="principles-detail-section">
          <h3>Examples</h3>
          <p className="principles-detail-text">{principle.examples}</p>
        </section>
      )}

      {principle.code_symbol_count > 0 && (
        <section className="principles-detail-section">
          <h3>Code Coverage ({principle.code_symbol_count})</h3>
          <p className="principles-detail-note">
            <Icon icon={checkIcon} aria-hidden="true" />
            This principle applies to {principle.code_symbol_count} code symbol{principle.code_symbol_count !== 1 ? 's' : ''}.
          </p>
          <div className="principles-symbols-list">
            {principle.code_symbols.map((symbol) => (
              <div key={symbol.id} className="principles-symbol-card">
                <code className="principles-symbol-id">{symbol.id}</code>
              </div>
            ))}
          </div>
        </section>
      )}

      {principle.code_symbol_count === 0 && (
        <section className="principles-detail-section principles-detail-note-warn">
          <p>
            <Icon icon={alertIcon} aria-hidden="true" />
            <strong>No code coverage:</strong> This principle has not been linked to code symbols yet. This happens after Code Graph Phase 1 completes and principle-to-code matching runs.
          </p>
        </section>
      )}

      <section className="principles-detail-section principles-detail-meta">
        <p><strong>Domain:</strong> {principle.domain}</p>
        <p><strong>Extracted:</strong> {new Date(principle.extracted_at).toLocaleDateString()}</p>
      </section>
    </div>
  )
}

function CoverageStatus({ coverage }: { coverage: { total: number; covered: number; uncovered: number; coverage_percent: number } }) {
  return (
    <div className="principles-coverage-status">
      <div className="principles-coverage-stat">
        <span className="principles-coverage-label">Code Coverage</span>
        <div className="principles-coverage-bar">
          <div
            className="principles-coverage-fill"
            style={{ width: `${coverage.coverage_percent}%` }}
          />
        </div>
        <span className="principles-coverage-percent">{coverage.coverage_percent}% ({coverage.covered}/{coverage.total})</span>
      </div>
      <p className="principles-coverage-note">
        Coverage will increase after Code Graph Phase 1 is complete. Currently {coverage.uncovered} principle{coverage.uncovered !== 1 ? 's' : ''} awaiting code symbol links.
      </p>
    </div>
  )
}

export function PrinciplesPage() {
  const [selectedPrincipleId, setSelectedPrincipleId] = useState<string | null>(null)
  const [domainFilter, setDomainFilter] = useState<string | null>(null)

  const principlesQuery = usePrinciplesList()
  const principleQuery = usePrinciple(selectedPrincipleId)
  const domainsQuery = usePrinciplesDomainStats()
  const coverageQuery = usePrinciplesCoverageStatus()

  const filteredPrinciples = domainFilter
    ? principlesQuery.data?.filter((p) => p.domain === domainFilter) ?? []
    : principlesQuery.data ?? []

  return (
    <section className="workspace-page principles-page">
      {coverageQuery.data && (
        <CoverageStatus coverage={coverageQuery.data} />
      )}

      <div className="principles-shell">
        {/* Left rail — principles list with domain filter */}
        <aside className="principles-left-rail">
          <div className="principles-rail-header">
            <h2 className="principles-rail-title">
              <Icon icon={ruleIcon} aria-hidden="true" />
              Principles
            </h2>
          </div>

          {domainsQuery.data && (
            <div className="principles-domain-filter">
              <p className="principles-filter-label">Filter by domain:</p>
              <div className="principles-domain-chips">
                <button
                  type="button"
                  className={`meta-pill${domainFilter === null ? ' meta-pill-active' : ''}`}
                  onClick={() => setDomainFilter(null)}
                >
                  All ({domainsQuery.data.total})
                </button>
                {Object.entries(domainsQuery.data.by_domain).map(([domain, count]) => (
                  <button
                    key={domain}
                    type="button"
                    className={`meta-pill${domainFilter === domain ? ' meta-pill-active' : ''}`}
                    onClick={() => setDomainFilter(domain)}
                  >
                    {domain} ({count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {principlesQuery.isLoading ? (
            <div className="prototype-skeleton-stack">
              <span />
              <span />
              <span />
            </div>
          ) : filteredPrinciples.length > 0 ? (
            <div className="principles-list">
              {filteredPrinciples.map((principle) => (
                <PrincipleListItem
                  key={principle.id}
                  principle={principle}
                  isSelected={selectedPrincipleId === principle.id}
                  onSelect={() => setSelectedPrincipleId(principle.id)}
                />
              ))}
            </div>
          ) : (
            <p className="principles-empty">
              {domainFilter
                ? `No principles in "${domainFilter}" domain`
                : 'No principles found'}
            </p>
          )}
        </aside>

        {/* Right panel — principle details */}
        <section className="principles-detail surface-panel surface-panel-primary">
          {principleQuery.isLoading ? (
            <div className="prototype-skeleton-stack">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <PrincipleDetailPanel principle={principleQuery.data ?? null} />
          )}
        </section>
      </div>
    </section>
  )
}
