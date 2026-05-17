import { useRef, useState } from 'react'

type UFile = { id: number; name: string; size: number; progress: number }

export default function FileUploader() {
  const [files, setFiles] = useState<UFile[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)

  function handleFilesList(list: FileList | null) {
    if (!list) return
    const arr = Array.from(list)
    const now = Date.now()
    const newFiles = arr.map((f, i) => ({ id: now + i, name: f.name, size: f.size, progress: 0 }))
    setFiles((p) => [...p, ...newFiles])

    newFiles.forEach((f) => {
      const interval = setInterval(() => {
        setFiles((p) => p.map((x) => x.id === f.id ? { ...x, progress: Math.min(100, x.progress + 12) } : x))
      }, 320)
      setTimeout(() => clearInterval(interval), 320 * 10)
    })
  }

  return (
    <div className="component-card uploader-demo">
      <strong>File Uploader</strong>
      <div className="uploader-zone" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleFilesList(e.dataTransfer.files) }}>
        <p>Drag & drop files here, or click to choose</p>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => handleFilesList(e.target.files)} />
      </div>
      <div className="uploader-list">
        {files.map((f) => (
          <div key={f.id} className="uploader-item">
            <div className="uploader-name">{f.name}</div>
            <div className="uploader-progress-wrap">
              <div className="uploader-progress" style={{ width: `${f.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
