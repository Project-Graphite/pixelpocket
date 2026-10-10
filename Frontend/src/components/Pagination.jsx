import './Pagination.css'

function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null

  return (
    <nav className="pagination" aria-label="Pages">
      <button type="button" className="btn" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        Previous
      </button>
      <span className="pagination__status" aria-live="polite">
        Page {page} of {pages}
      </span>
      <button
        type="button"
        className="btn"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
      >
        Next
      </button>
    </nav>
  )
}

export default Pagination
