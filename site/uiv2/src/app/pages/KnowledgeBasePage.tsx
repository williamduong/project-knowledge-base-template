import { Icon } from '@iconify/react'
import bookOpen from '@iconify-icons/lucide/book-open'
import chevronRight from '@iconify-icons/lucide/chevron-right'
import chevronDown from '@iconify-icons/lucide/chevron-down'
import panelLeftClose from '@iconify-icons/lucide/panel-left-close'
import panelLeftOpen from '@iconify-icons/lucide/panel-left-open'
import panelRightOpen from '@iconify-icons/lucide/panel-right-open'
import xIcon from '@iconify-icons/lucide/x'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useKbTree, useKbDoc } from '../hooks/useKb'
import type { KbDocStatus, KbDocType, KbTimeState, KbTreeFolderNode, KbTreeNode, KbVerification } from '../mock/kb-mock'

type RailMode = 'expanded' | 'icon'

// Glyph by document type — single character, neutral color.
const typeGlyph: Record<KbDocType, string> = {
  architecture: '◆',
  reference: '◇',
  decision: '◈',
  orientation: '▸',
  implementation: '●',
  concept: '○',
  governance: '▣',
  guide: '△',
  operations: '▽',
  'test-strategy': '◧',
  unknown: '·',
}

const typeShort: Record<KbDocType, string> = {
  architecture: 'arch',
  reference: 'ref',
  decision: 'adr',
  orientation: 'ori',
  implementation: 'impl',
  concept: 'con',
  governance: 'gov',
  guide: 'gd',
  operations: 'ops',
  'test-strategy': 'test',
  unknown: '—',
}

// Status pill tone reuses existing status-* classes from styles.css.
function statusTone(status: KbDocStatus): string {
  if (status === 'active') return 'status-good'
  if (status === 'draft') return 'status-neutral'
  if (status === 'deprecated') return 'status-warn'
  if (status === 'archived') return 'status-offline'
  return 'status-neutral'
}

function verificationTone(v: KbVerification): string {
  if (v === 'code-verified') return 'status-good'
  if (v === 'design-only') return 'status-neutral'
  if (v === 'self-referential') return 'status-neutral'
  if (v === 'unverified') return 'status-warn'
  return 'status-neutral'
}

function timeStateTone(t: KbTimeState): string {
  if (t === 'mixed') return 'status-warn'
  if (t === 'to_be') return 'status-neutral'
  if (t === 'historical') return 'status-offline'
  return 'status-neutral'
}

function staleDot(daysSinceVerified: number): { tone: string; title: string } | null {
  if (daysSinceVerified >= 180) return { tone: 'bg-rose-500', title: `Verified ${daysSinceVerified}d ago (>180d)` }
  if (daysSinceVerified >= 60) return { tone: 'bg-amber-400', title: `Verified ${daysSinceVerified}d ago (>60d)` }
  return null
}

function isFolder(n: KbTreeNode): n is KbTreeFolderNode {
  return n.kind === 'folder'
}

type TreeRowProps = {
  node: KbTreeNode
  depth: number
  selectedPath: string | null
  onSelect: (path: string) => void
  expandedFolders: Set<string>
  onToggleFolder: (path: string) => void
}

function TreeRow({ node, depth, selectedPath, onSelect, expandedFolders, onToggleFolder }: TreeRowProps) {
  if (isFolder(node)) {
    const isOpen = expandedFolders.has(node.path)
    const folderStale = node.stalest ? staleDot(node.stalest.daysSinceVerified) : null
    return (
      <>
        <button
          type="button"
          className="kb-tree-row kb-tree-row-folder"
          style={{ paddingLeft: 6 + depth * 12 }}
          onClick={() => onToggleFolder(node.path)}
          title={folderStale?.title ?? `${node.docCount} docs`}
        >
          <Icon icon={isOpen ? chevronDown : chevronRight} aria-hidden="true" />
          <span className="kb-tree-folder-name">{node.title}</span>
          <span className="kb-tree-folder-count">{node.docCount}</span>
          {folderStale ? <span className={`kb-tree-dot ${folderStale.tone}`} aria-hidden="true" /> : null}
        </button>
        {isOpen
          ? node.children.map((child) => (
              <TreeRow
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
              />
            ))
          : null}
      </>
    )
  }

  const dot = staleDot(node.daysSinceVerified)
  const active = selectedPath === node.path
  return (
    <button
      type="button"
      className={`kb-tree-row kb-tree-row-doc${active ? ' active' : ''}`}
      style={{ paddingLeft: 6 + depth * 12 }}
      onClick={() => onSelect(node.path)}
      title={`${node.title} · verified ${node.daysSinceVerified}d ago`}
    >
      <span className="kb-tree-glyph" aria-hidden="true">{typeGlyph[node.type]}</span>
      <span className="kb-tree-doc-name">{node.title}</span>
      <span className="kb-tree-doc-tag">{typeShort[node.type]}</span>
      <span className={`status-pill ${statusTone(node.status)} kb-tree-status-pill`}>{statusShortGlyph(node.status, node.verification)}</span>
      {dot ? <span className={`kb-tree-dot ${dot.tone}`} aria-hidden="true" /> : null}
    </button>
  )
}

