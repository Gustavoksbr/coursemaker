import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Anchored to the project root regardless of the caller's cwd, so `npm start` from anywhere
// inside this package always reads/writes the same file. Gitignored on purpose: every clone (or
// every machine) starts its own numbering, there is nothing to share here.
const ROOT_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const COUNTER_FILE = path.join(ROOT_DIR, 'bot-account-counter.txt')

export function readCounter(defaultValue = 1) {
  try {
    const raw = fs.readFileSync(COUNTER_FILE, 'utf8').trim()
    const value = Number.parseInt(raw, 10)
    return Number.isInteger(value) && value > 0 ? value : defaultValue
  } catch {
    return defaultValue
  }
}

export function writeCounter(value) {
  fs.writeFileSync(COUNTER_FILE, String(value), 'utf8')
}
