// Reads a .gb file's header to suggest a title and catch wrong files early.
// The server checks every upload again.

const LOGO_START = 0x104
const LOGO_FIRST_BYTES = [0xce, 0xed, 0x66, 0x66] // first bytes of the Nintendo logo
const MAX_ROM_BYTES = 8 * 1024 * 1024
export const MAX_COVER_BYTES = 5 * 1024 * 1024

export async function readRomHeader(file) {
  if (file.size > MAX_ROM_BYTES) {
    return { ok: false, error: 'A Game Boy ROM can be at most 8 MB.' }
  }
  if (file.size < 0x150) {
    return { ok: false, error: 'This file is too small to be a Game Boy ROM.' }
  }

  const header = new Uint8Array(await file.slice(0, 0x150).arrayBuffer())
  if (!LOGO_FIRST_BYTES.every((b, i) => header[LOGO_START + i] === b)) {
    return { ok: false, error: 'This file is not a Game Boy ROM.' }
  }
  if (header[0x143] === 0xc0) {
    return {
      ok: false,
      error: 'This game only runs on the Game Boy Color, which PixelPocket does not support yet.',
    }
  }

  let title = ''
  for (let i = 0x134; i <= 0x143; i++) {
    const c = header[i]
    if (c === 0) break
    if (c >= 0x20 && c <= 0x7e) title += String.fromCharCode(c)
  }

  // Header titles are upper case: "TETRIS" -> "Tetris"
  const suggestion = title
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return { ok: true, title: suggestion }
}

// "Some Game (USA).gb" -> "Some Game"
export const titleFromFileName = (name) =>
  name
    .replace(/\.(gb|gbc)$/i, '')
    .replace(/[_.]+/g, ' ')
    .replace(/\s*[([].*?[)\]]\s*/g, ' ')
    .trim()
    .slice(0, 60)
