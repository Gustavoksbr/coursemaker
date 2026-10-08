import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const AuthModalContext = createContext(null)

/**
 * Which auth dialog is open (login, register, forgot, reset) - or none. Sign-in lives in a modal
 * instead of its own routes so the user never leaves the page they are on (a lesson, a post...).
 * The dialog itself is rendered by <AuthModal />, inside the layouts.
 */
export function AuthModalProvider({ children }) {
  const [state, setState] = useState({ view: null, token: '' })

  const show = useCallback((view, token = '') => setState({ view, token }), [])
  const close = useCallback(() => setState({ view: null, token: '' }), [])

  const value = useMemo(
    () => ({
      view: state.view,
      resetToken: state.token,
      openLogin: () => show('login'),
      openRegister: () => show('register'),
      openForgot: () => show('forgot'),
      openReset: (token) => show('reset', token),
      close,
    }),
    [state, show, close],
  )

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>
}

export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (!context) throw new Error('useAuthModal must be used inside <AuthModalProvider>')
  return context
}
