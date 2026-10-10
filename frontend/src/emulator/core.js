// Loads the WebAssembly emulator from /emulator/ once and shares it
let corePromise = null

export function loadCore() {
  if (!corePromise) {
    const url = new URL('/emulator/gb.js', window.location.origin).href
    corePromise = import(/* @vite-ignore */ url)
      .then((module) => module.default())
      .catch((err) => {
        corePromise = null
        console.error(err)
        throw new Error('The emulator could not be loaded. Reload the page to try again.')
      })
  }
  return corePromise
}
