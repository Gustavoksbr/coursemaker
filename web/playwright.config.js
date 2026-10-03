import { defineConfig, devices } from '@playwright/test'

/**
 * E2E suite against the REAL stack: this frontend's dev server + the Spring Boot backend running
 * with SPRING_PROFILES_ACTIVE=e2e (see .vscode/terminals.json "Backend E2E"), which points at the
 * secondary Postgres database `coursemakerbrtestes` instead of the dev one. Playwright only starts
 * the frontend itself; the backend is a long-lived process you start separately, since it owns
 * which database is live and that is not something a test run should silently flip.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
