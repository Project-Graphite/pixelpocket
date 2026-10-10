import { api } from '../services/api'

// Logged-in players' saves go to their account; guests' saves stay in this browser.
// Games write saves in bursts, so a save is stored once it stops changing, and also
// when the game is paused or the page closes.

const CHECK_EVERY_MS = 3000
const localKey = (gameId) => `pixelpocket:save:${gameId}`

// MBC3 clock saves end with 13 bytes that change every second; comparisons ignore them
const CLOCK_FOOTER = 13
const CLOCK_CARTRIDGES = [0x0f, 0x10]

const sameBytes = (a, b, ignoreTail = 0) => {
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length - ignoreTail; i++) if (a[i] !== b[i]) return false
  return true
}

const toBase64 = (bytes) => {
  let text = ''
  for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i])
  return btoa(text)
}
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0))

export class SaveSync {
  // onStatus gets { state, at?, message? }; state: none, loading, synced, saving, local, error
  constructor({ emulator, game, account, onStatus }) {
    this.emulator = emulator
    this.gameId = game.id
    this.ignoreTail = CLOCK_CARTRIDGES.includes(game.cartridgeType) ? CLOCK_FOOTER : 0
    this.account = account
    this.onStatus = onStatus
    this.synced = null // the bytes last stored
    this.candidate = null // changed bytes waiting to stop changing
    this.timer = 0
    this.busy = false
    // Nothing is stored until the save has loaded, so a failed load can't overwrite it
    this.ready = false
  }

  status(state, extra = {}) {
    this.onStatus?.({ state, ...extra })
  }

  async load() {
    if (!this.emulator.hasBattery) {
      this.status('none')
      return
    }
    this.status('loading')

    let bytes = null
    if (this.account) {
      const buffer = await api.getBinary(`/games/${this.gameId}/save`)
      bytes = buffer ? new Uint8Array(buffer) : null
    } else {
      try {
        const stored = localStorage.getItem(localKey(this.gameId))
        bytes = stored ? fromBase64(stored) : null
      } catch {
        bytes = null
      }
    }

    if (bytes) this.emulator.importSave(bytes)
    this.synced = this.emulator.exportSave()
    this.ready = true
    this.status(this.account ? 'synced' : 'local', { fresh: !bytes })
  }

  startWatching() {
    if (!this.emulator.hasBattery || this.timer) return
    this.timer = window.setInterval(() => this.check(), CHECK_EVERY_MS)
  }

  stopWatching() {
    window.clearInterval(this.timer)
    this.timer = 0
  }

  check() {
    if (!this.ready) return
    const current = this.emulator.exportSave()
    if (!current || sameBytes(current, this.synced, this.ignoreTail)) {
      this.candidate = null
      return
    }
    // Store it once it has stayed the same for one check
    if (sameBytes(current, this.candidate, this.ignoreTail)) {
      this.store(current)
    } else {
      this.candidate = current
    }
  }

  flush({ closing = false } = {}) {
    if (!this.ready || !this.emulator.hasBattery) return
    const current = this.emulator.exportSave()
    if (current && !sameBytes(current, this.synced, this.ignoreTail))
      this.store(current, { closing })
  }

  async store(bytes, { closing = false } = {}) {
    if (!this.account) {
      try {
        localStorage.setItem(localKey(this.gameId), toBase64(bytes))
        this.synced = bytes
        this.candidate = null
        this.status('local', { at: new Date() })
      } catch {
        this.status('error', { message: 'This browser has no room left to keep your save.' })
      }
      return
    }

    if (this.busy && !closing) return
    this.busy = true
    this.status('saving')
    try {
      await api.putBinary(`/games/${this.gameId}/save`, bytes, { keepalive: closing })
      this.synced = bytes
      this.candidate = null
      this.status('synced', { at: new Date() })
    } catch (err) {
      this.status('error', { message: err.message })
    } finally {
      this.busy = false
    }
  }
}
