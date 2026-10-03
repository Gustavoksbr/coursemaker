import axios from 'axios'
import { clearToken, getToken } from './auth-storage'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** Listeners notified when the API rejects our token, so the auth context can log the user out. */
const unauthorizedListeners = new Set()

export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 usually means the token is missing, expired or forged, and the session should end.
    // But some endpoints answer 401 about a *different* credential — the password of a private
    // course — and those must not sign anyone out. They opt out with `skipAuthRedirect`.
    // (403 is an authorization decision on a valid token, so it never ends the session either.)
    const optedOut = error.config?.skipAuthRedirect
    if (error.response?.status === 401 && getToken() && !optedOut) {
      clearToken()
      unauthorizedListeners.forEach((listener) => listener())
    }
    return Promise.reject(error)
  },
)

/**
 * Human-readable message for an axios error, preferring the API's own envelope
 * ({@code {message, fieldErrors}}) over axios' generic text.
 */
export function errorMessage(error, fallback = 'Algo deu errado. Tente novamente.') {
  const data = error?.response?.data
  if (!data) {
    return error?.message === 'Network Error'
      ? 'Nao foi possivel falar com o servidor. Ele esta rodando?'
      : fallback
  }
  if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
    return Object.values(data.fieldErrors)[0]
  }
  return data.message || fallback
}

/** Field-level validation errors keyed by field name, for highlighting inputs. */
export function fieldErrors(error) {
  return error?.response?.data?.fieldErrors ?? {}
}

export function statusOf(error) {
  return error?.response?.status ?? 0
}
