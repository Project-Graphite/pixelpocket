import { useEffect, useId, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import { CloseIcon, MenuIcon } from './Icons'
import './Header.css'

function Header() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="header">
      <div className="page header__inner">
        <Logo />

        <nav
          id={menuId}
          className="header__nav"
          data-open={menuOpen ? 'true' : undefined}
          aria-label="Main"
          // Close the phone menu once a link or button is chosen
          onClick={(e) => {
            if (e.target.closest('a, button')) setMenuOpen(false)
          }}
        >
          <NavLink to="/library" className="header__link">
            Library
          </NavLink>
          {!loading && user && (
            <>
              <NavLink to="/my-games" className="header__link">
                My games
              </NavLink>
              <NavLink to="/account" className="header__link">
                Account
              </NavLink>
              <button type="button" className="header__link" onClick={handleLogout}>
                Log out
              </button>
            </>
          )}
          {!loading && !user && (
            <>
              <NavLink to="/login" className="header__link">
                Log in
              </NavLink>
              <Link to="/signup" className="btn btn--primary header__cta">
                Sign up
              </Link>
            </>
          )}
        </nav>

        <div className="header__tools">
          <ThemeToggle />
          <button
            type="button"
            className="header__menu-button"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
