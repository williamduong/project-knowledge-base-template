import { useRef } from 'react'

export default function RichTextDemo() {
  const editorRef = useRef<HTMLDivElement | null>(null)

  function cmd(name: string) {
    document.execCommand(name)
    editorRef.current?.focus()
  }

  function insertCode() {
    document.execCommand('formatBlock', false, 'pre')
    editorRef.current?.focus()
  }

  return (
    <div className="component-card richtext-demo">
      <strong>Rich Text (contentEditable)</strong>
      <div className="prototype-action-row">
        <button className="tool-button" onClick={() => cmd('bold')}>B</button>
        <button className="tool-button" onClick={() => cmd('italic')}>I</button>
        <button className="tool-button" onClick={() => cmd('underline')}>U</button>
        <button className="tool-button" onClick={() => cmd('insertUnorderedList')}>• List</button>
        <button className="tool-button" onClick={insertCode}>Code</button>
      </div>
      <div ref={editorRef} className="rich-editor" contentEditable suppressContentEditableWarning>
        <p>This is an editable area. Select text and use the toolbar buttons to format.</p>
      </div>
    </div>
  )
}
