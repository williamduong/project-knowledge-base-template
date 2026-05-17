export default function TimelineDemo() {
  const events = [
    { time: '2026-05-01', title: 'Schema migration', note: 'Applied migration to rules registry' },
    { time: '2026-05-05', title: 'Prototype nav', note: 'Navigation demos updated' },
    { time: '2026-05-12', title: 'Charts added', note: 'ECharts integration for more types' },
  ]

  return (
    <div className="component-card timeline-demo">
      <strong>Timeline</strong>
      <div className="timeline-list">
        {events.map((e) => (
          <div key={e.time} className="timeline-item">
            <div className="timeline-marker" />
            <div className="timeline-body">
              <div className="timeline-time">{e.time}</div>
              <div className="timeline-title">{e.title}</div>
              <div className="timeline-note">{e.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
