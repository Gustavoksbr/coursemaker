import { test as base, expect } from '@playwright/test'
import { newApiContext } from './api'

/**
 * Adds `api` (a request context straight to the backend, for fast test setup) and `loginAs` (primes
 * a page's localStorage with a JWT before the first navigation, skipping the login form for tests
 * that are not themselves about logging in).
 */
export const test = base.extend({
  api: async ({}, use) => {
    const context = await newApiContext()
    await use(context)
    await context.dispose()
  },

  loginAs: async ({ page }, use) => {
    await use(async (token) => {
      await page.addInitScript((t) => {
        window.localStorage.setItem('coursemaker.token', t)
      }, token)
    })
  },
})

export { expect }
