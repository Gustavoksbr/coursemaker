import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, onUnauthorized } from '@/lib/api'
import { clearToken, getToken, setToken } from '@/lib/auth-storage'
import { ROLE } from '@/lib/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // `loading` covers the initial "do we have a valid token?" round-trip. Rendering routes before it
  // settles would bounce an authenticated user to /login on every refresh.
  const [loading, setLoading] = useState(Boolean(getToken()))
  const queryClient = useQueryClient()

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  // The API tells us when it rejected our token; drop the local session to match.
  useEffect(() => onUnauthorized(() => setUser(null)), [])

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    let cancelled = false
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (!cancelled) setUser(data)
      })
      .catch(() => {
        // A 401 already cleared the token in the interceptor; anything else means the API is down
        // and we simply start as a visitor.
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** Stores the token from a login/register response and adopts the returned user. */
  const authenticate = useCallback(
    (authResponse) => {
      setToken(authResponse.token)
      setUser(authResponse.user)
      queryClient.clear()
      return authResponse.user
    },
    [queryClient],
  )

  const login = useCallback(
    async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password })
      return authenticate(data)
    },
    [authenticate],
  )

  const register = useCallback(
    async (name, email, password) => {
      const { data } = await api.post('/auth/register', { name, email, password })
      return authenticate(data)
    },
    [authenticate],
  )

  const loginWithGoogle = useCallback(
    async (idToken) => {
      const { data } = await api.post('/auth/google', { idToken })
      return authenticate(data)
    },
    [authenticate],
  )

  /** Adopts a fresh user payload after a profile update, without a new token. */
  const refreshUser = useCallback((updated) => setUser(updated), [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === ROLE.ADMIN,
      needsNickname: Boolean(user?.needsNickname),
      login,
      register,
      loginWithGoogle,
      logout,
      refreshUser,
    }),
    [user, loading, login, register, loginWithGoogle, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  }
  return context
}
