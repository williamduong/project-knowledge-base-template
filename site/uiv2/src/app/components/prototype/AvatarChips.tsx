export default function AvatarChips() {
  const users = ['Alice Smith', 'Bob K', 'Cindy L']
  const initials = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="component-card avatar-demo">
      <strong>Avatars & Chips</strong>
      <div className="avatar-row">
        {users.map((u) => (
          <div key={u} className="avatar">{initials(u)}</div>
        ))}
      </div>
      <div className="chip-row">
        <span className="chip">Alpha</span>
        <span className="chip">Beta</span>
        <span className="chip">Gamma</span>
      </div>
    </div>
  )
}
