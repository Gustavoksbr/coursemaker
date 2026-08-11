/**
 * Thin fetch wrapper around the Coursemaker REST API. Mirrors what the frontend's axios client
 * does (bearer token, JSON body, the {status, error, message, fieldErrors} error envelope) but
 * without pulling in axios for a bot with three call sites.
 */
export function createHttpClient(baseUrl) {
  let token = null

  async function request(method, path, body, { auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' }
    if (auth) {
      if (!token) throw new Error(`Chamada autenticada (${method} ${path}) sem token definido`)
      headers.Authorization = `Bearer ${token}`
    }

    let response
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch (cause) {
      throw new Error(`Nao foi possivel conectar em ${baseUrl}${path}. O backend esta rodando?`, { cause })
    }

    const text = await response.text()
    const data = text ? JSON.parse(text) : null

    if (!response.ok) {
      const message = data?.message || `HTTP ${response.status} em ${method} ${path}`
      const error = new Error(message)
      error.status = response.status
      error.body = data
      throw error
    }

    return data
  }

  return {
    setToken(newToken) {
      token = newToken
    },
    get: (path, opts) => request('GET', path, undefined, opts),
    post: (path, body, opts) => request('POST', path, body, opts),
    patch: (path, body, opts) => request('PATCH', path, body, opts),
    delete: (path, opts) => request('DELETE', path, undefined, opts),
  }
}
