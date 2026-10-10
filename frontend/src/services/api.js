const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

const NETWORK_ERROR = 'Could not reach the server. Check your connection and try again.'

// Most errors are JSON; the rate limiter can reply with plain text
const parseError = (text, status) => {
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  const message = data?.message ?? (text && text.length < 200 ? text : `Request failed (${status})`)
  return new ApiError(message, status)
}

async function send(path, options = {}) {
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, { credentials: 'include', ...options })
  } catch {
    throw new ApiError(NETWORK_ERROR, 0)
  }
  if (!res.ok) throw parseError(await res.text(), res.status)
  return res
}

const readJson = async (res) => {
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

const request = async (method, path, body) =>
  readJson(
    await send(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
  )

// Uses XHR because fetch can't report upload progress (0 to 1)
function upload(method, path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, `${BASE_URL}${path}`)
    xhr.withCredentials = true
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total)
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText ? JSON.parse(xhr.responseText) : null)
      } else {
        reject(parseError(xhr.responseText, xhr.status))
      }
    }
    xhr.onerror = () => reject(new ApiError(NETWORK_ERROR, 0))
    xhr.send(formData)
  })
}

// An ArrayBuffer, or null when there is nothing (204)
const getBinary = async (path) => {
  const res = await send(path)
  return res.status === 204 ? null : res.arrayBuffer()
}

// keepalive lets the request finish after the page closes; browsers cap it at 64 KB
const putBinary = async (path, bytes, { keepalive = false } = {}) =>
  readJson(
    await send(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: bytes,
      keepalive: keepalive && bytes.byteLength < 60 * 1024,
    }),
  )

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body ?? {}),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
  upload,
  getBinary,
  putBinary,
}

export const coverUrl = (game) =>
  game.hasCover ? `${BASE_URL}/games/${game.id}/cover?v=${Date.parse(game.coverUpdatedAt)}` : null
