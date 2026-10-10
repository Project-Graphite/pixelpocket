import { Link } from 'react-router-dom'
import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="page footer__inner">
        <span className="footer__name">PixelPocket</span>
        <nav className="footer__links" aria-label="Site">
          <Link to="/terms">Terms of service</Link>
          <Link to="/privacy">Privacy policy</Link>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
