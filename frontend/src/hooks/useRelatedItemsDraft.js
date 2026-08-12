import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addCourseRelated,
  addPostRelated,
  listCourseRelated,
  listPostRelated,
  relatedKeys,
  removeCourseRelated,
  removePostRelated,
} from '@/api/related'

async function runStep(label, fn) {
  try {
    return await fn()
  } catch (error) {
    error.draftStepLabel = label
    throw error
  }
}

/**
 * Local-draft state for one course's/post's related-items list. Simpler than the tree-shaped
 * drafts (`useCurriculumDraft`, `useTrilhaStructureDraft`): there is no reorder UI for related
 * items and the list is paginated/incrementally loaded rather than eagerly fetched whole, so this
 * only ever tracks pending adds/removes layered on top of whatever page is currently cached,
 * instead of diffing a full local tree against a full baseline tree.
 */
export function useRelatedItemsDraft(kind, contentId) {
  const queryClient = useQueryClient()
  const queryKey = kind === 'course' ? relatedKeys.course(contentId, 0) : relatedKeys.post(contentId, 0)
  const query = useQuery({
    queryKey,
    queryFn: () => (kind === 'course' ? listCourseRelated(contentId, 0, 20) : listPostRelated(contentId, 0, 20)),
    // A post that doesn't exist yet (still on /posts/new) has nothing to fetch related items for.
    enabled: Boolean(contentId),
  })

  const [pendingAdds, setPendingAdds] = useState([])
  const [pendingRemoveIds, setPendingRemoveIds] = useState(() => new Set())
  const [isFlushing, setIsFlushing] = useState(false)

  const serverItems = query.data?.items ?? []
  const items = [
    ...serverItems.filter((related) => !pendingRemoveIds.has(related.id)),
    ...pendingAdds.map(({ tempId, type, item }) => ({
      id: tempId,
      course: type === 'course' ? item : null,
      post: type === 'post' ? item : null,
      isPending: true,
    })),
  ]

  const isDirty = pendingAdds.length > 0 || pendingRemoveIds.size > 0

  function add(type, item) {
    setPendingAdds((current) => [...current, { tempId: `tmp_${crypto.randomUUID()}`, type, item }])
  }

  function removeItem(relatedItemId) {
    const pending = pendingAdds.find((p) => p.tempId === relatedItemId)
    if (pending) {
      setPendingAdds((current) => current.filter((p) => p.tempId !== relatedItemId))
      return
    }
    setPendingRemoveIds((current) => new Set(current).add(relatedItemId))
  }

  async function flush() {
    setIsFlushing(true)
    try {
      for (const id of pendingRemoveIds) {
        await runStep('remover um item relacionado', () =>
          kind === 'course' ? removeCourseRelated(contentId, id) : removePostRelated(contentId, id),
        )
        setPendingRemoveIds((current) => {
          const next = new Set(current)
          next.delete(id)
          return next
        })
      }
      for (const pending of pendingAdds) {
        const payload = pending.type === 'course' ? { relatedCourseId: pending.item.id } : { relatedPostId: pending.item.id }
        await runStep('adicionar um item relacionado', () =>
          kind === 'course' ? addCourseRelated(contentId, payload) : addPostRelated(contentId, payload),
        )
        setPendingAdds((current) => current.filter((p) => p.tempId !== pending.tempId))
      }
    } finally {
      queryClient.invalidateQueries({ queryKey })
      setIsFlushing(false)
    }
  }

  return { items, isDirty, isFlushing, add, remove: removeItem, flush }
}
