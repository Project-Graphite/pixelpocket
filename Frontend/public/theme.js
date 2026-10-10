// Applies the saved theme before the page paints. A file, not inline, so the CSP can
// block inline scripts.
try {
  var t = localStorage.getItem('theme')
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
} catch {
  // Without storage the system theme is used
}
