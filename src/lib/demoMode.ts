// Demo mode is entered via `?demo=1` in the URL (outside the hash, e.g. https://host/?demo=1#/).
// It switches the app to a separate IndexedDB filled with sample data (see demoSeed.ts).

const DEMO_PARAM = 'demo'

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get(DEMO_PARAM) === '1'
}

export function exitDemoMode(): void {
  window.location.href = `${window.location.pathname}#/`
}
