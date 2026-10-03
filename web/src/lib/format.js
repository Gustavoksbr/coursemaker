const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function formatDate(iso) {
  if (!iso) return ''
  return dateFormatter.format(new Date(iso))
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** "13 de ago. de 2026, 14:05" - full precision, for a tooltip over a message timestamp. */
export function formatDateTime(iso) {
  if (!iso) return ''
  return dateTimeFormatter.format(new Date(iso))
}

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** "14:05" - short clock time, shown inline next to each message. */
export function formatTime(iso) {
  if (!iso) return ''
  return timeFormatter.format(new Date(iso))
}

const RELATIVE_UNITS = [
  { limit: 60, unit: 'second', divisor: 1 },
  { limit: 3600, unit: 'minute', divisor: 60 },
  { limit: 86400, unit: 'hour', divisor: 3600 },
  { limit: 2592000, unit: 'day', divisor: 86400 },
  { limit: 31536000, unit: 'month', divisor: 2592000 },
]

const relativeFormatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

/** "ha 5 minutos", "ontem", ... falling back to an absolute date past a year. */
export function formatRelative(iso) {
  if (!iso) return ''
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000
  if (seconds < 30) return 'agora mesmo'
  for (const { limit, unit, divisor } of RELATIVE_UNITS) {
    if (seconds < limit) {
      return relativeFormatter.format(-Math.floor(seconds / divisor), unit)
    }
  }
  return formatDate(iso)
}

export function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

/** Initials for the avatar fallback: "Ana Maria Silva" -> "AS". */
export function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}
