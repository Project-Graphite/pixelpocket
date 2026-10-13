import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/useAuth'
import { loadCore } from '../emulator/core'
import { Emulator } from '../emulator/Emulator'
import { AudioOutput } from '../emulator/AudioOutput'
import { InputManager } from '../emulator/InputManager'
import { SaveSync } from '../emulator/SaveSync'
import { DEFAULT_PALETTE, PALETTES } from '../emulator/palettes'
import TouchControls from '../components/TouchControls'
import Sticker from '../components/Sticker'
import DeleteGameButton from '../components/DeleteGameButton'
import PixelFace from '../components/PixelFace'
import Alert from '../components/Alert'
import {
  ExpandIcon,
  MuteIcon,
  PauseIcon,
  PlayIcon,
  RestartIcon,
  ShrinkIcon,
  TouchIcon,
  VolumeIcon,
} from '../components/Icons'
import NotFound from './NotFound'
import './Play.css'

const readPref = (key, fallback) => {
  try {
    const value = localStorage.getItem(`pixelpocket:${key}`)
    return value === null ? fallback : value
  } catch {
    return fallback
  }
}
const writePref = (key, value) => {
  try {
    localStorage.setItem(`pixelpocket:${key}`, value)
  } catch {
    // Without storage the setting lasts until the page closes
  }
}

const timeOf = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// Each new state gets a new key, so its sticker animates in
function SaveStatus({ status, onRetry }) {
  const at = status.at ? timeOf(status.at) : null
  const key = `${status.state}-${at ?? ''}`
  switch (status.state) {
    case 'loading':
      return (
        <Sticker key={key} kind="plain" tilt={0}>
          Loading your save…
        </Sticker>
      )
    case 'saving':
      return (
        <Sticker key={key} kind="plain" tilt={-2} slap>
          Saving…
        </Sticker>
      )
    case 'synced':
      if (at) {
        return (
          <Sticker key={key} kind="tag" tilt={-3} slap>
            Saved to your account {at}
          </Sticker>
        )
      }
      return (
        <Sticker key={key} kind={status.fresh ? 'plain' : 'tag'} tilt={-2}>
          {status.fresh ? 'Saves to your account' : 'Save loaded from your account'}
        </Sticker>
      )
    case 'local':
      if (at) {
        return (
          <Sticker key={key} kind="tag" tilt={-3} slap>
            Saved in this browser {at}
          </Sticker>
        )
      }
      return (
        <Sticker key={key} kind="plain" tilt={-2}>
          Saves in this browser
        </Sticker>
      )
    case 'error':
      return (
        <span className="play__save-error">
          <Sticker key={key} kind="warn" tilt={-3} slap>
            Not saved: {status.message}
          </Sticker>
          <button type="button" className="link-btn" onClick={onRetry}>
            Try again
          </button>
        </span>
      )
    default:
      return null
  }
}

