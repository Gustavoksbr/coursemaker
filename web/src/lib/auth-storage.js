const TOKEN_KEY = 'coursemaker.token'

/**
 * The JWT lives in localStorage, as specified for the MVP. Reads are wrapped because a browser with
 * storage disabled (private mode, embedded webviews) throws instead of returning null.
 */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* storage unavailable: the session simply will not survive a reload */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* nothing to clean up */
  }
}
