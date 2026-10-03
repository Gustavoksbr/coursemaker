import { useCallback, useEffect, useRef, useState } from 'react'

const DRAG_THRESHOLD = 6
const EDGE_MARGIN = 8

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function readStoredPosition(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    const parsed = raw ? JSON.parse(raw) : null
    if (typeof parsed?.bottom === 'number' && typeof parsed?.right === 'number') {
      return parsed
    }
  } catch {
    // Private browsing, cleared/blocked site data, corrupted value - fall back silently.
  }
  return null
}

function clampToViewport({ bottom, right }, width, height) {
  const maxRight = Math.max(EDGE_MARGIN, window.innerWidth - width - EDGE_MARGIN)
  const maxBottom = Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN)
  return { right: clamp(right, EDGE_MARGIN, maxRight), bottom: clamp(bottom, EDGE_MARGIN, maxBottom) }
}

/**
 * A `{ bottom, right }` position in px, anchored to the viewport's bottom-right corner (so it
 * survives window resizes without recalculation), that the user can drag around with mouse or
 * touch. Persisted per browser in localStorage - a per-viewer convenience, never sent to the
 * server or shared across devices.
 *
 * `makeHandle(elementRef, onTap)` wires up one draggable handle - a widget can have more than one
 * (e.g. a closed bubble and an open panel's header) as long as they all share this same position.
 * `onTap` fires for a genuine click/keyboard-activate, never for a drag: the two are told apart by
 * movement distance, and a click that follows a real drag is swallowed so it can't also toggle
 * whatever `onTap` does. A pointerdown that starts on a nested interactive element (a button,
 * input...) never starts a drag, so those keep working normally.
 *
 * Until the user actually drags the widget for the first time, its position simply tracks
 * `defaultPosition` on every render - so a caller can move a never-touched widget out of the way
 * of something else on screen (e.g. CourseViewPage raising it clear of the lesson nav bar) without
 * that fight being lost the instant it's overridden by a stale stored value. The first real drag
 * "pins" a spot, persisted in localStorage, and `defaultPosition` is ignored from then on.
 */
export function useDraggableWidget(storageKey, defaultPosition) {
  const [pinnedPosition, setPinnedPosition] = useState(() => readStoredPosition(storageKey))
  const position = pinnedPosition ?? defaultPosition
  const drag = useRef(null)
  const suppressNextClick = useRef(false)

  const pin = useCallback(
    (next) => {
      setPinnedPosition(next)
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // ignore
      }
    },
    [storageKey],
  )

  // A pinned position saved from a wider screen (or before a phone rotation) could now sit
  // off-screen. An unpinned position is always whatever the caller currently considers safe, so
  // there is nothing to re-clamp.
  useEffect(() => {
    const handleResize = () => {
      setPinnedPosition((current) => {
        if (!current) return current
        const size = drag.current?.lastSize ?? { width: 0, height: 0 }
        const next = clampToViewport(current, size.width, size.height)
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          // ignore
        }
        return next
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [storageKey])

  const makeHandle = useCallback(
    (elementRef, onTap) => ({
      onPointerDown: (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return
        // Lets a nested interactive child (e.g. the panel header's own close button) keep working
        // normally - but not the handle itself, even though it is very often a <button> (the
        // bubble) whose own icon is what's actually under the pointer.
        const interactiveAncestor = event.target.closest('button, input, textarea, a')
        if (interactiveAncestor && interactiveAncestor !== event.currentTarget) return
        const rect = elementRef.current?.getBoundingClientRect()
        drag.current = {
          startX: event.clientX,
          startY: event.clientY,
          startPosition: position,
          moved: false,
          lastSize: rect ? { width: rect.width, height: rect.height } : { width: 0, height: 0 },
        }
        event.currentTarget.setPointerCapture(event.pointerId)
      },
      onPointerMove: (event) => {
        const state = drag.current
        if (!state) return
        const deltaX = event.clientX - state.startX
        const deltaY = event.clientY - state.startY
        if (!state.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return
        state.moved = true
        pin(
          clampToViewport(
            { right: state.startPosition.right - deltaX, bottom: state.startPosition.bottom - deltaY },
            state.lastSize.width,
            state.lastSize.height,
          ),
        )
      },
      onPointerUp: (event) => {
        const state = drag.current
        drag.current = null
        event.currentTarget.releasePointerCapture?.(event.pointerId)
        if (state?.moved) suppressNextClick.current = true
      },
      onPointerCancel: () => {
        drag.current = null
      },
      onClick: (event) => {
        if (suppressNextClick.current) {
          suppressNextClick.current = false
          event.preventDefault()
          return
        }
        onTap?.(event)
      },
    }),
    [position, pin],
  )

  return { position, makeHandle }
}
