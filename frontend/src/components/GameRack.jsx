import { useLayoutEffect, useRef, useState } from 'react'
import GameCard from './GameCard'

// Cartridges in storage racks: one separate holder per row. How many fit in a row is decided
// by the CSS grid (auto-fill) and read back from the first holder, so the stylesheet stays the
// only place it is set. A short last row is padded with empty slots, and `slots` shows that many
// empty slots instead, while games load.
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
  // A short last row is filled up with empty slots
  const rows = []
  for (let start = 0; start < total; start += perRow) {
    rows.push(Array.from({ length: perRow }, (_, i) => games[start + i] ?? null))
  }

  return (
    <div ref={rack} className="game-rack" role="list" aria-label={label}>
      {rows.map((row, r) => {
        // Cards that can be managed have an Edit/Delete line; empty slots keep that space
        const managed = row.some((game) => game?.canManage)
        return (
          <div key={r} className="game-rack__row">
            {row.map((game, c) =>
              game ? (
                <div key={game.id} role="listitem">
                  <GameCard game={game} index={r * perRow + c} onDeleted={onDeleted} />
                </div>
              ) : (
                <div key={`empty-${c}`} className="game-card game-card--empty" aria-hidden="true">
                  <span className="game-card__holder" />
                  {managed && (
                    <span className="game-card__actions game-card__actions--ghost">
                      <span className="link-btn">Edit</span>
                    </span>
                  )}
                </div>
              ),
            )}
          </div>
        )
      })}
    </div>
  )
}

export default GameRack
