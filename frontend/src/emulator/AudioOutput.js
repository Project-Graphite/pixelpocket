// Browsers only allow sound after a click or key press, so create this from one
export class AudioOutput {
  static async create(inputRate) {
    const Context = window.AudioContext || window.webkitAudioContext
    if (!Context || !('audioWorklet' in Context.prototype)) return null

    const ctx = new Context({ latencyHint: 'interactive' })
    await ctx.audioWorklet.addModule('/audio-worklet.js')
    const node = new AudioWorkletNode(ctx, 'gameboy-audio', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: { inputRate },
    })
    const gain = ctx.createGain()
    node.connect(gain).connect(ctx.destination)
    return new AudioOutput(ctx, node, gain)
  }

  constructor(ctx, node, gain) {
    this.ctx = ctx
    this.node = node
    this.gain = gain
  }

  push(samples) {
    this.node.port.postMessage(samples, [samples.buffer])
  }

  setVolume(volume) {
    this.gain.gain.value = volume
  }

  async resume() {
    if (this.ctx.state !== 'running') await this.ctx.resume()
  }

  async suspend() {
    this.node.port.postMessage('clear')
    if (this.ctx.state === 'running') await this.ctx.suspend()
  }

  close() {
    this.ctx.close()
  }
}
