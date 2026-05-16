import { intentRows } from '../shell-data'

export function IntentsListPage() {
  return (
    <section className="workspace-page">
      <header className="workspace-toolbar">
        <div>
          <p className="workspace-eyebrow">Intent First Slice</p>
          <h1>Intents</h1>
        </div>
        <div className="toolbar-actions">
          <button className="tool-button" type="button">
            Refresh List
          </button>
          <button className="tool-button tool-button-primary" type="button">
            Create Draft Intent
          </button>
        </div>
      </header>

      <div className="workspace-grid intent-workspace-grid">
        <section className="surface-panel surface-panel-primary">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Inventory</p>
              <h2>Intent Queue</h2>
            </div>
            <div className="panel-toolbar-meta">
              <span className="count-pill">{intentRows.length} total</span>
              <span className="count-pill">1 active focus</span>
            </div>
          </div>

          <div className="intent-table" role="table" aria-label="Intent list">
            <div className="intent-table-header" role="row">
              <span role="columnheader">Intent</span>
              <span role="columnheader">State</span>
              <span role="columnheader">Priority</span>
              <span role="columnheader">Next</span>
              <span role="columnheader">Block</span>
            </div>
            {intentRows.map((intent) => (
              <article key={intent.id} className="intent-row" role="row">
                <div className="intent-main-cell" role="cell">
                  <h3>{intent.title}</h3>
                  <p className="intent-id">{intent.id}</p>
                  <p className="intent-focus">{intent.focus}</p>
                </div>
                <div role="cell">
                  <span className={`status-pill status-${intent.state}`}>{intent.state}</span>
                </div>
                <div role="cell">
                  <span className="meta-pill">{intent.priority}</span>
                </div>
                <p role="cell">{intent.nextAction}</p>
                <p role="cell">{intent.blockReason}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="surface-panel compact-note-panel">
          <div className="panel-toolbar">
            <div>
              <p className="workspace-eyebrow">Confirmed Contract</p>
              <h2>Scan Snapshot</h2>
            </div>
          </div>
          <ul className="signal-list">
            <li>Intent list already exists in the legacy runtime.</li>
            <li>Intent detail is the next build slice inside this workspace.</li>
            <li>Create, update, approve, preview, and apply remain required lifecycle actions.</li>
            <li>Task stays nested under Intent before any broader task aggregation.</li>
            <li>Current parity is notes-backed until direct source/runtime evidence is restored on this branch.</li>
          </ul>
        </section>
      </div>
    </section>
  )
}