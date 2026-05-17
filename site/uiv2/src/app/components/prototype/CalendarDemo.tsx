import { useState, useMemo } from 'react'

function getMonthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startDay = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const cells: { day: number; inMonth: boolean; date: Date }[] = []

  for (let i = 0; i < startDay; i++) {
    const dayNum = daysInPrevMonth - startDay + 1 + i
    const d = new Date(year, month - 1, dayNum)
    cells.push({ day: dayNum, inMonth: false, date: d })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d)
    cells.push({ day: d, inMonth: true, date: dt })
  }

  let next = 1
  while (cells.length < 42) {
    const d = new Date(year, month + 1, next)
    cells.push({ day: next, inMonth: false, date: d })
    next++
  }

  const weeks: typeof cells[] = []
  for (let w = 0; w < 6; w++) weeks.push(cells.slice(w * 7, w * 7 + 7))
  return weeks
}

export default function CalendarDemo() {
  const [current, setCurrent] = useState(() => new Date())
  const year = current.getFullYear()
  const month = current.getMonth()
  const weeks = useMemo(() => getMonthMatrix(year, month), [year, month])
  const today = new Date()
  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  return (
    <div className="component-card calendar-demo">
      <div className="calendar-header">
        <button className="tool-button" onClick={() => setCurrent(new Date(year, month - 1, 1))}>‹</button>
        <div className="calendar-title"><strong>{current.toLocaleString(undefined, { month: 'long' })} {year}</strong></div>
        <button className="tool-button" onClick={() => setCurrent(new Date(year, month + 1, 1))}>›</button>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
        {weeks.flat().map((cell, i) => (
          <div key={i} className={`calendar-cell ${cell.inMonth ? 'in-month' : 'out-month'} ${isSameDay(cell.date, today) ? 'today' : ''}`}>
            <div className="calendar-day">{cell.day}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
