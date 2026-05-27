import { Icon } from '@iconify/react'
import braces from '@iconify-icons/lucide/braces'
import flag from '@iconify-icons/lucide/flag'
import shield from '@iconify-icons/lucide/shield'
import gitBranch from '@iconify-icons/lucide/git-branch'
import wrench from '@iconify-icons/lucide/wrench'
import dna from '@iconify-icons/lucide/dna'
import server from '@iconify-icons/lucide/server'
import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <section className="workspace-page">
      <header className="workspace-toolbar">
        <div>
          <p className="workspace-eyebrow">SVFactory Mode</p>
          <h1>Dashboard</h1>
          <p>Dashboard stays intentionally thin. Mature details must be built inside real workspaces first, then summarized here later.</p>
        </div>
        <div className="toolbar-actions">
          <span className="meta-pill">Mode svfactory</span>
          <span className="meta-pill">Dashboard deferred</span>
        </div>
      </header>

      <div className="workspace-grid single-column-grid">
        <section className="surface-panel surface-panel-primary">
          <div>
            <p className="workspace-eyebrow">Build Order</p>
            <div className="section-title-row">
              <span className="section-icon section-icon-runtime" aria-hidden="true">
                <Icon icon={braces} />
              </span>
              <h2>Factory First</h2>
            </div>
            <p className="home-hero-copy">The current execution policy is SVFactory-only mode. Finish the factory workspaces in order, then unlock downstream KBX generation mode.</p>
          </div>
          <div className="home-inline-summary-row">
            <span className="meta-pill">1. Code</span>
            <span className="meta-pill">2. Intent</span>
            <span className="meta-pill">3. Rules</span>
            <span className="meta-pill">4. Flow</span>
            <span className="meta-pill">5. Tools</span>
            <span className="meta-pill">6. DNA</span>
            <span className="meta-pill">7. System</span>
          </div>
        </section>

        <section className="home-dashboard-grid">
          <section className="home-dashboard-section">
            <div className="home-section-heading">
              <p className="workspace-eyebrow">Active Workspaces</p>
              <h2>Current Factory Surfaces</h2>
            </div>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Foundation</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-runtime" aria-hidden="true">
                      <Icon icon={braces} />
                    </span>
                    <h2>Code</h2>
                  </div>
                </div>
                <Link className="tool-button" to="/code">
                  Open
                </Link>
              </div>
              <p className="home-dashboard-copy">Code Graph is the first workspace being brought to completion because it becomes substrate for impact, rules, and later DNA generation checks.</p>
            </article>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Workflow</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-intent" aria-hidden="true">
                      <Icon icon={flag} />
                    </span>
                    <h2>Intent</h2>
                  </div>
                </div>
                <Link className="tool-button" to="/intents">
                  Open
                </Link>
              </div>
              <p className="home-dashboard-copy">Intent remains the next major slice after Code, but should become more graph-backed and ontology-aware before Dashboard starts summarizing it.</p>
            </article>
          </section>

          <section className="home-dashboard-section">
            <div className="home-section-heading">
              <p className="workspace-eyebrow">Control Surfaces</p>
              <h2>Harness, Flow, Actions</h2>
            </div>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Harness</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-kb" aria-hidden="true">
                      <Icon icon={shield} />
                    </span>
                    <h2>Rules</h2>
                  </div>
                </div>
                <Link className="tool-button" to="/rules">
                  Open
                </Link>
              </div>
              <p className="home-dashboard-copy">Rules are the agent harness. They should become complete before Flow, Tools, and DNA start depending on them heavily.</p>
            </article>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Execution Grammar</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-intent" aria-hidden="true">
                      <Icon icon={gitBranch} />
                    </span>
                    <h2>Flow</h2>
                  </div>
                </div>
                <Link className="tool-button" to="/flow">
                  Open
                </Link>
              </div>
              <p className="home-dashboard-copy">Flow will become the umbrella term for pipeline, gates, triggers, and processes. Gate stays first-class, but not as a separate top-level island.</p>
            </article>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Execution Arms</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-runtime" aria-hidden="true">
                      <Icon icon={wrench} />
                    </span>
                    <h2>Tools</h2>
                  </div>
                </div>
                <Link className="tool-button" to="/tools">
                  Open
                </Link>
              </div>
              <p className="home-dashboard-copy">Tools will become the governed action registry so agents act through approved capabilities instead of improvising direct mutation paths.</p>
            </article>
          </section>

          <section className="home-dashboard-section">
            <div className="home-section-heading">
              <p className="workspace-eyebrow">Factory Package</p>
              <h2>DNA And Runtime</h2>
            </div>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Generation</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-kb" aria-hidden="true">
                      <Icon icon={dna} />
                    </span>
                    <h2>DNA</h2>
                  </div>
                </div>
                <Link className="tool-button" to="/dna">
                  Open
                </Link>
              </div>
              <p className="home-dashboard-copy">DNA remains a late workspace in the build sequence because it should package stable ontology, rules, flow, tools, and release readiness instead of acting like a loose document bucket.</p>
            </article>

            <article className="surface-panel home-dashboard-card">
              <div className="panel-toolbar">
                <div>
                  <p className="workspace-eyebrow">Operations</p>
                  <div className="section-title-row">
                    <span className="section-icon section-icon-runtime" aria-hidden="true">
                      <Icon icon={server} />
                    </span>
                    <h2>System</h2>
                  </div>
                </div>
                <Link className="tool-button" to="/system">
                  Open
                </Link>
              </div>
              <p className="home-dashboard-copy">System remains necessary, but its scope should shrink to runtime services, health, snapshots, cron, and recovery rather than hosting rules or flow forever.</p>
            </article>
          </section>
        </section>
      </div>
    </section>
  )
}
