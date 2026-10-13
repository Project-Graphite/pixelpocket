import { useEffect, useId, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/useAuth'
import { readRomHeader, titleFromFileName } from '../services/romHeader'
import Field from '../components/Field'
import Alert from '../components/Alert'
import CoverPicker from '../components/CoverPicker'
import './GameForm.css'

const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`

function UploadGame() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isAdmin = user.role === 'admin'
  const romId = useId()

  const [destination, setDestination] = useState(
    isAdmin && params.get('to') !== 'mine' ? 'library' : 'mine',
  )
  const [rom, setRom] = useState(null)
  const [romError, setRomError] = useState('')
  const [title, setTitle] = useState('')
  const [titleEdited, setTitleEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [cover, setCover] = useState(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(null)

  const toLibrary = isAdmin && destination === 'library'

  const chooseRom = async (file) => {
    setRom(null)
    setRomError('')
    if (!file) return
    const header = await readRomHeader(file)
    if (!header.ok) {
      setRomError(header.error)
      return
    }
    setRom(file)
    if (!titleEdited) setTitle(header.title || titleFromFileName(file.name))
  }

  useEffect(() => {
    if (progress === null) return undefined
    const warn = (e) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [progress])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!rom) {
      setRomError(romError || 'Choose a .gb file to upload.')
      return
    }

    const form = new FormData()
    form.append('title', title.trim())
    form.append('description', description.trim())
    form.append('destination', toLibrary ? 'library' : 'mine')
    form.append('rom', rom)
    if (cover) form.append('cover', cover)

    setProgress(0)
    try {
      const res = await api.upload('POST', '/games', form, setProgress)
      navigate(`/games/${res.data.game.id}`, { replace: true })
    } catch (err) {
      setError(err.message)
      setProgress(null)
    }
  }

  const uploading = progress !== null
  const percent = Math.round(progress * 100)

  return (
    <main className="game-form">
      <h1 className="game-form__title">{isAdmin ? 'Add a game' : 'Upload a game'}</h1>
      <p className="game-form__intro">
        {toLibrary
          ? 'Games in the library can be played by everyone, including visitors without an account.'
          : 'Your uploads are private: only you can see and play them, and your saves follow you to every device.'}
      </p>

      <form className="form board game-form__board" onSubmit={handleSubmit} noValidate>
        <Alert>{error}</Alert>

        {isAdmin && (
          <fieldset className="choice">
            <legend className="field__label">Add it to</legend>
            <label className="choice__option">
              <input
                type="radio"
                name="destination"
                value="library"
                checked={destination === 'library'}
                onChange={() => setDestination('library')}
                disabled={uploading}
              />
              <span>
                The library
                <small>Everyone can play it</small>
              </span>
            </label>
            <label className="choice__option">
              <input
                type="radio"
                name="destination"
                value="mine"
                checked={destination === 'mine'}
                onChange={() => setDestination('mine')}
                disabled={uploading}
              />
              <span>
                My games
                <small>Only you can see it</small>
              </span>
            </label>
          </fieldset>
        )}

        <div className="field">
          <label className="field__label" htmlFor={romId}>
            Game file
          </label>
          <input
            id={romId}
            type="file"
            accept=".gb,.gbc"
            className="field__input"
            aria-invalid={romError ? 'true' : undefined}
            aria-describedby={`${romId}-msg`}
            onChange={(e) => chooseRom(e.target.files[0])}
            disabled={uploading}
            required
          />
          {romError ? (
            <p id={`${romId}-msg`} className="field__error">
              {romError}
            </p>
          ) : (
            <p id={`${romId}-msg`} className="field__hint">
              {rom ? `${rom.name}, ${formatSize(rom.size)}` : 'A Game Boy .gb file, up to 8 MB.'}
            </p>
          )}
        </div>

        <Field
          label="Title"
          name="title"
          value={title}
          maxLength={60}
          hint="Filled in from the game file. Change it if you like."
          onChange={(e) => {
            setTitle(e.target.value)
            setTitleEdited(true)
          }}
          disabled={uploading}
        />

        <Field
          as="textarea"
          label="Description (optional)"
          name="description"
          value={description}
          maxLength={500}
          rows={3}
          onChange={(e) => setDescription(e.target.value)}
          disabled={uploading}
        />

        <CoverPicker file={cover} onChange={setCover} disabled={uploading} />

        {!toLibrary && (
          <p className="game-form__note">Only upload games you own or have the right to use.</p>
        )}

        {uploading && (
          <div
            className="progress"
            role="progressbar"
            aria-label="Upload progress"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
        )}

        <div className="game-form__actions">
          <button type="submit" className="btn btn--primary" disabled={uploading}>
            {uploading
              ? progress < 1
                ? `Uploading… ${percent}%`
                : 'Checking the file…'
              : 'Upload game'}
          </button>
          <Link to={toLibrary ? '/library' : '/my-games'} className="btn">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}

export default UploadGame
