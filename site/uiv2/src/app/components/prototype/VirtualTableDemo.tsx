import { useMemo, useRef, useState } from 'react'

export default function VirtualTableDemo() {
  const total = 2000
  const data = useMemo(() => new Array(total).fill(0).map((_, i) => ({ id: i + 1, text: `Row ${i + 1}` })), [])
  const rowHeight = 34
  const viewportHeight = 300
  const visibleCount = Math.ceil(viewportHeight / rowHeight)
  const [start, setStart] = useState(0)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  function onScroll() {
    if (!viewportRef.current) return
    const s = Math.floor(viewportRef.current.scrollTop / rowHeight)
    setStart(s)
  }

  const visible = data.slice(start, Math.min(start + visibleCount + 6, data.length))
  const topPad = start * rowHeight
  const bottomPad = Math.max(0, (data.length - (start + visible.length)) * rowHeight)

  return (
    <div className="component-card virtual-table-demo">
      <strong>Virtualized Table (simple)</strong>
      <div className="virtual-viewport" style={{ height: viewportHeight }} ref={viewportRef} onScroll={onScroll}>
        <div style={{ height: topPad }} />
        {visible.map((r) => (
          <div key={r.id} className="virtual-row">{r.text}</div>
        ))}
        <div style={{ height: bottomPad }} />
      </div>
    </div>
  )
}
