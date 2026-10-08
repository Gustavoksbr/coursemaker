import { describe, expect, it } from 'vitest'
import { formatWait, loginFailureMessage, rateLimitOf } from './rateLimit'

describe('formatWait', () => {
  it('formats seconds and minutes', () => {
    expect(formatWait(45)).toBe('45 s')
    expect(formatWait(120)).toBe('2 min')
    expect(formatWait(90)).toBe('1 min 30 s')
  })
})

describe('rateLimitOf', () => {
  it('reads the body of a login failure', () => {
    const error = { response: { status: 401, data: { rateLimit: { remainingAttempts: 3, blockSeconds: 90 } } } }
    expect(rateLimitOf(error)).toEqual({ remainingAttempts: 3, blockSeconds: 90, retryAfterSeconds: null })
  })

  it('falls back to Retry-After on a 429', () => {
    const error = { response: { status: 429, data: {}, headers: { 'retry-after': '30' } } }
    expect(rateLimitOf(error).retryAfterSeconds).toBe(30)
  })

  it('returns null for unrelated errors', () => {
    expect(rateLimitOf({ response: { status: 500, data: {} } })).toBeNull()
  })
})

describe('loginFailureMessage', () => {
  it('shows remaining tries and the block length', () => {
    const text = loginFailureMessage({ remainingAttempts: 1, blockSeconds: 90, retryAfterSeconds: null })
    expect(text).toContain('Resta 1 tentativa'.replace('Resta', 'Restam'))
    expect(text).toContain('1 min 30 s')
  })

  it('shows the countdown once blocked', () => {
    expect(loginFailureMessage({ remainingAttempts: 0, retryAfterSeconds: 90 }, 42)).toContain('42 s')
  })
})
