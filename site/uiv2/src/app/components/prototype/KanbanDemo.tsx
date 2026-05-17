import { useState } from 'react'

export default function KanbanDemo() {
  const [cols, setCols] = useState<Record<string, string[]>>({
    todo: ['Write tests', 'Draft rules'],
    inprogress: ['Integrate charts'],
    done: ['Nav demo']
  })

  function onDragStart(e: React.DragEvent, from: string, idx: number) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ from, idx }))
  }

  function onDrop(e: React.DragEvent, to: string) {
    e.preventDefault()
    const raw = e.dataTransfer.getData('text/plain')
    try {
      const { from, idx } = JSON.parse(raw)
      setCols((prev) => {
        const copy = { ...prev }
        const [item] = copy[from].splice(idx, 1)
        copy[to] = [...copy[to], item]
        return copy
      })
    } catch (err) {
      // noop
    }
  }

  return (
    <div className="component-card kanban-demo">
      <strong>Kanban Board</strong>
      <div className="kanban-board">
        {Object.entries(cols).map(([key, items]) => (
          <div key={key} className="kanban-column" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, key)}>
            <div className="kanban-column-title">{key}</div>
            <div className="kanban-column-body">
              {items.map((it, i) => (
                <div key={it} draggable onDragStart={(e) => onDragStart(e, key, i)} className="kanban-card">{it}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
