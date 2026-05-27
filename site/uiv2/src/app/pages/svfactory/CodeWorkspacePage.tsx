import { Icon } from '@iconify/react'
import braces from '@iconify-icons/lucide/braces'
import boxes from '@iconify-icons/lucide/boxes'
import network from '@iconify-icons/lucide/network'
import sparkles from '@iconify-icons/lucide/sparkles'
import fileCode from '@iconify-icons/lucide/file-code-2'
import { useCodeWorkspace } from '../../hooks/svfactory/useCodeWorkspace'

function formatPercent(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0%'
  }

  return `${Math.round(value)}%`
}

export function CodeWorkspacePage() {
  const {
    selectedKind,
    setSelectedKind,
    exportedOnly,
    setExportedOnly,
    statsQuery,
    coverageQuery,
    symbolsQuery,
    availableKinds,
    topFiles,
  } = useCodeWorkspace()

  const stats = statsQuery.data
  const coverage = coverageQuery.data
  const symbols = symbolsQuery.data ?? []

  return (
    <section className="workspace-page">
      <header className="workspace-toolbar">
        <div>
          <p className="workspace-eyebrow">SVFactory Mode</p>
          <h1>Code</h1>
          <p>Code is the first completed factory workspace. It exposes the live Code Graph substrate that later powers intent impact, rule enforcement, and DNA generation checks.</p>
        </div>
        <div className="toolbar-actions">
          <span className="meta-pill">Mode svfactory</span>
          <span className="meta-pill">Code Graph live</span>
        </div>
      </header>

      <div className="workspace-grid single-column-grid">
        <section className="surface-panel surface-panel-primary">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Code Graph</p>
              <div className="section-title-row">
                <span className="section-icon section-icon-runtime" aria-hidden="true">
                  <Icon icon={braces} />
                </span>
                <h2>Factory Code Substrate</h2>
              </div>
            </div>
            <span className="count-pill">{statsQuery.isLoading ? 'Loading' : `${stats?.total_symbols ?? 0} symbols`}</span>
          </div>

          <div className="runtime-overview-grid compact-runtime-overview-grid">
            <div className="runtime-overview-card">
              <span className="runtime-overview-label">Symbols</span>
              <strong>{stats?.total_symbols ?? 0}</strong>
            </div>
            <div className="runtime-overview-card">
              <span className="runtime-overview-label">Kinds</span>
              <strong>{Object.keys(stats?.by_kind ?? {}).length}</strong>
            </div>
            <div className="runtime-overview-card">
              <span className="runtime-overview-label">Exported</span>
              <strong>{stats?.exported_count ?? 0}</strong>
            </div>
            <div className="runtime-overview-card">
              <span className="runtime-overview-label">Coverage</span>
              <strong>{formatPercent(coverage?.coverage_percent)}</strong>
            </div>
          </div>

          <div className="home-inline-summary-row">
            <span className="meta-pill">Principles covered {coverage?.covered ?? 0}</span>
            <span className="meta-pill">Principles uncovered {coverage?.uncovered ?? 0}</span>
            <span className="meta-pill">Symbol list {symbolsQuery.isFetching ? 'refreshing' : 'ready'}</span>
          </div>
        </section>

        <section className="home-dashboard-grid">
          <section className="home-dashboard-section">
            <div className="home-section-heading">
              <p className="workspace-eyebrow">Registry Cluster</p>
              <h2>Symbol Registry</h2>
            </div>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Filters</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-kb" aria-hidden="true">
                      <Icon icon={boxes} />
                    </span>
                    <h2>Kind And Export Surface</h2>
                  </div>
                </div>
              </div>

              <div className="rules-inline-filters">
                <label className="rules-filter-field">
                  <span>Kind</span>
                  <select value={selectedKind} onChange={(event) => setSelectedKind(event.target.value)}>
                    <option value="all">All kinds</option>
                    {availableKinds.map((kind) => (
                      <option key={kind} value={kind}>{kind}</option>
                    ))}
                  </select>
                </label>
                <label className="rules-checkbox-field">
                  <input
                    type="checkbox"
                    checked={exportedOnly}
                    onChange={(event) => setExportedOnly(event.target.checked)}
                  />
                  <span>Exported only</span>
                </label>
              </div>

              {symbolsQuery.isError ? (
                <p className="runtime-error-text">Failed to load symbols: {symbolsQuery.error.message}</p>
              ) : null}
            </article>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Symbols</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-runtime" aria-hidden="true">
                      <Icon icon={fileCode} />
                    </span>
                    <h2>Recent Registry Slice</h2>
                  </div>
                </div>
                <span className="count-pill">{symbols.length} rows</span>
              </div>

              <div className="rules-table" role="table" aria-label="Code symbol list">
                <div className="rules-table-header" role="row">
                  <span role="columnheader">Symbol</span>
                  <span role="columnheader">Kind</span>
                  <span role="columnheader">File</span>
                  <span role="columnheader">Line</span>
                </div>
                {symbols.slice(0, 14).map((symbol) => (
                  <article key={symbol.id} className="rules-table-row" role="row">
                    <div role="cell">
                      <strong>{symbol.name}</strong>
                      <p className="rules-cell-copy">{symbol.exported ? 'exported' : 'internal'}</p>
                    </div>
                    <div role="cell">
                      <span className="status-pill status-live">{symbol.kind}</span>
                    </div>
                    <div role="cell">
                      <p className="rules-cell-copy">{symbol.file}</p>
                    </div>
                    <div role="cell">
                      <p className="rules-cell-copy">{symbol.line}</p>
                    </div>
                  </article>
                ))}
                {!symbolsQuery.isLoading && symbols.length === 0 ? (
                  <article className="rules-table-empty" role="row">
                    <p>No symbols match the current filters.</p>
                  </article>
                ) : null}
              </div>
            </article>
          </section>

          <section className="home-dashboard-section">
            <div className="home-section-heading">
              <p className="workspace-eyebrow">Impact Cluster</p>
              <h2>Bridges And Readiness</h2>
            </div>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Coverage</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-intent" aria-hidden="true">
                      <Icon icon={sparkles} />
                    </span>
                    <h2>Principle To Code Coverage</h2>
                  </div>
                </div>
                <span className="count-pill">{formatPercent(coverage?.coverage_percent)}</span>
              </div>

              {coverageQuery.isError ? (
                <p className="runtime-error-text">Failed to load coverage: {coverageQuery.error.message}</p>
              ) : (
                <div className="runtime-overview-grid compact-runtime-overview-grid">
                  <div className="runtime-overview-card">
                    <span className="runtime-overview-label">Total principles</span>
                    <strong>{coverage?.total ?? 0}</strong>
                  </div>
                  <div className="runtime-overview-card">
                    <span className="runtime-overview-label">Covered</span>
                    <strong>{coverage?.covered ?? 0}</strong>
                  </div>
                  <div className="runtime-overview-card">
                    <span className="runtime-overview-label">Uncovered</span>
                    <strong>{coverage?.uncovered ?? 0}</strong>
                  </div>
                  <div className="runtime-overview-card">
                    <span className="runtime-overview-label">Readiness</span>
                    <strong>{coverage && coverage.uncovered === 0 ? 'ready' : 'partial'}</strong>
                  </div>
                </div>
              )}
            </article>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Density</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-cron" aria-hidden="true">
                      <Icon icon={network} />
                    </span>
                    <h2>Top Files In Current Slice</h2>
                  </div>
                </div>
              </div>

              <div className="home-module-list compact">
                {topFiles.map((entry) => (
                  <div key={entry.file} className="home-module-row compact-row">
                    <Icon icon={fileCode} aria-hidden="true" />
                    <div>
                      <strong>{entry.file}</strong>
                      <p>{entry.count} symbol{entry.count !== 1 ? 's' : ''} in current filter set.</p>
                    </div>
                  </div>
                ))}
                {!symbolsQuery.isLoading && topFiles.length === 0 ? (
                  <div className="home-module-row compact-row">
                    <Icon icon={fileCode} aria-hidden="true" />
                    <div>
                      <strong>No files</strong>
                      <p>The current filter set returned no symbol density rows.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          </section>
        </section>
      </div>
    </section>
  )
}
