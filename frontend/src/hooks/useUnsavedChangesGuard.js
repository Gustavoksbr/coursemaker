import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Guards a page with unsaved local-draft changes against losing them by accident: blocks in-app
 * navigation to a different route (via `useBlocker`, which requires the data router set up in
 * `App.jsx`) and warns on tab close/refresh/typed-URL navigation via `beforeunload`.
 *
 * Switching only search params (e.g. `?lesson=`) does not block, since that never discards a
 * draft - only leaving the page's own pathname does.
 */
export function useUnsavedChangesGuard(isDirty) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!isDirty) return undefined
    const handler = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  return blocker
}
