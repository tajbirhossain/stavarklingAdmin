function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (first + last).toUpperCase()
}

export default function Avatar({
  name,
  size = 'md',
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {initialsOf(name)}
    </span>
  )
}
