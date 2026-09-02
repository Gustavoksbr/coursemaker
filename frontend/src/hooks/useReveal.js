import { useEffect, useRef, useState } from 'react'

/** True once the user has asked the OS to tone animation down. */
function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * Reveals an element the first time it scrolls into view - the "content appears as you scroll"
 * effect the landing page is built around. Deliberately IntersectionObserver + a CSS class rather
 * than an animation library: it is a dozen lines, ships nothing extra, and is exactly what the
 * sites we modelled this on do.
 *
 * Returns `[ref, revealed]`. Reveals immediately (no transition) under reduced-motion.
 */
/** Content must never stay hidden waiting on an observer that turns out not to fire. */
const FAILSAFE_MS = 1500

export function useReveal({ threshold = 0.15, once = true } = {}) {
  const ref = useRef(null)
  const [revealed, setRevealed] = useState(() => prefersReducedMotion())

  useEffect(() => {
    if (revealed || !ref.current) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true)
            if (once) observer.disconnect()
          } else if (!once) {
            setRevealed(false)
          }
        })
      },
      { threshold },
    )
    observer.observe(ref.current)

    // The reveal starts at opacity-0, so anything that stops the observer from ever reporting -
    // a page that is not compositing frames, an embedded webview, an odd accessibility tool -
    // would otherwise hide this content permanently. Showing it late beats never showing it.
    const failsafe = setTimeout(() => setRevealed(true), FAILSAFE_MS)

    return () => {
      observer.disconnect()
      clearTimeout(failsafe)
    }
  }, [revealed, threshold, once])

  return [ref, revealed]
}

/**
 * Counts from 0 up to `target` once the element is on screen. `null`/undefined targets (the API
 * still loading) stay at 0 without starting, so the animation runs against the real number.
 */
export function useCountUp(target, { durationMs = 1200 } = {}) {
  const [ref, revealed] = useReveal()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!revealed || target == null) return undefined
    if (prefersReducedMotion()) {
      setValue(target)
      return undefined
    }

    let frame
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / durationMs)
      // Ease-out: fast at first, settling into the final number.
      setValue(Math.round(target * (1 - (1 - progress) ** 3)))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    // requestAnimationFrame is tied to the rendering pipeline, so it never ticks in a backgrounded
    // tab or a page that is not compositing. A missing animation is fine; a counter frozen at "0"
    // when there are 112 courses is wrong information, so settle on the real number regardless.
    const settle = setTimeout(() => setValue(target), durationMs + 300)

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(settle)
    }
  }, [revealed, target, durationMs])

  return [ref, value]
}
