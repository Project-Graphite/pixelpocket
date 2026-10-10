const WIDTH = 160
const HEIGHT = 144
const FRAME_MS = (70224 / 4194304) * 1000 // one Game Boy frame, about 16.74 ms
const MAX_CATCH_UP = 4 // after a hiccup, frames to run at once before dropping the lost time

export const BUTTONS = {
  right: 0,
  left: 1,
  up: 2,
  down: 3,
  a: 4,
  b: 5,
  select: 6,
  start: 7,
}

// '#rrggbb' -> 0xAABBGGRR, the byte order of canvas pixels on little-endian machines
const toPixel = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0
}

export class Emulator {
  constructor(core, canvas) {
    this.core = core
    this.ctx = canvas.getContext('2d', { alpha: false })
    this.image = this.ctx.createImageData(WIDTH, HEIGHT)
    this.pixels = new Uint32Array(this.image.data.buffer)
    this.palette = new Uint32Array(4)
    this.running = false
    this.audio = null
    this.beforeFrame = null // runs once per display refresh
    this.raf = 0
    this.last = 0
    this.pending = 0
  }

  loadRom(bytes) {
    const { core } = this
    const ptr = core._malloc(bytes.length)
    core.HEAPU8.set(bytes, ptr)
    const ok = core._gb_load_rom(ptr, bytes.length)
    core._free(ptr)
    if (!ok) throw new Error('This ROM could not be started.')
    this.draw()
  }

  get hasBattery() {
    return this.core._gb_has_battery() === 1
  }

  // A copy of the cartridge's battery save, or null if the game has none
  exportSave() {
    const { core } = this
    const size = core._gb_save_export()
    if (!size) return null
    const ptr = core._gb_save_data()
    return core.HEAPU8.slice(ptr, ptr + size)
  }

  importSave(bytes) {
    const { core } = this
    const ptr = core._malloc(bytes.length)
    core.HEAPU8.set(bytes, ptr)
    const ok = core._gb_save_import(ptr, bytes.length)
    core._free(ptr)
    return ok === 1
  }

  setButton(button, pressed) {
    this.core._gb_set_button(button, pressed ? 1 : 0)
  }

  setPalette(colors) {
    colors.forEach((hex, i) => {
      this.palette[i] = toPixel(hex)
    })
    if (!this.running) this.draw()
  }

  start() {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    this.pending = 0
    this.raf = requestAnimationFrame(this.tick)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  // One Game Boy frame per 1/59.73 s, whatever the display's refresh rate
  tick = (now) => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.tick)

    this.pending += Math.min(now - this.last, 250)
    this.last = now
    this.beforeFrame?.()

    let frames = 0
    while (this.pending >= FRAME_MS && frames < MAX_CATCH_UP) {
      this.core._gb_run_frame()
      this.pushAudio()
      this.pending -= FRAME_MS
      frames++
    }
    if (frames === MAX_CATCH_UP) this.pending = 0
    if (frames) this.draw()
  }

  pushAudio() {
    if (!this.audio) return
    const { core } = this
    const count = core._gb_audio_sample_count()
    if (!count) return
    const start = core._gb_audio_samples() >> 1 // byte address -> 16-bit index
    const samples = core.HEAP16.subarray(start, start + count)
    const out = new Float32Array(count)
    for (let i = 0; i < count; i++) out[i] = samples[i] / 32768
    this.audio.push(out)
  }

  draw() {
    const { core } = this
    const ptr = core._gb_framebuffer()
    if (!ptr) return
    const shades = core.HEAPU8.subarray(ptr, ptr + WIDTH * HEIGHT)
    for (let i = 0; i < shades.length; i++) {
      this.pixels[i] = this.palette[shades[i] & 3]
    }
    this.ctx.putImageData(this.image, 0, 0)
  }

  destroy() {
    this.stop()
    this.core._gb_unload()
  }
}
