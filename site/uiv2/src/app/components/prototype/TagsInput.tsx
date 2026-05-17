import { useState } from 'react'

export default function TagsInput() {
  const [tags, setTags] = useState<string[]>(['example'])
  const [value, setValue] = useState('')

  function addTagFromValue() {
    const v = value.trim()
    if (!v) return
    if (tags.includes(v)) { setValue(''); return }
    setTags((p) => [...p, v])
    setValue('')
  }

  function removeTag(idx: number) {
    setTags((p) => p.filter((_, i) => i !== idx))
  }

  return (
    <div className="component-card tags-demo">
      <strong>Tags / Autocomplete</strong>
      <div className="tags-input">
        {tags.map((t, i) => (
          <span key={t + i} className="tag-chip">
            {t}
            <button type="button" className="tag-remove" onClick={() => removeTag(i)}>×</button>
          </span>
        ))}
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Add tag and press Enter" onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTagFromValue() }
        }} />
      </div>
    </div>
  )
}
