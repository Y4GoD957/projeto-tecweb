export const PAGE_PATHS = {
  login: '/',
  dashboard: '/dashboard/',
  trader: '/trader/',
}

export function redirectToPage(page) {
  const nextPath = PAGE_PATHS[page]
  if (!nextPath) return
  window.location.href = nextPath
}