function statusShortGlyph(status: KbDocStatus, verification: KbVerification): string {
  if (status === 'deprecated') return '✕'
  if (status === 'archived') return '▒'
  if (status === 'draft') return '◐'
  if (verification === 'code-verified') return '✓'
  if (verification === 'unverified') return '⚠'
  return '•'
}

function flattenFolderPaths(root: KbTreeFolderNode, out: string[]): string[] {
  out.push(root.path)
  for (const child of root.children) if (isFolder(child)) flattenFolderPaths(child, out)
  return out
}

export function KnowledgeBasePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedPath = searchParams.get('path')
  const leftMode: RailMode = (searchParams.get('left') as RailMode) ?? 'expanded'
  const rightOpen = searchParams.get('right') === 'open'

  const treeQuery = useKbTree()
  const docQuery = useKbDoc(selectedPath)

  const initialFolders = useMemo(() => {
    if (!treeQuery.data) return new Set<string>()
    return new Set(flattenFolderPaths(treeQuery.data.root, []))
  }, [treeQuery.data])

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(initialFolders)
  // Sync expanded set when tree data arrives the first time.
  useMemo(() => {
    if (expandedFolders.size === 0 && initialFolders.size > 0) setExpandedFolders(initialFolders)
  }, [initialFolders, expandedFolders.size])

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  const handleSelect = (path: string) => setParam('path', path)
  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }
  const toggleLeft = () => setParam('left', leftMode === 'expanded' ? 'icon' : 'expanded')
  const toggleRight = () => setParam('right', rightOpen ? null : 'open')

  const doc = docQuery.data
  const fm = doc?.frontmatter

  return (
    <section className="workspace-page kb-page">
      <div className="kb-shell">
        {/* LEFT RAIL */}
        <aside className={`kb-left-rail ${leftMode === 'icon' ? 'kb-rail-icon' : 'kb-rail-expanded'}`}>
          {leftMode === 'expanded' ? (
            <>
              <div className="kb-rail-toolbar">
                <div className="kb-rail-title">
                  <Icon icon={bookOpen} aria-hidden="true" />
                  <strong>Knowledge Base</strong>
                </div>
                <button className="icon-tool-button" type="button" aria-label="Collapse tree" onClick={toggleLeft}>
                  <Icon icon={panelLeftClose} />
                </button>
              </div>
              <div className="kb-tree-scroll">
                {treeQuery.isLoading ? (
                  <div className="prototype-skeleton-stack"><span /><span /><span /></div>
                ) : treeQuery.data ? (
                  treeQuery.data.root.children.map((child) => (
                    <TreeRow
                      key={child.path}
                      node={child}
                      depth={0}
                      selectedPath={selectedPath}
                      onSelect={handleSelect}
                      expandedFolders={expandedFolders}
                      onToggleFolder={toggleFolder}
                    />
                  ))
                ) : (
                  <p className="kb-empty">Tree unavailable</p>
                )}
              </div>
            </>
          ) : (
            <button className="icon-tool-button kb-rail-float-trigger" type="button" aria-label="Open tree" onClick={toggleLeft}>
              <Icon icon={panelLeftOpen} />
            </button>
          )}
        </aside>

        {/* CENTER — READER */}
        <section className="kb-reader surface-panel surface-panel-primary">
          {!selectedPath ? (
            <div className="kb-reader-empty">
              <span className="runtime-overview-label">Knowledge Base</span>
              <h2>Pick a document from the tree</h2>
              <p className="rules-cell-copy">The reader renders frontmatter chips at the top, then the document body. Use the right rail for outline and metadata.</p>
            </div>
          ) : docQuery.isLoading || !fm ? (
            <div className="prototype-skeleton-stack"><span /><span /><span /></div>
          ) : (
            <>
              {/* MetaBar */}
              <div className="kb-meta-bar">
                <h1 className="kb-doc-title">{fm.title}</h1>
                <div className="kb-meta-chips">
                  <span className={`status-pill ${statusTone(fm.status)}`}>{fm.status}</span>
                  <span className="meta-pill">{fm.type}</span>
                  <span className={`status-pill ${verificationTone(fm.verification)}`}>{fm.verification}</span>
                  <span className={`status-pill ${timeStateTone(fm.time_state)}`}>time: {fm.time_state}</span>
                  <span className="meta-pill">owner: {fm.owner || '—'}</span>
                </div>
                <div className="kb-meta-dates">
                  <span>Updated {fm.last_updated || '—'}</span>
                  <span>Verified {fm.last_verified || '—'}</span>
                  {fm.released_in ? <span>Released {fm.released_in}</span> : null}
                </div>
                <div className="kb-meta-actions">
                  <button className="icon-tool-button" type="button" aria-label="Open side panel" onClick={toggleRight}>
                    <Icon icon={panelRightOpen} />
                  </button>
                </div>
              </div>

              {/* Conditional banners */}
              {fm.status === 'draft' ? (
                <div className="kb-banner kb-banner-neutral">Draft — claims chưa lock. Đừng dùng làm source-of-truth.</div>
              ) : null}
              {fm.verification === 'unverified' && (fm.type === 'reference' || fm.type === 'implementation') ? (
                <div className="kb-banner kb-banner-warn">Cần verify trước khi dùng làm source-of-truth.</div>
              ) : null}
              {fm.time_state === 'mixed' ? (
                <div className="kb-banner kb-banner-warn">Doc trộn Current State và Target State — đọc kỹ.</div>
              ) : null}

              {/* Body */}
              <article className="kb-doc-body" dangerouslySetInnerHTML={{ __html: doc!.html }} />

              {/* Related */}
              {(fm.related_strong.length > 0 || fm.related_weak.length > 0) ? (
                <footer className="kb-related">
                  {fm.related_strong.length > 0 ? (
                    <div className="kb-related-group">
                      <span className="runtime-overview-label">Related (strong)</span>
                      <div className="rules-pill-row">
                        {fm.related_strong.map((p) => (
                          <button key={p} className="meta-pill kb-pill-strong" type="button" onClick={() => handleSelect(p)} title={p}>
                            {p.split('/').pop()}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {fm.related_weak.length > 0 ? (
                    <div className="kb-related-group">
                      <span className="runtime-overview-label">Related (weak)</span>
                      <div className="rules-pill-row">
                        {fm.related_weak.map((p) => (
                          <button key={p} className="meta-pill kb-pill-weak" type="button" onClick={() => handleSelect(p)} title={p}>
                            {p.split('/').pop()}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </footer>
              ) : null}
            </>
          )}
        </section>

        {/* RIGHT RAIL — floating drawer */}
        {rightOpen ? (
          <aside className="kb-right-rail surface-panel">
            <div className="panel-toolbar">
              <div>
                <p className="workspace-eyebrow">Document</p>
                <h2>Outline</h2>
              </div>
              <button className="icon-tool-button" type="button" aria-label="Close panel" onClick={toggleRight}>
                <Icon icon={xIcon} />
              </button>
            </div>
            {doc && doc.headings.length > 0 ? (
              <nav className="kb-toc">
                {doc.headings.map((h) => (
                  <a key={h.id} href={`#${h.id}`} className="kb-toc-item" data-level={h.level}>
                    {h.text}
                  </a>
                ))}
              </nav>
            ) : (
              <p className="kb-empty">No outline yet.</p>
            )}

            {fm ? (
              <div className="kb-meta-panel">
                <span className="runtime-overview-label">Metadata</span>
                <dl className="kb-meta-dl">
                  <dt>type</dt><dd>{fm.type}</dd>
                  <dt>status</dt><dd>{fm.status}</dd>
                  <dt>verification</dt><dd>{fm.verification}</dd>
                  <dt>time_state</dt><dd>{fm.time_state}</dd>
                  <dt>owner</dt><dd>{fm.owner || '—'}</dd>
                  <dt>last_verified_commit</dt><dd>{fm.last_verified_commit || '—'}</dd>
                  <dt>source_of_truth</dt><dd>{fm.source_of_truth || '—'}</dd>
                  {fm.tags.length > 0 ? <><dt>tags</dt><dd>{fm.tags.join(', ')}</dd></> : null}
                </dl>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  )
}
