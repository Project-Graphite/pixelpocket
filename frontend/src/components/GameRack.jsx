import { useLayoutEffect, useRef, useState } from 'react'
import GameCard from './GameCard'

// Cartridges in storage racks: one separate holder per row. How many fit in a row is decided
// by the CSS grid (auto-fill) and read back from the first holder, so the stylesheet stays the
// only place it is set. `slots` shows that many empty slots instead, while games load.
function GameRack({ games, onDeleted, slots = 0, label }) {
  const rack = useRef(null)
  const [columns, setColumns] = useState(0)

  useLayoutEffect(() => {
    const measure = () => {
      const row = rack.current?.firstElementChild
      if (row) setColumns(getComputedStyle(row).gridTemplateColumns.split(' ').length)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(rack.current)
    return () => observer.disconnect()
  }, [])

  const total = Math.max(games.length, slots)
  // Until the first measurement, everything goes in one holder
  const perRow = columns || total || 1
  // A short last row just leaves foam where more games would go
  const rows = []
  for (let start = 0; start < total; start += perRow) {
    const length = Math.min(perRow, total - start)
    rows.push(Array.from({ length }, (_, i) => games[start + i] ?? null))
  }

  return (
    <div ref={rack} className="game-rack" role="list" aria-label={label}>
      {rows.map((row, r) => (
        <div key={r} className="game-rack__row">
          {row.map((game, c) =>
            game ? (
              <div key={game.id} role="listitem">
                <GameCard game={game} index={r * perRow + c} onDeleted={onDeleted} />
              </div>
            ) : (
              <div key={`empty-${c}`} className="game-card game-card--empty" aria-hidden="true">
                <span className="game-card__holder" />
              </div>
            ),
          )}
        </div>
      ))}
    </div>
  )
}

export default GameRack
