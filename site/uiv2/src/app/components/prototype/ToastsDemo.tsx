import { useState } from 'react'

type Toast = { id: number; type: 'info' | 'success' | 'warn' | 'error'; message: string }

export default function ToastsDemo() {
  const [toasts, setToasts] = useState<Toast[]>([])

  function add(type: Toast['type'], msg: string) {
    const id = Date.now() + Math.random()
    setToasts((p) => [...p, { id, type, message: msg }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4200)
  }

  return (
    <div className="component-card toasts-demo">
      <strong>Toasts / Notifications</strong>
      <div className="prototype-action-row">
        <button className="tool-button" onClick={() => add('info', 'Information')}>Info</button>
        <button className="tool-button" onClick={() => add('success', 'Saved successfully')}>Success</button>
        <button className="tool-button" onClick={() => add('warn', 'Watch out')}>Warn</button>
        <button className="tool-button" onClick={() => add('error', 'Something failed')}>Error</button>
      </div>

      <div className="toast-viewport">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </div>
  )
}
