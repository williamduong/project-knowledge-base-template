import { Icon } from '@iconify/react'
import bookOpen from '@iconify-icons/lucide/book-open'
import chevronRight from '@iconify-icons/lucide/chevron-right'
import chevronDown from '@iconify-icons/lucide/chevron-down'
import folderIcon from '@iconify-icons/lucide/folder'
import folderOpen from '@iconify-icons/lucide/folder-open'
import fileTextIcon from '@iconify-icons/lucide/file-text'
import fileCodeIcon from '@iconify-icons/lucide/file-code-2'
import panelLeftClose from '@iconify-icons/lucide/panel-left-close'
import panelLeftOpen from '@iconify-icons/lucide/panel-left-open'
import panelRightOpen from '@iconify-icons/lucide/panel-right-open'
import helpCircle from '@iconify-icons/lucide/help-circle'
import folderPlus from '@iconify-icons/lucide/folder-plus'
import xIcon from '@iconify-icons/lucide/x'
import filterX from '@iconify-icons/lucide/filter-x'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useKbTree, useKbDoc, useKbRootCandidates } from '../hooks/useKb'
import type { KbDocStatus, KbDocType, KbRootNode, KbTimeState, KbTreeDocNode, KbTreeFolderNode, KbTreeNode, KbVerification } from '../mock/kb-mock'

type RailMode = 'expanded' | 'icon'

// -----------------------------------------------------------------------------
// Visual mapping — tones, glyphs, labels
// -----------------------------------------------------------------------------

const typeShort: Record<KbDocType, string> = {
  architecture: 'arch', reference: 'ref', decision: 'adr', orientation: 'ori',
  implementation: 'impl', concept: 'con', governance: 'gov', guide: 'gd',
  operations: 'ops', 'test-strategy': 'test', unknown: '—',
}

function statusTone(status: KbDocStatus): string {
  if (status === 'active') return 'status-good'
  if (status === 'draft') return 'status-neutral'
  if (status === 'deprecated') return 'status-warn'
  if (status === 'archived') return 'status-offline'
  return 'status-neutral'
}
function verificationTone(v: KbVerification): string {
  if (v === 'code-verified') return 'status-good'
  if (v === 'unverified') return 'status-warn'
  return 'status-neutral'
}
function timeStateTone(t: KbTimeState): string {
  if (t === 'mixed') return 'status-warn'
  if (t === 'historical') return 'status-offline'
  return 'status-neutral'
}
function staleDot(daysSinceVerified: number): { tone: string; title: string } | null {
  if (daysSinceVerified >= 180) return { tone: 'bg-rose-500', title: `Verified ${daysSinceVerified}d ago (>180d)` }
  if (daysSinceVerified >= 60) return { tone: 'bg-amber-400', title: `Verified ${daysSinceVerified}d ago (>60d)` }
  return null
}
function statusShortGlyph(status: KbDocStatus, verification: KbVerification): string {
  if (status === 'deprecated') return '✕'
  if (status === 'archived') return '▒'
  if (status === 'draft') return '◐'
  if (verification === 'code-verified') return '✓'
  if (verification === 'unverified') return '⚠'
  return '•'
}

function isFolder(n: KbTreeNode): n is KbTreeFolderNode { return n.kind === 'folder' }

function fileIconFor(d: KbTreeDocNode) {
  if (d.fileKind === 'html') return fileCodeIcon
  return fileTextIcon
}

// -----------------------------------------------------------------------------
// Filter model — URL-backed
// -----------------------------------------------------------------------------

type Filters = {
  status: KbDocStatus | null
  verification: KbVerification | null
  stale: 'amber' | 'red' | null  // amber = >=60d only; red = >=180d only
  mixed: boolean
}

function readFilters(p: URLSearchParams): Filters {
  return {
    status: (p.get('fs') as KbDocStatus | null) ?? null,
    verification: (p.get('fv') as KbVerification | null) ?? null,
    stale: (p.get('fa') as 'amber' | 'red' | null) ?? null,
    mixed: p.get('fm') === '1',
  }
}
function filtersActive(f: Filters): boolean {
  return f.status !== null || f.verification !== null || f.stale !== null || f.mixed
}
function matchDoc(d: KbTreeDocNode, f: Filters): boolean {
  if (f.status && d.status !== f.status) return false
  if (f.verification && d.verification !== f.verification) return false
  if (f.stale === 'red' && d.daysSinceVerified < 180) return false
  if (f.stale === 'amber' && d.daysSinceVerified < 60) return false
  if (f.mixed && d.time_state !== 'mixed') return false
  return true
}

