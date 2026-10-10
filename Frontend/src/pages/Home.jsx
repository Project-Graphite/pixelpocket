import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/useAuth'
import Lcd from '../components/Lcd'
import GameCard from '../components/GameCard'
import Splash from '../components/Splash'
import './Home.css'

const INTRO_KEY = 'pixelpocket:intro-seen'

// Once per browser session, and never with reduced motion
const shouldPlayIntro = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return !sessionStorage.getItem(INTRO_KEY)
  } catch {
    return false
  }
}

const POINTS = [
  {
    lead: 'Play in seconds.',
    text: 'Games run right in the page. Nothing to download or install.',
  },
  {
    lead: 'Bring your own games.',
    text: 'Upload .gb files you own. Only you can see and play them.',
  },
  { lead: 'Keep your progress.', text: 'Sign in and your saves follow you to any device.' },
  {
    lead: 'Play your way.',
    text: 'Keyboard, gamepad, or on-screen Game Boy buttons on your phone.',
  },
]

function Home() {
  const { user } = useAuth()
  const [intro, setIntro] = useState(shouldPlayIntro)
  const [newest, setNewest] = useState([])

  useEffect(() => {
    if (!intro) return
    try {
      sessionStorage.setItem(INTRO_KEY, '1')
    } catch {
      // Without storage the intro plays again next time
    }
  }, [intro])

  const finishIntro = useCallback(() => setIntro(false), [])

  useEffect(() => {
    let cancelled = false
    api
      .get('/games?scope=library&sort=-createdAt&limit=6')
      .then((res) => {
        if (!cancelled) setNewest(res.data.games)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      {intro && <Splash onDone={finishIntro} />}

      <main className="page home" inert={intro ? true : undefined}>
        <section className="home__hero">
          <div className="home__copy">
            <h1>Game Boy games, right in your browser.</h1>
            <p className="home__lead">
              Play games from the library, upload cartridges you own, and pick up your saves on any
              device.
            </p>
            <div className="home__actions">
              <Link to="/library" className="btn btn--primary">
                Browse the library
              </Link>
              {user ? (
                <Link to="/my-games" className="btn">
                  My games
                </Link>
              ) : (
                <Link to="/signup" className="btn">
                  Create an account
                </Link>
              )}
            </div>
          </div>
          <div className="home__screen">
            <Lcd />
          </div>
        </section>

        {newest.length > 0 && (
          <section className="home__wall" aria-labelledby="home-new">
            <div className="home__wall-head">
              <h2 id="home-new">New on the wall</h2>
              <Link to="/library" className="home__more">
                See the whole library
              </Link>
            </div>
            <p className="home__note">
              The library currently holds a small set of demo games for trying out the emulator. The
              emulator is still in development, so some of them may not run perfectly yet.
            </p>
            <ul className="game-grid">
              {newest.map((game, index) => (
                <li key={game.id}>
                  <GameCard game={game} index={index} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="home__points board" aria-labelledby="home-points">
          <h2 id="home-points">What you can do here</h2>
          <ul>
            {POINTS.map((p) => (
              <li key={p.lead}>
                <strong>{p.lead}</strong> {p.text}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}

export default Home
