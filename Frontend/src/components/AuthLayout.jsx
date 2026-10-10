import Lcd from './Lcd'
import './AuthLayout.css'

function AuthLayout({ title, intro, footer, children }) {
  return (
    <main className="page auth">
      <aside className="auth__panel">
        <Lcd />
        <p className="auth__tagline">Your games and your saves, in one pocket.</p>
      </aside>
      <section className="auth__main board">
        <h1 className="auth__heading">{title}</h1>
        {intro && <p className="auth__intro">{intro}</p>}
        <div className="auth__body">{children}</div>
        {footer && <p className="auth__footer">{footer}</p>}
      </section>
    </main>
  )
}

export default AuthLayout
