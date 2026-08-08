import { useCallback, useState } from 'react'

/**
 * Drag-and-drop reordering on top of the native HTML5 drag events — no dependency needed for a
 * vertical list.
 *
 * `onReorder(ids)` fires once, on drop, with the ids in their new order; the caller persists it.
 * Returns the props each row needs plus `draggingId` / `overId` for styling.
 */
export function useDragReorder(items, onReorder, { idKey = 'id' } = {}) {
  const [draggingId, setDraggingId] = useState(null)
  const [overId, setOverId] = useState(null)

  const reset = useCallback(() => {
    setDraggingId(null)
    setOverId(null)
  }, [])

  const handleDrop = useCallback(
    (targetId) => {
      if (!draggingId || draggingId === targetId) {
        reset()
        return
      }
      const ids = items.map((item) => item[idKey])
      const from = ids.indexOf(draggingId)
      const to = ids.indexOf(targetId)
      if (from === -1 || to === -1) {
        reset()
        return
      }
      const next = [...ids]
      next.splice(to, 0, next.splice(from, 1)[0])
      reset()
      onReorder(next)
    },
    [draggingId, items, idKey, onReorder, reset],
  )

  const getItemProps = useCallback(
    (id) => ({
      draggable: true,
      onDragStart: (event) => {
        setDraggingId(id)
        event.dataTransfer.effectAllowed = 'move'
        // Firefox ignores a drag that carries no data.
        event.dataTransfer.setData('text/plain', id)
      },
      onDragOver: (event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        if (overId !== id) setOverId(id)
      },
      onDragLeave: () => setOverId((current) => (current === id ? null : current)),
      onDrop: (event) => {
        event.preventDefault()
        event.stopPropagation()
        handleDrop(id)
      },
      onDragEnd: reset,
    }),
    [handleDrop, overId, reset],
  )

  return { getItemProps, draggingId, overId }
}
