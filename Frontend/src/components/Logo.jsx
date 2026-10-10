import { Link } from 'react-router-dom'
import './Logo.css'

function Logo() {
  return (
    <Link to="/" className="logo" aria-label="PixelPocket home">
      <img className="logo__icon" src="/favicon.svg" alt="" width="32" height="40" />
      <span className="logo__text">PixelPocket</span>
    </Link>
  )
}

export default Logo
