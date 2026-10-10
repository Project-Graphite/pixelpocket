import { useEffect, useState } from 'react'
import Lcd from './Lcd'
import './Splash.css'

const SHOW_MS = 1300
const LEAVE_MS = 270

// The start-up animation on the home page. Any click or key skips it.
function Splash({ onDone }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (leaving) {
      const timer = window.setTimeout(onDone, LEAVE_MS)
      return () => window.clearTimeout(timer)
    }
    const leave = () => setLeaving(true)
    const timer = window.setTimeout(leave, SHOW_MS)
    window.addEventListener('keydown', leave)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', leave)
    }
  }, [leaving, onDone])

  return (
    <div
      className={`splash${leaving ? ' splash--leaving' : ''}`}
      onPointerDown={() => setLeaving(true)}
      aria-hidden="true"
    >
      <div className="splash__console">
        <Lcd />
      </div>
    </div>
  )
}

export default Splash
