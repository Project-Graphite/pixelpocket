import { useRef } from 'react'
import './TouchControls.css'

// Each finger is tracked separately, so players can hold a direction while pressing A,
// slide around the D-pad, or roll a thumb from B to A

const DPAD_DEAD_ZONE = 0.14 // share of the pad's width around the centre that presses nothing

const dpadButtons = (el, x, y) => {
  const r = el.getBoundingClientRect()
  const dx = x - (r.left + r.width / 2)
  const dy = y - (r.top + r.height / 2)
  const held = new Set()
  if (Math.hypot(dx, dy) < r.width * DPAD_DEAD_ZONE) return held

  // 8 slices of 45 degrees: straight directions plus diagonals
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI // 0 = right, 90 = down
  if (angle > -67.5 && angle < 67.5) held.add('right')
  if (angle > 112.5 || angle < -112.5) held.add('left')
  if (angle > 22.5 && angle < 157.5) held.add('down')
  if (angle < -22.5 && angle > -157.5) held.add('up')
  return held
}

// The nearest of A and B; both when the thumb is between them
const actionButtons = (el, x, y) => {
  const centre = (name) => {
    const r = el.querySelector(`[data-button="${name}"]`).getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, radius: r.width / 2 }
  }
  const a = centre('a')
  const b = centre('b')
  const toA = Math.hypot(x - a.x, y - a.y)
  const toB = Math.hypot(x - b.x, y - b.y)
  const reach = a.radius * 1.15
  const held = new Set()
  if (toA < reach) held.add('a')
  if (toB < reach) held.add('b')
  if (!held.size) held.add(toA < toB ? 'a' : 'b')
  return held
}

const single = (name) => () => new Set([name])

function TouchControls({ onChange }) {
  const root = useRef(null)
  const fingers = useRef(new Map()) // pointer id -> buttons that finger holds

  const emit = () => {
    const held = new Set()
    fingers.current.forEach((buttons) => buttons.forEach((b) => held.add(b)))
    // Set directly to avoid a re-render on every finger move
    root.current.querySelectorAll('[data-button]').forEach((el) => {
      el.toggleAttribute('data-pressed', held.has(el.dataset.button))
    })
    onChange(held)
  }

  const zone = (resolve) => ({
    onPointerDown(e) {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      const held = resolve(e.currentTarget, e.clientX, e.clientY)
      fingers.current.set(e.pointerId, held)
      if (held.size) navigator.vibrate?.(8)
      emit()
    },
    onPointerMove(e) {
      const before = fingers.current.get(e.pointerId)
      if (!before) return
      const held = resolve(e.currentTarget, e.clientX, e.clientY)
      if (held.size !== before.size || [...held].some((b) => !before.has(b))) {
        if ([...held].some((b) => !before.has(b))) navigator.vibrate?.(6)
        fingers.current.set(e.pointerId, held)
        emit()
      }
    },
    onPointerUp(e) {
      if (fingers.current.delete(e.pointerId)) emit()
    },
    onPointerCancel(e) {
      if (fingers.current.delete(e.pointerId)) emit()
    },
    onLostPointerCapture(e) {
      if (fingers.current.delete(e.pointerId)) emit()
    },
  })

  return (
    <div
      ref={root}
      className="pad"
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Touch controls"
      role="group"
    >
      <div className="pad__dpad" {...zone(dpadButtons)}>
        <span className="pad__arm pad__arm--up" data-button="up" />
        <span className="pad__arm pad__arm--down" data-button="down" />
        <span className="pad__arm pad__arm--left" data-button="left" />
        <span className="pad__arm pad__arm--right" data-button="right" />
        <span className="pad__hub" />
      </div>

      <div className="pad__actions" {...zone(actionButtons)}>
        <span className="pad__action pad__action--b" data-button="b">
          B
        </span>
        <span className="pad__action pad__action--a" data-button="a">
          A
        </span>
      </div>

      <div className="pad__system">
        <span className="pad__pill-wrap" {...zone(single('select'))}>
          <span className="pad__pill" data-button="select" />
          Select
        </span>
        <span className="pad__pill-wrap" {...zone(single('start'))}>
          <span className="pad__pill" data-button="start" />
          Start
        </span>
      </div>
    </div>
  )
}

export default TouchControls
