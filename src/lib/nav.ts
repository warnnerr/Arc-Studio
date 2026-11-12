import { useEffect, useState } from 'react'

const NAV_EVENT = 'app:navigate'

export function navigate(path: string): void {
  if (window.location.pathname === path) return
  window.history.pushState({}, '', path)
  window.dispatchEvent(new Event(NAV_EVENT))
}

export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    window.addEventListener('popstate', sync)
    window.addEventListener(NAV_EVENT, sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(NAV_EVENT, sync)
    }
  }, [])
  return path
}

/** Matches `/pay/<id>` and returns the id. */
export function matchPayId(path: string): string | null {
  const match = /^\/pay\/([0-9a-f]{12})\/?$/.exec(path)
  return match ? match[1] : null
}
