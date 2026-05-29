import { Link } from 'react-router-dom'

type PlaceholderPageProps = {
  title: string
  subtitle: string
  next: string
  actionLinks?: Array<{
    label: string
    to: string
  }>
}

export function PlaceholderPage(props: PlaceholderPageProps) {
  return (
    <section className="workspace-page">
      <header className="workspace-toolbar">
        <div>
          <p className="workspace-eyebrow">{props.title}</p>
          <h1>{props.title}</h1>
        </div>
        <div className="toolbar-actions">
          <button className="tool-button" type="button">
            Focus View
          </button>
          <button className="tool-button" type="button">
            Inspect
          </button>
          {props.actionLinks?.map((action) => (
            <Link key={action.to} className="tool-button tool-button-primary" to={action.to}>
              {action.label}
            </Link>
          ))}
        </div>
      </header>

      <div className="workspace-grid single-column-grid">
        <section className="surface-panel surface-panel-primary">
          <h2>Current Slice</h2>
          <p>{props.subtitle}</p>
        </section>
        <section className="surface-panel compact-note-panel">
          <h2>Next</h2>
          <p>{props.next}</p>
        </section>
      </div>
    </section>
  )
}