function Play() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const account = Boolean(user)

  const [game, setGame] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | ready | running | paused | error
  const [playError, setPlayError] = useState('')
  const [saveStatus, setSaveStatus] = useState({ state: 'none' })
  const [touchPref, setTouchPref] = useState(() => readPref('touch', null))
  const [touchSeen, setTouchSeen] = useState(() => window.matchMedia('(pointer: coarse)').matches)
  const [volume, setVolume] = useState(() => Number(readPref('volume', '0.8')))
  const [muted, setMuted] = useState(() => readPref('muted', 'no') === 'yes')
  const [palette, setPalette] = useState(() => {
    const stored = readPref('palette', DEFAULT_PALETTE)
    return PALETTES[stored] ? stored : DEFAULT_PALETTE
  })
  const [fullscreen, setFullscreen] = useState(false)

  const canvasRef = useRef(null)
  const stageRef = useRef(null)
  const engine = useRef(null) // { core, emulator, input, sync, audio, rom }
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const settings = useRef({ volume, muted, palette })
  settings.current = { volume, muted, palette }

  const touch = touchPref === null ? touchSeen : touchPref === 'on'
  const canFullscreen = Boolean(document.fullscreenEnabled)

  useEffect(() => {
    let cancelled = false
    setGame(null)
    setLoadError(null)
    api
      .get(`/games/${id}`)
      .then((res) => {
        if (!cancelled) setGame(res.data.game)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err)
      })
    return () => {
      cancelled = true
    }
  }, [id, account])

  useEffect(() => {
    if (!game || authLoading) return undefined
    let cancelled = false
    let created = null
    setPhase('loading')
    setPlayError('')

    ;(async () => {
      try {
        const [core, romBuffer] = await Promise.all([
          loadCore(),
          api.getBinary(`/games/${game.id}/rom`),
        ])
        if (cancelled) return

        const rom = new Uint8Array(romBuffer)
        const emulator = new Emulator(core, canvasRef.current)
        emulator.setPalette(PALETTES[settings.current.palette].colors)
        emulator.loadRom(rom)

        const input = new InputManager(emulator)
        input.onGamepad = () => setTouchSeen(false)
        emulator.beforeFrame = () => input.pollGamepads()

        const sync = new SaveSync({ emulator, game, account, onStatus: setSaveStatus })
        created = { core, emulator, input, sync, audio: null, rom }
        engine.current = created

        try {
          await sync.load()
        } catch (err) {
          throw new Error(
            `Your save could not be loaded (${err.message}). Reload the page to try again.`,
          )
        }
        if (!cancelled) setPhase('ready')
      } catch (err) {
        if (!cancelled) {
          setPlayError(err.message)
          setPhase('error')
        }
      }
    })()

    return () => {
      cancelled = true
      if (created) {
        created.sync.flush({ closing: true })
        created.sync.stopWatching()
        created.input.releaseAll()
        created.emulator.destroy()
        created.audio?.close()
      }
      engine.current = null
    }
  }, [game?.id, account, authLoading])

  const start = useCallback(async () => {
    const e = engine.current
    if (!e || phaseRef.current !== 'ready') return
    if (!e.audio) {
      try {
        // Created inside the click, which is when browsers allow sound to start
        e.audio = await AudioOutput.create(e.core._gb_audio_sample_rate())
      } catch {
        e.audio = null // the game still runs, just without sound
      }
      if (e.audio) {
        const { volume: v, muted: m } = settings.current
        e.audio.setVolume(m ? 0 : v)
        e.emulator.audio = e.audio
      }
    }
    if (engine.current !== e) {
      e.audio?.close()
      return
    }
    await e.audio?.resume().catch(() => {})
    e.emulator.start()
    e.sync.startWatching()
    setPhase('running')
  }, [])

  const pause = useCallback(({ closing = false } = {}) => {
    const e = engine.current
    if (!e || phaseRef.current !== 'running') return
    e.emulator.stop()
    e.input.releaseAll()
    e.audio?.suspend()
    e.sync.flush({ closing })
    setPhase('paused')
  }, [])

  const resume = useCallback(async () => {
    const e = engine.current
    if (!e || phaseRef.current !== 'paused') return
    await e.audio?.resume().catch(() => {})
    e.emulator.start()
    setPhase('running')
  }, [])

  const togglePause = useCallback(() => {
    if (phaseRef.current === 'running') pause()
    else if (phaseRef.current === 'paused') resume()
    else if (phaseRef.current === 'ready') start()
  }, [pause, resume, start])

  // Like switching the console off and on: the game restarts, the battery save stays
  const restart = () => {
    const e = engine.current
    if (!e) return
    e.sync.flush()
    const save = e.emulator.exportSave()
    e.emulator.loadRom(e.rom)
    if (save) e.emulator.importSave(save)
    e.input.releaseAll()
  }

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else stageRef.current?.requestFullscreen({ navigationUI: 'hide' }).catch(() => {})
  }, [])

  useEffect(() => {
    const e = engine.current
    if (e) e.input.enabled = phase === 'running'
  }, [phase])

  const engineReady = phase !== 'loading' && phase !== 'error'
  useEffect(() => {
    const e = engine.current
    if (!engineReady || !e) return undefined
    return e.input.attachKeyboard((event) => {
      if (event.code === 'KeyP') togglePause()
      else if (event.code === 'KeyF' && canFullscreen) toggleFullscreen()
    })
  }, [engineReady, togglePause, toggleFullscreen, canFullscreen])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return
      if (phaseRef.current === 'running') pause({ closing: true })
      else engine.current?.sync.flush({ closing: true })
    }
    const onPageHide = () => engine.current?.sync.flush({ closing: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [pause])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // A touch on a device without a coarse pointer (a touch laptop) shows the buttons
  useEffect(() => {
    if (touchSeen) return undefined
    const onTouch = () => setTouchSeen(true)
    window.addEventListener('touchstart', onTouch, { once: true, passive: true })
    return () => window.removeEventListener('touchstart', onTouch)
  }, [touchSeen])

  useEffect(() => {
    engine.current?.audio?.setVolume(muted ? 0 : volume)
    writePref('volume', String(volume))
    writePref('muted', muted ? 'yes' : 'no')
  }, [volume, muted])

  useEffect(() => {
    engine.current?.emulator.setPalette(PALETTES[palette].colors)
    writePref('palette', palette)
  }, [palette])

  const toggleTouch = () => {
    const next = touch ? 'off' : 'on'
    setTouchPref(next)
    writePref('touch', next)
  }

  const onTouchChange = useCallback((held) => {
    engine.current?.input.setSource('touch', held)
  }, [])

  if (loadError?.status === 404) return <NotFound />
  if (loadError) {
    return (
      <main className="page play">
        <Alert>{loadError.message}</Alert>
      </main>
    )
  }

  const running = phase === 'running'

  return (
    <main className="play">
      <div
        ref={stageRef}
        className="play__stage"
        data-touch={touch ? '' : undefined}
        data-fullscreen={fullscreen ? '' : undefined}
      >
        <h1 className="play__title">{game ? game.title : 'Loading game…'}</h1>
        <div className="play__console">
          <div className="play__screen">
            <canvas
              ref={canvasRef}
              width={160}
              height={144}
              role="img"
              aria-label={game ? `${game.title}, game screen` : 'Game screen'}
            />
            {!running && (
              <div className="play__overlay">
                {phase === 'loading' && <p>Loading…</p>}
                {phase === 'ready' && (
                  <>
                    <PixelFace className="play__face" />
                    <button type="button" className="btn btn--primary" onClick={start} autoFocus>
                      <PlayIcon size={18} />
                      Start game
                    </button>
                  </>
                )}
                {phase === 'paused' && (
                  <>
                    <p>Paused</p>
                    <button type="button" className="btn btn--primary" onClick={resume}>
                      <PlayIcon size={18} />
                      Resume
                    </button>
                  </>
                )}
                {phase === 'error' && (
                  <p className="play__error" role="alert">
                    {playError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {touch && <TouchControls onChange={onTouchChange} />}

        <div className="play__bar">
          <div className="play__tools">
            <button
              type="button"
              className="icon-btn"
              onClick={togglePause}
              disabled={!engineReady}
              aria-label={running ? 'Pause (P)' : 'Play (P)'}
              title={running ? 'Pause (P)' : 'Play (P)'}
            >
              {running ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={restart}
              disabled={!engineReady || phase === 'ready'}
              aria-label="Restart the game (your save is kept)"
              title="Restart the game (your save is kept)"
            >
              <RestartIcon />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? 'Turn sound on' : 'Mute'}
              title={muted ? 'Turn sound on' : 'Mute'}
            >
              {muted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
            </button>
            <input
              type="range"
              className="play__volume"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value))
                setMuted(false)
              }}
              aria-label="Volume"
            />
            <select
              className="play__palette"
              value={palette}
              onChange={(e) => setPalette(e.target.value)}
              aria-label="Screen colours"
              title="Screen colours"
            >
              {Object.entries(PALETTES).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="icon-btn"
              onClick={toggleTouch}
              aria-pressed={touch}
              aria-label="On-screen buttons"
              title="On-screen buttons"
            >
              <TouchIcon />
            </button>
            {canFullscreen && (
              <button
                type="button"
                className="icon-btn"
                onClick={toggleFullscreen}
                aria-label={fullscreen ? 'Exit full screen (F)' : 'Full screen (F)'}
                title={fullscreen ? 'Exit full screen (F)' : 'Full screen (F)'}
              >
                {fullscreen ? <ShrinkIcon /> : <ExpandIcon />}
              </button>
            )}
          </div>
          <p className="play__save" aria-live="polite">
            <SaveStatus status={saveStatus} onRetry={() => engine.current?.sync.flush()} />
          </p>
        </div>
      </div>

      {game && (
        <section className="page play__info">
          <div className="play__heading">
            <p className="play__meta">
              <Sticker kind="plain" tilt={-2}>
                {game.visibility === 'library' ? 'In the library' : 'Private: only you can see it'}
              </Sticker>
            </p>
            {game.canManage && (
              <div className="play__manage">
                <Link to={`/games/${game.id}/edit`} className="btn">
                  Edit game
                </Link>
                <DeleteGameButton
                  game={game}
                  onDeleted={() =>
                    navigate(game.visibility === 'library' ? '/library' : '/my-games', {
                      replace: true,
                    })
                  }
                />
              </div>
            )}
          </div>
          {game.description && <p className="play__description">{game.description}</p>}

          {!user && game.battery && (
            <p className="play__guest board">
              You’re playing as a guest, so your progress stays in this browser.{' '}
              <Link to="/login" state={{ from: location.pathname }}>
                Log in
              </Link>{' '}
              to keep it on every device.
            </p>
          )}

          <details className="play__help board" open={!touch}>
            <summary>Controls</summary>
            <dl>
              <dt>D-pad</dt>
              <dd>Arrow keys or W A S D</dd>
              <dt>A</dt>
              <dd>X or K</dd>
              <dt>B</dt>
              <dd>Z or J</dd>
              <dt>Start</dt>
              <dd>Enter</dd>
              <dt>Select</dt>
              <dd>Shift or Backspace</dd>
              <dt>Pause</dt>
              <dd>P</dd>
              {canFullscreen && (
                <>
                  <dt>Full screen</dt>
                  <dd>F</dd>
                </>
              )}
            </dl>
            <p className="muted">
              Gamepads work too: face buttons for A and B, the D-pad or stick to move.
            </p>
          </details>
        </section>
      )}
    </main>
  )
}

export default Play
