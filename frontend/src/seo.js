import { SITE_URL } from './config/site'

const DEFAULT_TITLE = 'PixelPocket – Play Game Boy games in your browser'
const DEFAULT_DESCRIPTION =
  'PixelPocket plays Game Boy games right in your browser. Pick a game from the library, upload your own, and keep your saves on every device.'

// A static title and description would be the same on every page, so each route sets its own
const ROUTES = {
  '/': {},
  '/library': {
    title: 'Game library',
    description: 'Browse the PixelPocket library and play Game Boy games in your browser.',
  },
  '/privacy': { title: 'Privacy' },
  '/terms': { title: 'Terms' },
  '/login': { title: 'Log in' },
  '/signup': { title: 'Sign up' },
  '/forgot-password': { title: 'Forgot password', noindex: true },
  '/my-games': { title: 'My games', noindex: true },
  '/games/new': { title: 'Upload a game', noindex: true },
  '/account': { title: 'Account', noindex: true },
  '/admin': { title: 'Admin', noindex: true },
}

export const routeMeta = (pathname) => {
  if (ROUTES[pathname]) return ROUTES[pathname]
  if (/^\/games\/[^/]+$/.test(pathname)) return { title: 'Play' }
  if (/^\/(games\/[^/]+\/edit|reset-password\/[^/]+)$/.test(pathname)) {
    return { title: 'PixelPocket', noindex: true }
  }
  return { title: 'Page not found', noindex: true }
}

const setTag = (name, selector, attrs) => {
  const el =
    document.head.querySelector(selector) ??
    document.head.appendChild(document.createElement(name))
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))
}

export function setPageMeta({ title, description = DEFAULT_DESCRIPTION, noindex = false }) {
  document.title = title ? `${title} · PixelPocket` : DEFAULT_TITLE
  setTag('meta', 'meta[name="description"]', { name: 'description', content: description })
  setTag('link', 'link[rel="canonical"]', {
    rel: 'canonical',
    href: `${SITE_URL}${window.location.pathname}`,
  })

  if (noindex) setTag('meta', 'meta[name="robots"]', { name: 'robots', content: 'noindex' })
  else document.head.querySelector('meta[name="robots"]')?.remove()
}