// Returns a copy of the tree with non-matching docs removed and empty folders
// pruned. If filters are inactive, returns the input unchanged.
function pruneTree(node: KbTreeNode, f: Filters): KbTreeNode | null {
  if (!filtersActive(f)) return node
  if (isFolder(node)) {
    const kept: KbTreeNode[] = []
    for (const c of node.children) {
      const p = pruneTree(c, f)
      if (p) kept.push(p)
    }
    if (kept.length === 0) return null
    return { ...node, children: kept }
  }
  return matchDoc(node, f) ? node : null
}

// -----------------------------------------------------------------------------
// Tree rendering
// -----------------------------------------------------------------------------

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
          <Icon icon={isOpen ? chevronDown : chevronRight} className="kb-tree-chevron" aria-hidden="true" />
          <Icon icon={isOpen ? folderOpen : folderIcon} className="kb-tree-folder-icon" aria-hidden="true" />
          <span className="kb-tree-folder-name">{node.title}</span>
          <span className="kb-tree-folder-count">{node.docCount}</span>
          {folderStale ? <span className={`kb-tree-dot ${folderStale.tone}`} aria-hidden="true" /> : null}
        </button>
        {isOpen
          ? node.children.map((child) => (
              <TreeRow
                key={child.path} node={child} depth={depth + 1}
                selectedPath={selectedPath} onSelect={onSelect}
                expandedFolders={expandedFolders} onToggleFolder={onToggleFolder}
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
      <Icon icon={fileIconFor(node)} className={`kb-tree-file-icon kb-file-${node.fileKind ?? 'md'}`} aria-hidden="true" />
      <span className="kb-tree-doc-name">{node.title}</span>
      <span className="kb-tree-doc-tag">{typeShort[node.type]}</span>
      <span className={`status-pill ${statusTone(node.status)} kb-tree-status-pill`}>{statusShortGlyph(node.status, node.verification)}</span>
      {dot ? <span className={`kb-tree-dot ${dot.tone}`} aria-hidden="true" /> : null}
    </button>
  )
}

// -----------------------------------------------------------------------------
// Stats + HealthBar
// -----------------------------------------------------------------------------

type KbStats = {
  total: number
  byStatus: Record<KbDocStatus, number>
  byVerification: Record<KbVerification, number>
  amberStale: number
  redStale: number
  mixedTime: number
  unknownType: number
}
function emptyStats(): KbStats {
  return {
    total: 0,
    byStatus: { active: 0, draft: 0, deprecated: 0, archived: 0, unknown: 0 },
    byVerification: { 'code-verified': 0, 'design-only': 0, unverified: 0, 'self-referential': 0, unknown: 0 },
    amberStale: 0, redStale: 0, mixedTime: 0, unknownType: 0,
  }
}
function walkStats(node: KbTreeNode, acc: KbStats): KbStats {
  if (isFolder(node)) { for (const c of node.children) walkStats(c, acc); return acc }
  const d = node
  acc.total += 1
  acc.byStatus[d.status] = (acc.byStatus[d.status] ?? 0) + 1
  acc.byVerification[d.verification] = (acc.byVerification[d.verification] ?? 0) + 1
  if (d.daysSinceVerified >= 180) acc.redStale += 1
  else if (d.daysSinceVerified >= 60) acc.amberStale += 1
  if (d.time_state === 'mixed') acc.mixedTime += 1
  if (d.type === 'unknown') acc.unknownType += 1
  return acc
}
function nextActionHint(s: KbStats): string {
  if (s.redStale > 0) return `Re-verify ${s.redStale} doc${s.redStale > 1 ? 's' : ''} stale > 180 ngày`
  if (s.byStatus.deprecated > 0) return `Dọn ${s.byStatus.deprecated} deprecated doc`
  if (s.byVerification.unverified > 0) return `Verify ${s.byVerification.unverified} doc còn unverified`
  if (s.amberStale > 0) return `Re-verify ${s.amberStale} doc stale > 60 ngày`
  if (s.byStatus.draft > 0) return `Hoàn thiện ${s.byStatus.draft} draft`
  if (s.unknownType > 0) return `Gán type cho ${s.unknownType} doc thiếu metadata`
  return 'Bộ tài liệu khoẻ — tiếp tục cadence verify'
}

type FilterChipProps = {
  active: boolean
  tone: string
  label: string
  onClick: () => void
}
function FilterChip({ active, tone, label, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      className={`status-pill ${tone} kb-filter-chip${active ? ' kb-filter-chip-active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

type HealthBarProps = {
  stats: KbStats
  filters: Filters
  onToggleFilter: (key: keyof Filters, value: unknown) => void
  onClearFilters: () => void
}
function KbHealthBar({ stats, filters, onToggleFilter, onClearFilters }: HealthBarProps) {
  if (stats.total === 0) return null
  const has = filtersActive(filters)
  return (
    <div className="kb-health-bar">
      <div className="kb-health-group">
        <span className="runtime-overview-label">Total</span>
        <span className="count-pill kb-health-total">{stats.total} docs</span>
      </div>
      <div className="kb-health-group">
        <span className="runtime-overview-label">Status</span>
        <FilterChip active={filters.status === 'active'} tone="status-good" label={`active ${stats.byStatus.active}`} onClick={() => onToggleFilter('status', 'active')} />
        {stats.byStatus.draft > 0 ? <FilterChip active={filters.status === 'draft'} tone="status-neutral" label={`draft ${stats.byStatus.draft}`} onClick={() => onToggleFilter('status', 'draft')} /> : null}
        {stats.byStatus.deprecated > 0 ? <FilterChip active={filters.status === 'deprecated'} tone="status-warn" label={`deprecated ${stats.byStatus.deprecated}`} onClick={() => onToggleFilter('status', 'deprecated')} /> : null}
        {stats.byStatus.archived > 0 ? <FilterChip active={filters.status === 'archived'} tone="status-offline" label={`archived ${stats.byStatus.archived}`} onClick={() => onToggleFilter('status', 'archived')} /> : null}
        {stats.byStatus.unknown > 0 ? <FilterChip active={filters.status === 'unknown'} tone="status-neutral" label={`unknown ${stats.byStatus.unknown}`} onClick={() => onToggleFilter('status', 'unknown')} /> : null}
      </div>
      <div className="kb-health-group">
        <span className="runtime-overview-label">Verification</span>
        <FilterChip active={filters.verification === 'code-verified'} tone="status-good" label={`verified ${stats.byVerification['code-verified']}`} onClick={() => onToggleFilter('verification', 'code-verified')} />
        {stats.byVerification.unverified > 0 ? <FilterChip active={filters.verification === 'unverified'} tone="status-warn" label={`unverified ${stats.byVerification.unverified}`} onClick={() => onToggleFilter('verification', 'unverified')} /> : null}
        {stats.byVerification['design-only'] > 0 ? <FilterChip active={filters.verification === 'design-only'} tone="status-neutral" label={`design ${stats.byVerification['design-only']}`} onClick={() => onToggleFilter('verification', 'design-only')} /> : null}
        {stats.byVerification['self-referential'] > 0 ? <FilterChip active={filters.verification === 'self-referential'} tone="status-neutral" label={`self-ref ${stats.byVerification['self-referential']}`} onClick={() => onToggleFilter('verification', 'self-referential')} /> : null}
      </div>
      <div className="kb-health-group">
        <span className="runtime-overview-label">Staleness</span>
        {stats.amberStale > 0
          ? <FilterChip active={filters.stale === 'amber'} tone="status-warn" label={`stale>60d ${stats.amberStale}`} onClick={() => onToggleFilter('stale', 'amber')} />
          : <span className="status-pill status-good">none&gt;60d</span>}
        {stats.redStale > 0 ? <FilterChip active={filters.stale === 'red'} tone="status-offline" label={`stale>180d ${stats.redStale}`} onClick={() => onToggleFilter('stale', 'red')} /> : null}
        {stats.mixedTime > 0 ? <FilterChip active={filters.mixed} tone="status-neutral" label={`mixed-time ${stats.mixedTime}`} onClick={() => onToggleFilter('mixed', true)} /> : null}
      </div>
      <div className="kb-health-next">
        {has ? (
          <button type="button" className="tool-button kb-clear-filters" onClick={onClearFilters}>
            <Icon icon={filterX} aria-hidden="true" /> Clear filters
          </button>
        ) : (
          <>
            <span className="runtime-overview-label">Next action</span>
            <span className="kb-health-next-text">{nextActionHint(stats)}</span>
          </>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Legend popover
// -----------------------------------------------------------------------------

function LegendPopover({ onClose }: { onClose: () => void }) {
  return (
    <div className="prototype-overlay-backdrop" onClick={onClose}>
      <div className="prototype-dialog kb-legend-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="panel-toolbar">
          <h2>Tree Legend</h2>
          <button className="icon-tool-button" type="button" onClick={onClose} aria-label="Close legend"><Icon icon={xIcon} /></button>
        </div>

        <div className="kb-legend-grid">
          <section>
            <h3>File kind</h3>
            <ul className="kb-legend-list">
              <li><Icon icon={fileTextIcon} className="kb-tree-file-icon kb-file-md" /> Markdown (.md) — main doc format</li>
              <li><Icon icon={fileCodeIcon} className="kb-tree-file-icon kb-file-html" /> HTML (.html) — embedded page</li>
              <li><Icon icon={folderIcon} className="kb-tree-folder-icon" /> Folder (closed)</li>
              <li><Icon icon={folderOpen} className="kb-tree-folder-icon" /> Folder (open)</li>
            </ul>
          </section>

          <section>
            <h3>Status (color pill)</h3>
            <ul className="kb-legend-list">
              <li><span className="status-pill status-good">✓</span> active + code-verified</li>
              <li><span className="status-pill status-warn">⚠</span> active but unverified</li>
              <li><span className="status-pill status-neutral">◐</span> draft</li>
              <li><span className="status-pill status-warn">✕</span> deprecated</li>
              <li><span className="status-pill status-offline">▒</span> archived</li>
              <li><span className="status-pill status-neutral">•</span> design-only / self-referential</li>
            </ul>
          </section>

          <section>
            <h3>Type tag</h3>
            <ul className="kb-legend-list kb-legend-types">
              {Object.entries(typeShort).map(([k, v]) => (
                <li key={k}><span className="kb-tree-doc-tag">{v}</span> {k}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Staleness dot</h3>
            <ul className="kb-legend-list">
              <li><span className="kb-tree-dot bg-amber-400" /> last_verified &gt; 60 ngày trước</li>
              <li><span className="kb-tree-dot bg-rose-500" /> last_verified &gt; 180 ngày trước</li>
              <li>Folder hiện dot màu cao nhất trong các con của nó.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Add-folder dialog
// -----------------------------------------------------------------------------

const ACTIVE_ROOTS_KEY = 'kbx-uiv2-kb-active-roots'

function readActiveRoots(): Set<string> | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_ROOTS_KEY)
    if (!raw) return null
    const arr = JSON.parse(raw) as string[]
    if (!Array.isArray(arr)) return null
    return new Set(arr)
  } catch { return null }
}
function writeActiveRoots(set: Set<string>) {
  try { window.localStorage.setItem(ACTIVE_ROOTS_KEY, JSON.stringify(Array.from(set))) } catch {}
}

type AddFolderDialogProps = {
  roots: KbRootNode[]
  active: Set<string>
  onToggle: (path: string) => void
  onClose: () => void
}
function AddFolderDialog({ roots, active, onToggle, onClose }: AddFolderDialogProps) {
  return (
    <div className="prototype-overlay-backdrop" onClick={onClose}>
      <div className="prototype-dialog kb-roots-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="panel-toolbar">
          <div>
            <p className="workspace-eyebrow">Workspace folders</p>
            <h2>Folders in this workspace</h2>
          </div>
          <button className="icon-tool-button" type="button" onClick={onClose} aria-label="Close"><Icon icon={xIcon} /></button>
        </div>
        <p className="rules-cell-copy">
          Bật/tắt các thư mục muốn hiển thị trong tree. Mock slice 1 đã scan sẵn các root khả dụng;
          khi <code>/api/kb/roots</code> ra mắt, danh sách này sẽ được populate động và có thể thêm thư mục mới.
        </p>
        <ul className="kb-roots-list">
          {roots.map((r) => {
            const isOn = active.has(r.path)
            return (
              <li key={r.path} className="kb-roots-item">
                <label>
                  <input type="checkbox" checked={isOn} onChange={() => onToggle(r.path)} />
                  <Icon icon={folderIcon} aria-hidden="true" />
                  <strong>{r.label}</strong>
                  <span className="count-pill">{r.docCount} docs</span>
                  <code className="kb-roots-path">{r.path}</code>
                </label>
              </li>
            )
          })}
        </ul>
        <p className="rules-cell-copy kb-roots-hint">
          Add-new-folder cần backend mutation (<code>POST /api/kb/roots</code>) — slice 1 mock chỉ cho phép toggle các root đã scan.
        </p>
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export function KnowledgeBasePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedPath = searchParams.get('path')
  const leftMode: RailMode = (searchParams.get('left') as RailMode) ?? 'expanded'
  const rightOpen = searchParams.get('right') === 'open'
  const filters = useMemo(() => readFilters(searchParams), [searchParams])

  const treeQuery = useKbTree()
  const docQuery = useKbDoc(selectedPath)
  const candidatesQuery = useKbRootCandidates()

  // Active roots come from localStorage (slice A). Once the live candidate
  // list arrives, hydrate the default set from roots flagged defaultActive
  // if the user had no prior selection. Slice B replaces this with L5 state.
  const [activeRoots, setActiveRoots] = useState<Set<string>>(() => readActiveRoots() ?? new Set())
  const [hasHydratedFromServer, setHasHydratedFromServer] = useState(false)
  useEffect(() => { writeActiveRoots(activeRoots) }, [activeRoots])
  useEffect(() => {
    if (hasHydratedFromServer) return
    if (!candidatesQuery.data) return
    if (readActiveRoots() !== null) { setHasHydratedFromServer(true); return }
    setActiveRoots(new Set(candidatesQuery.data.filter((r) => r.defaultActive).map((r) => r.path)))
    setHasHydratedFromServer(true)
  }, [candidatesQuery.data, hasHydratedFromServer])

  const [legendOpen, setLegendOpen] = useState(false)
  const [rootsDialogOpen, setRootsDialogOpen] = useState(false)

  // Roots to show in tree
  const visibleRoots = useMemo(() => {
    if (!treeQuery.data) return []
    return treeQuery.data.roots.filter((r) => activeRoots.has(r.path))
  }, [treeQuery.data, activeRoots])

  // Stats computed over visible roots only — so filters reflect what user sees.
  const stats = useMemo(() => {
    const acc = emptyStats()
    for (const r of visibleRoots) walkStats(r, acc)
    return acc
  }, [visibleRoots])

  // Pruned tree (after filters)
  const prunedRoots = useMemo(() => {
    if (!filtersActive(filters)) return visibleRoots
    return visibleRoots
      .map((r) => pruneTree(r, filters))
      .filter((r): r is KbTreeFolderNode => r !== null && isFolder(r))
  }, [visibleRoots, filters])

  // Default-expand: only top-level root folders.
  const initialFolders = useMemo(() => {
    const s = new Set<string>()
    for (const r of visibleRoots) s.add(r.path)
    return s
  }, [visibleRoots])

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(initialFolders)
  useEffect(() => {
    // Whenever the set of visible roots changes (toggled folders), ensure each
    // visible root is at least added once. Don't collapse user's manual changes.
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      for (const p of initialFolders) next.add(p)
      return next
    })
  }, [initialFolders])

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value === null) next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  const handleSelect = (path: string) => setParam('path', path)
  const toggleFolder = (path: string) =>
    setExpandedFolders((prev) => { const n = new Set(prev); n.has(path) ? n.delete(path) : n.add(path); return n })
  const toggleLeft = () => setParam('left', leftMode === 'expanded' ? 'icon' : 'expanded')
  const toggleRight = () => setParam('right', rightOpen ? null : 'open')

  const toggleFilter = (key: keyof Filters, value: unknown) => {
    const map: Record<keyof Filters, string> = { status: 'fs', verification: 'fv', stale: 'fa', mixed: 'fm' }
    const param = map[key]
    if (key === 'mixed') {
      setParam(param, filters.mixed ? null : '1')
      return
    }
    const current = (filters as Record<string, unknown>)[key]
    setParam(param, current === value ? null : String(value))
  }
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('fs'); next.delete('fv'); next.delete('fa'); next.delete('fm')
    setSearchParams(next, { replace: true })
  }

  const toggleRoot = (path: string) =>
    setActiveRoots((prev) => { const n = new Set(prev); n.has(path) ? n.delete(path) : n.add(path); return n })

  const doc = docQuery.data
  const fm = doc?.frontmatter

  return (
    <section className="workspace-page kb-page">
      {stats.total > 0 ? (
        <KbHealthBar stats={stats} filters={filters} onToggleFilter={toggleFilter} onClearFilters={clearFilters} />
      ) : null}
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
                <div className="kb-rail-tools">
                  <button className="icon-tool-button" type="button" aria-label="Add folder" title="Manage workspace folders" onClick={() => setRootsDialogOpen(true)}>
                    <Icon icon={folderPlus} />
                  </button>
                  <button className="icon-tool-button" type="button" aria-label="Legend" title="Icon and color legend" onClick={() => setLegendOpen(true)}>
                    <Icon icon={helpCircle} />
                  </button>
                  <button className="icon-tool-button" type="button" aria-label="Collapse tree" onClick={toggleLeft}>
                    <Icon icon={panelLeftClose} />
                  </button>
                </div>
              </div>
              <div className="kb-tree-scroll">
                {treeQuery.isLoading ? (
                  <div className="prototype-skeleton-stack"><span /><span /><span /></div>
                ) : prunedRoots.length > 0 ? (
                  prunedRoots.map((root) => (
                    <TreeRow
                      key={root.path} node={root} depth={0}
                      selectedPath={selectedPath} onSelect={handleSelect}
                      expandedFolders={expandedFolders} onToggleFolder={toggleFolder}
                    />
                  ))
                ) : visibleRoots.length === 0 ? (
                  <div className="kb-empty-cta">
                    <p className="kb-empty">Chưa có folder nào bật.</p>
                    <button className="tool-button" type="button" onClick={() => setRootsDialogOpen(true)}>
                      <Icon icon={folderPlus} /> Bật folder
                    </button>
                  </div>
                ) : (
                  <p className="kb-empty">Không tài liệu nào khớp filter.</p>
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
              <div className="kb-meta-bar">
                <h1 className="kb-doc-title">{fm.title || selectedPath}</h1>
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

              {fm.status === 'draft' ? <div className="kb-banner kb-banner-neutral">Draft — claims chưa lock. Đừng dùng làm source-of-truth.</div> : null}
              {fm.verification === 'unverified' && (fm.type === 'reference' || fm.type === 'implementation') ? (
                <div className="kb-banner kb-banner-warn">Cần verify trước khi dùng làm source-of-truth.</div>
              ) : null}
              {fm.time_state === 'mixed' ? <div className="kb-banner kb-banner-warn">Doc trộn Current State và Target State — đọc kỹ.</div> : null}

              <article className="kb-doc-body" dangerouslySetInnerHTML={{ __html: doc!.html }} />

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

        {rightOpen ? (
          <aside className="kb-right-rail surface-panel">
            <div className="panel-toolbar">
              <div><p className="workspace-eyebrow">Document</p><h2>Outline</h2></div>
              <button className="icon-tool-button" type="button" aria-label="Close panel" onClick={toggleRight}><Icon icon={xIcon} /></button>
            </div>
            {doc && doc.headings.length > 0 ? (
              <nav className="kb-toc">
                {doc.headings.map((h) => (
                  <a key={h.id} href={`#${h.id}`} className="kb-toc-item" data-level={h.level}>{h.text}</a>
                ))}
              </nav>
            ) : <p className="kb-empty">No outline yet.</p>}
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

      {legendOpen ? <LegendPopover onClose={() => setLegendOpen(false)} /> : null}
      {rootsDialogOpen && treeQuery.data ? (
        <AddFolderDialog
          roots={treeQuery.data.roots}
          active={activeRoots}
          onToggle={toggleRoot}
          onClose={() => setRootsDialogOpen(false)}
        />
      ) : null}
    </section>
  )
}
