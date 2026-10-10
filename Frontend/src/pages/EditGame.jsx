import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, coverUrl } from '../services/api'
import Field from '../components/Field'
import Alert from '../components/Alert'
import CoverPicker from '../components/CoverPicker'
import DeleteGameButton from '../components/DeleteGameButton'
import NotFound from './NotFound'
import './GameForm.css'

function EditGame() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [game, setGame] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [cover, setCover] = useState(null)
  const [coverKey, setCoverKey] = useState(0) // a new key clears the file input
  const [status, setStatus] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .get(`/games/${id}`)
      .then((res) => {
        const loaded = res.data.game
        setGame(loaded)
        setTitle(loaded.title)
        setDescription(loaded.description)
      })
      .catch((err) => setLoadError(err))
  }, [id])

  if (loadError?.status === 404 || (game && !game.canManage)) return <NotFound />
  if (loadError) {
    return (
      <main className="game-form">
        <Alert>{loadError.message}</Alert>
      </main>
    )
  }
  if (!game) return <main className="game-form" aria-busy="true" />

  const handleSave = async (e) => {
    e.preventDefault()
    setStatus(null)
    if (!title.trim()) {
      setStatus({ type: 'error', text: 'Enter a title for the game.' })
      return
    }
    setSaving(true)
    try {
      const fields = { title: title.trim(), description: description.trim() }
      let updated = (await api.patch(`/games/${game.id}`, fields)).data.game
      if (cover) {
        const form = new FormData()
        form.append('cover', cover)
        updated = (await api.upload('PUT', `/games/${game.id}/cover`, form)).data.game
        setCover(null)
        setCoverKey((k) => k + 1)
      }
      setGame(updated)
      setStatus({ type: 'success', text: 'Changes saved.' })
    } catch (err) {
      setStatus({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const removeCover = async () => {
    setStatus(null)
    try {
      const res = await api.delete(`/games/${game.id}/cover`)
      setGame(res.data.game)
      setStatus({ type: 'success', text: 'Cover image removed.' })
    } catch (err) {
      setStatus({ type: 'error', text: err.message })
    }
  }

  return (
    <main className="game-form">
      <h1 className="game-form__title">Edit game</h1>
      <p className="game-form__intro">
        {game.visibility === 'library'
          ? 'In the library, visible to everyone.'
          : 'In your games, visible only to you.'}
      </p>

      <form className="form board game-form__board" onSubmit={handleSave} noValidate>
        {status && <Alert type={status.type}>{status.text}</Alert>}
        <Field
          label="Title"
          name="title"
          value={title}
          maxLength={60}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Field
          as="textarea"
          label="Description (optional)"
          name="description"
          value={description}
          maxLength={500}
          rows={3}
          onChange={(e) => setDescription(e.target.value)}
        />
        <CoverPicker
          key={coverKey}
          file={cover}
          onChange={setCover}
          current={coverUrl(game)}
          label={game.hasCover ? 'Replace cover image' : 'Cover image (optional)'}
        />
        {game.hasCover && !cover && (
          <div>
            <button type="button" className="btn" onClick={removeCover}>
              Remove cover image
            </button>
          </div>
        )}
        <div className="game-form__actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <Link to={`/games/${game.id}`} className="btn">
            Back to game
          </Link>
        </div>
      </form>

      <section className="game-form__section board" aria-labelledby="delete-game">
        <h2 id="delete-game">Delete game</h2>
        <div>
          <DeleteGameButton
            game={game}
            onDeleted={() =>
              navigate(game.visibility === 'library' ? '/library' : '/my-games', { replace: true })
            }
          />
        </div>
      </section>
    </main>
  )
}

export default EditGame
