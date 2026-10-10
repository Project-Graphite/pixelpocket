import { useState } from 'react'
import { MoonIcon, SunIcon } from './Icons'

// The theme public/theme.js applied, or the system's
const currentTheme = () =>
  document.documentElement.dataset.theme ??
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

function ThemeToggle() {
  const [theme, setTheme] = useState(currentTheme)
  const next = theme === 'dark' ? 'light' : 'dark'

  const toggle = () => {
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // Without storage the choice lasts until the page closes
    }
    setTheme(next)
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

export default ThemeToggle
