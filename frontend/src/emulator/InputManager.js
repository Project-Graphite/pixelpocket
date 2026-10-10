import { BUTTONS } from './Emulator'

// event.code is the key's position, so any keyboard layout works
const KEYMAP = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyX: 'a',
  KeyK: 'a',
  KeyZ: 'b',
  KeyJ: 'b',
  Enter: 'start',
  ShiftLeft: 'select',
  ShiftRight: 'select',
  Backspace: 'select',
}

// The bottom face button is B and the right one is A, as on a Game Boy
const GAMEPAD_BUTTONS = {
  0: 'b',
  1: 'a',
  2: 'b',
  3: 'a',
  8: 'select',
  9: 'start',
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
}
const STICK_THRESHOLD = 0.5

const isTyping = (target) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

// A button is held while any source (keyboard, touch, gamepad) holds it
export class InputManager {
  constructor(emulator) {
    this.emulator = emulator
    this.sources = { keyboard: new Set(), touch: new Set(), gamepad: new Set() }
    this.held = new Set()
    this.onGamepad = null // called when a gamepad is first used
    this.gamepadSeen = false
    // Off while the game isn't running, so keys can still press the page's buttons
    this.enabled = false
  }

  setSource(source, buttons) {
    this.sources[source] = new Set(buttons)
    this.apply()
  }

  apply() {
    const next = new Set([...this.sources.keyboard, ...this.sources.touch, ...this.sources.gamepad])
    for (const name of Object.keys(BUTTONS)) {
      const now = next.has(name)
      if (now !== this.held.has(name)) this.emulator.setButton(BUTTONS[name], now)
    }
    this.held = next
  }

  releaseAll() {
    for (const source of Object.keys(this.sources)) this.sources[source] = new Set()
    this.apply()
  }

  // Returns a function that removes the listeners
  attachKeyboard(onShortcut) {
    const down = (e) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      const button = this.enabled ? KEYMAP[e.code] : undefined
      if (button) {
        e.preventDefault()
        if (!this.sources.keyboard.has(button)) {
          this.sources.keyboard.add(button)
          this.apply()
        }
      } else if (onShortcut && !e.repeat) {
        onShortcut(e)
      }
    }
    const up = (e) => {
      const button = KEYMAP[e.code]
      if (button && this.sources.keyboard.delete(button)) this.apply()
    }
    // Keys released while the window is in the background never send keyup
    const blur = () => this.releaseAll()

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }

  pollGamepads() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    const held = new Set()
    for (const pad of pads) {
      if (!pad || !pad.connected) continue
      pad.buttons.forEach((button, i) => {
        if (button.pressed && GAMEPAD_BUTTONS[i]) held.add(GAMEPAD_BUTTONS[i])
      })
      const [x = 0, y = 0] = pad.axes
      if (x < -STICK_THRESHOLD) held.add('left')
      if (x > STICK_THRESHOLD) held.add('right')
      if (y < -STICK_THRESHOLD) held.add('up')
      if (y > STICK_THRESHOLD) held.add('down')
    }

    if (held.size && !this.gamepadSeen) {
      this.gamepadSeen = true
      this.onGamepad?.()
    }

    const before = this.sources.gamepad
    if (held.size !== before.size || [...held].some((b) => !before.has(b))) {
      this.sources.gamepad = held
      this.apply()
    }
  }
}
