import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'

// Asks before deleting. compact: text buttons for game cards.
function DeleteGameButton({ game, onDeleted, compact = false }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const confirmRef = useRef(null)

  // Keyboard users land on the new choice
  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
  }, [confirming])

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      await api.delete(`/games/${game.id}`)
      onDeleted?.(game)
    } catch (err) {
      setError(err.message)
      setDeleting(false)
    }
  }

  const base = compact ? 'link-btn' : 'btn'
  const warning =
    game.visibility === 'library'
      ? 'Delete it for everyone, with all players’ saves?'
      : 'Delete this game and your saves for it?'

  if (!confirming) {
    return (
      <button
        type="button"
        className={`${base} ${base}--danger`}
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${game.title}`}
      >
        {compact ? 'Delete' : 'Delete game'}
      </button>
    )
  }

  return (
    <div className="delete-confirm" role="group" aria-label={`Delete ${game.title}?`}>
      <p className="delete-confirm__text">{error || warning}</p>
      <div className="delete-confirm__actions">
        <button
          ref={confirmRef}
          type="button"
          className={`${base} ${base}--danger`}
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          type="button"
          className={base}
          onClick={() => {
            setConfirming(false)
            setError('')
          }}
          disabled={deleting}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default DeleteGameButton
