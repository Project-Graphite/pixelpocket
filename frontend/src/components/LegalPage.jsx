import './LegalPage.css'

// sections: [{ id, title, body }]
const wideScreen = () => window.matchMedia('(min-width: 56rem)').matches

function LegalPage({ title, updated, lead, sections }) {
  return (
    <main className="page legal">
      <h1>{title}</h1>
      <p className="legal__updated">Last updated {updated}</p>

      <div className="legal__layout">
        {/* Open beside the text on wide screens, folded away on phones */}
        <details className="legal__contents" open={wideScreen()}>
          <summary>On this page</summary>
          <nav aria-label="On this page">
            <ul>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ul>
          </nav>
        </details>

        <article className="legal__body board">
          <p className="legal__lead">{lead}</p>
          {sections.map((s) => (
            <section key={s.id} className="legal__section" aria-labelledby={s.id}>
              <h2 id={s.id}>{s.title}</h2>
              {s.body}
            </section>
          ))}
        </article>
      </div>
    </main>
  )
}

export default LegalPage
