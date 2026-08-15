import { useReducer, useRef, useState } from 'react'
import {
  commitCreate,
  commitDelete,
  commitReorder,
  commitUpdate,
  diffMutations,
  diffOrder,
  emptyCollection,
  insert,
  patch,
  remove,
  reorder,
} from '@/lib/draftCollection'

async function runStep(label, fn) {
  try {
    return await fn()
  } catch (error) {
    error.draftStepLabel = label
    throw error
  }
}

function reducer(_state, action) {
  return action.collection
}

/**
 * Local-draft state for a flat block list (a post's content): mirrors the per-lesson block
 * drafting inside `useCurriculumDraft`, but standalone since a post has no module/lesson tree
 * above it. Every add/edit/delete/reorder mutates draft state only; nothing hits the network until
 * `flush()`, so editing a block never requires its own separate save step.
 */
export function useBlocksDraft(parentId, api) {
  const [collection, dispatch] = useReducer(reducer, emptyCollection([]))
  const [isFlushing, setIsFlushing] = useState(false)
  // Guards against re-fetching (and clobbering in-progress local edits) if `seed()` is ever called
  // more than once for the same parent - e.g. an effect re-running.
  const seededForRef = useRef(null)

  const { creates, updates, deletes } = diffMutations(collection)
  const isDirty = creates.length > 0 || updates.length > 0 || deletes.length > 0 || diffOrder(collection) !== null

  async function seed() {
    if (seededForRef.current === parentId) return collection.local
    seededForRef.current = parentId
    const fetched = await api.list(parentId)
    const seeded = fetched.map((block) => ({
      id: block.id,
      type: block.type,
      content: block.content,
      language: block.language,
    }))
    dispatch({ type: 'SET', collection: emptyCollection(seeded) })
    return seeded
  }

  function addBlock(fields) {
    const { collection: next, id } = insert(collection, fields)
    dispatch({ type: 'SET', collection: next })
    return id
  }

  function updateBlock(id, fields) {
    dispatch({ type: 'SET', collection: patch(collection, id, fields) })
  }

  function removeBlock(id) {
    dispatch({ type: 'SET', collection: remove(collection, id) })
  }

  function reorderBlocks(ids) {
    dispatch({ type: 'SET', collection: reorder(collection, ids) })
  }

  /** create -> update -> delete -> reorder, same ordering as every other draft's flush. */
  async function flush() {
    setIsFlushing(true)
    let working = collection
    try {
      for (const draft of diffMutations(working).creates) {
        const real = await runStep('um bloco', () =>
          api.create(parentId, { type: draft.type, content: draft.content, language: draft.language }),
        )
        working = commitCreate(working, draft.id, {
          id: real.id,
          type: real.type,
          content: real.content,
          language: real.language,
        })
      }
      for (const { id, fields } of diffMutations(working).updates) {
        await runStep('um bloco', () => api.update(id, fields))
        working = commitUpdate(working, id)
      }
      for (const id of diffMutations(working).deletes) {
        await runStep('um bloco excluido', () => api.remove(id))
        working = commitDelete(working, id)
      }
      const order = diffOrder(working)
      if (order) {
        await runStep('a ordem dos blocos', () => api.reorder(parentId, order))
        working = commitReorder(working)
      }
      dispatch({ type: 'SET', collection: working })
    } catch (error) {
      dispatch({ type: 'SET', collection: working })
      throw error
    } finally {
      setIsFlushing(false)
    }
  }

  return {
    blocks: collection.local,
    isDirty,
    isFlushing,
    seed,
    addBlock,
    updateBlock,
    removeBlock,
    reorderBlocks,
    flush,
  }
}
