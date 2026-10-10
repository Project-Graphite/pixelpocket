// Resamples the emulator's stereo samples (left, right, ...) to the sound card's rate.
// Speed is nudged by up to 0.5% to keep about 60 ms buffered: the two clocks differ
// slightly, and this stops the sound crackling or falling behind.
class GameBoyAudio extends AudioWorkletProcessor {
  constructor(options) {
    super()
    const inputRate = options.processorOptions.inputRate
    this.step = inputRate / sampleRate // input samples per output sample
    this.target = Math.round(inputRate * 0.06) // frames to keep buffered
    this.capacity = inputRate // one second
    this.buffer = new Float32Array(this.capacity * 2)
    this.read = 0
    this.write = 0
    this.size = 0
    this.position = 0 // fractional read position for resampling
    this.started = false

    this.port.onmessage = (e) => {
      if (e.data === 'clear') {
        this.size = 0
        this.read = this.write
        this.started = false
        return
      }
      this.push(e.data)
    }
  }

  push(samples) {
    const frames = samples.length / 2
    for (let i = 0; i < frames; i++) {
      if (this.size === this.capacity) {
        // Full: drop the oldest frame
        this.read = (this.read + 1) % this.capacity
        this.size--
      }
      this.buffer[this.write * 2] = samples[i * 2]
      this.buffer[this.write * 2 + 1] = samples[i * 2 + 1]
      this.write = (this.write + 1) % this.capacity
      this.size++
    }
    // Drop excess delay, for example after the tab was in the background
    if (this.size > this.target * 4) {
      const drop = this.size - this.target
      this.read = (this.read + drop) % this.capacity
      this.size -= drop
    }
  }

  process(inputs, outputs) {
    const left = outputs[0][0]
    const right = outputs[0][1] || left

    // Wait until a little sound has arrived before starting, to avoid an initial crackle
    if (!this.started) {
      if (this.size < this.target) {
        left.fill(0)
        right.fill(0)
        return true
      }
      this.started = true
    }

    const drift = Math.max(
      -0.005,
      Math.min(0.005, ((this.size - this.target) / this.target) * 0.005),
    )
    const step = this.step * (1 + drift)

    for (let i = 0; i < left.length; i++) {
      if (this.size < 2) {
        left[i] = 0
        right[i] = 0
        continue
      }
      const a = this.read
      const b = (this.read + 1) % this.capacity
      const t = this.position
      left[i] = this.buffer[a * 2] * (1 - t) + this.buffer[b * 2] * t
      right[i] = this.buffer[a * 2 + 1] * (1 - t) + this.buffer[b * 2 + 1] * t

      this.position += step
      while (this.position >= 1 && this.size > 1) {
        this.position -= 1
        this.read = (this.read + 1) % this.capacity
        this.size--
      }
    }
    return true
  }
}

registerProcessor('gameboy-audio', GameBoyAudio)
