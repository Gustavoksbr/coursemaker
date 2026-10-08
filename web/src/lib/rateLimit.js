/** "1 min 30 s", "45 s", "2 min" - for blocks and countdowns. */
export function formatWait(totalSeconds) {
  const seconds = Math.max(0, Math.ceil(totalSeconds))
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`
}

/**
 * Reads the throttling state the API attaches to login failures (401) and blocks (429):
 * `{ remainingAttempts, blockSeconds, retryAfterSeconds }`. Returns null when there is none.
 * `retryAfterSeconds` set means the caller is blocked right now (falls back to the Retry-After header).
 */
export function rateLimitOf(error) {
  const status = error?.response?.status
  const info = error?.response?.data?.rateLimit
  const header = Number(error?.response?.headers?.['retry-after'])
  if (!info && !(status === 429 && header > 0)) return null
  const retryAfter = info?.retryAfterSeconds ?? (status === 429 && header > 0 ? header : null)
  return {
    remainingAttempts: info?.remainingAttempts ?? null,
    blockSeconds: info?.blockSeconds ?? null,
    retryAfterSeconds: retryAfter,
  }
}

/** The message under the login form after a failed attempt. */
export function loginFailureMessage(limit, secondsLeft) {
  if (limit?.retryAfterSeconds != null) {
    return `Muitas tentativas. Login bloqueado, tente novamente em ${formatWait(secondsLeft ?? limit.retryAfterSeconds)}.`
  }
  if (limit?.remainingAttempts != null) {
    const left = limit.remainingAttempts
    const block = limit.blockSeconds != null ? ` por ${formatWait(limit.blockSeconds)}` : ''
    return `Credenciais invalidas. Restam ${left} tentativa${left === 1 ? '' : 's'} antes de o login ser bloqueado${block}.`
  }
  return null
}
