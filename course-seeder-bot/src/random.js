/** Random integer in [min, max], inclusive on both ends. */
export function randomInt(min, max) {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  return lo + Math.floor(Math.random() * (hi - lo + 1))
}

export function pick(items) {
  return items[randomInt(0, items.length - 1)]
}
