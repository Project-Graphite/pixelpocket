// kind: round (new), tag (a fact about the game), plain (where it lives), warn (needs attention)
function Sticker({ kind = 'tag', tilt = -6, slap = false, delay = 0, className = '', children }) {
  return (
    <span
      className={`sticker sticker--${kind}${slap ? ' sticker--slap' : ''} ${className}`.trim()}
      style={{ '--tilt': `${tilt}deg`, '--delay': `${delay}ms` }}
    >
      {children}
    </span>
  )
}

export default Sticker
