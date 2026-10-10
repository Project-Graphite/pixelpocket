import { useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import { useAuth } from '../context/useAuth'
import GameCard from '../components/GameCard'
import Pagination from '../components/Pagination'
import Alert from '../components/Alert'
import Lcd from '../components/Lcd'
import { SearchIcon, UploadIcon } from '../components/Icons'
import './Library.css'

const PAGE_SIZE = 24

const SORTS = [
  { value: 'title', label: 'Name, A to Z' },
  { value: '-title', label: 'Name, Z to A' },
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
]

// scope "library" is the shared library, "mine" the user's own uploads
function Library({ scope }) {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const searchId = useId()
  const sortId = useId()

  const search = params.get('search') ?? ''
  const sort = SORTS.some((s) => s.value === params.get('sort')) ? params.get('sort') : 'title'
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1)

  const [query, setQuery] = useState(search)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0) // bumped after a delete to refill the page
  const lastQuery = useRef('')

  const mine = scope === 'mine'
  const isAdmin = user?.role === 'admin'
  const canUpload = mine || isAdmin

  const update = (changes) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (
        value === '' ||
        value === null ||
        (key === 'page' && value === 1) ||
        (key === 'sort' && value === 'title')
      ) {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
    }
    setParams(next, { replace: 'search' in changes })
  }

  // Search as you type, a moment after typing stops
  useEffect(() => {
    if (query === search) return undefined
    const timer = window.setTimeout(() => update({ search: query, page: 1 }), 300)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Keep the box in step with the URL (back button, "Clear search")
  useEffect(() => {
    setQuery(search)
  }, [search])

  useEffect(() => {
    let cancelled = false
    const qs = new URLSearchParams({
      scope,
      sort,
      page: String(page),
      limit: String(PAGE_SIZE),
    })
    if (search.trim()) qs.set('search', search.trim())

    setError('')
    // Placeholders for a new search or page; a reload after a delete keeps the grid
    if (lastQuery.current !== qs.toString()) setResult(null)
    lastQuery.current = qs.toString()
    api
      .get(`/games?${qs}`)
      .then((res) => {
        if (!cancelled) setResult(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [scope, search, sort, page, reload])

  const games = result?.data.games ?? []

  // Take the game off the page right away, then reload the page so it fills back up
  const handleDeleted = (deleted) => {
    setResult(
      (r) =>
        r && {
          ...r,
          total: r.total - 1,
          data: { games: r.data.games.filter((g) => g.id !== deleted.id) },
        },
    )
    if (games.length === 1 && page > 1) update({ page: page - 1 })
    else setReload((n) => n + 1)
  }

  const changePage = (next) => {
    update({ page: next })
    window.scrollTo({ top: 0 })
  }

  return (
    <main className="page library">
      <div className="library__head">
        <h1 className="library__title">{mine ? 'My games' : 'Library'}</h1>
        <div className="library__tools">
          <div className="library__filters" role="search">
            <label htmlFor={searchId} className="visually-hidden">
              Search games
            </label>
            <div className="library__search">
              <SearchIcon size={20} />
              <input
                id={searchId}
                type="search"
                className="field__input"
                placeholder="Search by name"
                value={query}
                maxLength={60}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <label htmlFor={sortId} className="visually-hidden">
              Sort games
            </label>
            <select
              id={sortId}
              className="field__input library__sort"
              value={sort}
              onChange={(e) => update({ sort: e.target.value, page: 1 })}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {canUpload && (
            <Link
              to={mine ? '/games/new?to=mine' : '/games/new'}
              className="btn btn--primary library__upload"
            >
              <UploadIcon size={20} />
              {mine ? 'Upload a game' : 'Add a game'}
            </Link>
          )}
        </div>
      </div>

      <p className="library__intro">
        {mine
          ? 'Games you uploaded. Only you can see and play them.'
          : 'Pick a game and play it right here in your browser.'}
        {!user && !mine && (
          <>
            {' '}
            <Link to="/signup">Create an account</Link> to upload your own games and keep your saves
            on every device.
          </>
        )}
      </p>

      <Alert>{error}</Alert>

      {!result && !error && (
        <ul className="game-grid" aria-label="Loading games">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="game-card game-card--loading" aria-hidden="true">
              <span className="game-card__hang">
                <span className="game-card__tab" />
              </span>
            </li>
          ))}
        </ul>
      )}

      {result && games.length > 0 && (
        <>
          <p className="library__count" aria-live="polite">
            {result.total === 1 ? '1 game' : `${result.total} games`}
            {search.trim() && ` matching “${search.trim()}”`}
          </p>
          <ul className="game-grid">
            {games.map((game, index) => (
              <li key={game.id}>
                <GameCard game={game} index={index} onDeleted={handleDeleted} />
              </li>
            ))}
          </ul>
          <Pagination page={result.page} pages={result.pages} onChange={changePage} />
        </>
      )}

      {result && games.length === 0 && (
        <div className="library__empty board">
          <Lcd />
          <div className="library__empty-copy">
            {search.trim() ? (
              <>
                <p>No games match “{search.trim()}”.</p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => update({ search: '', page: 1 })}
                >
                  Clear search
                </button>
              </>
            ) : mine ? (
              <>
                <p>
                  You haven’t uploaded any games yet. Upload a .gb file you own to play it here.
                </p>
                <Link to="/games/new?to=mine" className="btn btn--primary">
                  Upload a game
                </Link>
              </>
            ) : isAdmin ? (
              <>
                <p>The library is empty. Add the first game for everyone to play.</p>
                <Link to="/games/new" className="btn btn--primary">
                  Add a game
                </Link>
              </>
            ) : (
              <p>No games in the library yet. Check back soon.</p>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

export default Library
