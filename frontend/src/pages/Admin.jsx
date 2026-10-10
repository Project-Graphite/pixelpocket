import { useEffect, useState } from 'react'
import { api } from '../services/api'
import Alert from '../components/Alert'
import Pagination from '../components/Pagination'
import './Admin.css'

const FILES = 'files'

// Ids and dates arrive as strings; arrays and objects are shown as JSON
const show = (value) =>
  value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')

const ID = /\b[a-f\d]{24}\b/gi

// The names the server sent for the user and game IDs in a cell
const namesIn = (text, names) =>
  [...new Set(text.match(ID) ?? [])]
    .map((id) => names[id])
    .filter(Boolean)
    .join(' · ')

function DataTable({ rows, names = {} }) {
  if (!rows.length) return <p className="admin__empty">Nothing here yet.</p>

  const columns = [...new Set(rows.flatMap(Object.keys))]
  return (
    <div className="admin__table-wrap board">
      <table className="admin__table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row._id ?? row.key ?? i}>
              {columns.map((column) => {
                const text = show(row[column])
                const label = column === '_id' ? '' : namesIn(text, names)
                return (
                  <td key={column}>
                    {label && <span className="admin__name">{label}</span>}
                    {text}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Documents({ name }) {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get(`/admin/collections/${encodeURIComponent(name)}?page=${page}`)
      .then((res) => {
        if (!cancelled) setResult(res)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [name, page])

  if (error) return <Alert>{error}</Alert>
  if (!result) return <p className="admin__empty">Loading…</p>
  return (
    <>
      <DataTable rows={result.data.documents} names={result.data.names} />
      <Pagination page={result.page} pages={result.pages} onChange={setPage} />
    </>
  )
}

function Files() {
  const [after, setAfter] = useState(null)
  const [files, setFiles] = useState(null)
  const [names, setNames] = useState({})
  const [next, setNext] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api
      .get(`/admin/files${after ? `?after=${encodeURIComponent(after)}` : ''}`)
      .then((res) => {
        if (cancelled) return
        setFiles((list) => [...(list ?? []), ...res.data.files])
        setNames((known) => ({ ...known, ...res.data.names }))
        setNext(res.data.next)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [after])

  return (
    <>
      {error && <Alert>{error}</Alert>}
      {files ? (
        <DataTable rows={files} names={names} />
      ) : (
        !error && <p className="admin__empty">Loading…</p>
      )}
      {next && (
        <button
          type="button"
          className="btn"
          onClick={() => {
            setError('')
            setAfter(next)
          }}
        >
          Load more files
        </button>
      )}
    </>
  )
}

function Admin() {
  const [collections, setCollections] = useState(null)
  const [view, setView] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/admin/collections')
      .then((res) => {
        setCollections(res.data.collections)
        setView((current) => current ?? res.data.collections[0]?.name ?? FILES)
      })
      .catch((err) => setError(err.message))
  }, [])

  const tab = (id, label) => (
    <button
      key={id}
      type="button"
      className={`btn${view === id ? ' btn--primary' : ''}`}
      aria-pressed={view === id}
      onClick={() => setView(id)}
    >
      {label}
    </button>
  )

  return (
    <main className="page admin">
      <h1 className="admin__title">Admin</h1>
      <p className="admin__intro">
        Everything in the database and file storage, read-only. Passwords and reset tokens are never
        shown.
      </p>
      <Alert>{error}</Alert>
      {collections && (
        <>
          <div className="admin__tabs" aria-label="What to show">
            {collections.map((c) => tab(c.name, `${c.name} (${c.count})`))}
            {tab(FILES, 'Files')}
          </div>
          {view === FILES ? <Files /> : view && <Documents key={view} name={view} />}
        </>
      )}
    </main>
  )
}

export default Admin
