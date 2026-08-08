import { useEffect, useRef, useState } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

let scriptPromise = null

/** Loads the Google Identity Services script once, no matter how many buttons ask for it. */
function loadGoogleScript() {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', resolve)
      existing.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Renders Google's own sign-in button and hands the resulting ID token to `onCredential`.
 * Renders nothing when VITE_GOOGLE_CLIENT_ID is unset, which is also when the backend rejects
 * the /auth/google endpoint.
 */
export function GoogleButton({ onCredential, text = 'signin_with' }) {
  const containerRef = useRef(null)
  const [failed, setFailed] = useState(false)
  // Kept in a ref so re-renders do not force us to re-initialise Google's widget.
  const callbackRef = useRef(onCredential)
  callbackRef.current = onCredential

  useEffect(() => {
    if (!CLIENT_ID) return

    let cancelled = false
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => callbackRef.current?.(response.credential),
        })
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: 320,
          text,
          locale: 'pt-BR',
        })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [text])

  if (!CLIENT_ID) return null

  if (failed) {
    return (
      <p className="text-center text-xs text-slate-500">
        Nao foi possivel carregar o login do Google.
      </p>
    )
  }

  return <div ref={containerRef} className="flex justify-center" />
}

export const googleLoginEnabled = Boolean(CLIENT_ID)
