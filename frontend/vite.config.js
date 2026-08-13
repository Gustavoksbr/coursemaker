import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // sockjs-client (used by the notification WebSocket) references the Node global `global`,
  // which the browser does not have - polyfill it to globalThis so the SPA does not crash on load.
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // e2e/ holds Playwright specs, which use their own runner -- Vitest picking them up just
    // crashes on the unfamiliar `test.describe` fixtures.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
})
