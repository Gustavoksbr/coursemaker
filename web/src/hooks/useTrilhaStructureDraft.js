import { useReducer, useState } from 'react'
import {
  commitCreate,
  commitDelete,
  diffMutations,
  diffOrder,
  emptyCollection,
  insert,
  isTempId,
  patch,
  remove,
  reorder,
} from '@/lib/draftCollection'
import {
  addTrilhaItem,
  createTrilhaStep,
  deleteTrilhaStep,
  moveTrilhaItem,
  removeTrilhaItem,
  reorderTrilhaItems,
  reorderTrilhaSteps,
  updateTrilhaItem,
  updateTrilhaStep,
} from '@/api/trilhas'

function seedStructure(initialStructure) {
  const steps = emptyCollection(
    initialStructure.steps.map((step) => ({ id: step.id, title: step.title, description: step.description ?? '' })),
  )
  const items = [
    ...initialStructure.ungroupedItems.map((item) => toDraftItem(item, null)),
    ...initialStructure.steps.flatMap((step) => step.items.map((item) => toDraftItem(item, step.id))),
  ]
  return { steps, items: emptyCollection(items) }
}

function toDraftItem(item, stepId) {
  return { id: item.id, stepId, note: item.note ?? null, course: item.course ?? null, post: item.post ?? null }
}

/** The items collection's `local`/`baseline` restricted to one group (a step, or null = ungrouped). */
function groupSlice(items, stepId) {
  return {
    baseline: items.baseline.filter((item) => item.stepId === stepId),
    local: items.local.filter((item) => item.stepId === stepId),
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STEPS':
      return { ...state, steps: action.collection }
    case 'DELETE_STEP': {
      if (isTempId(action.id)) {
        // Never existed server-side: its items just fall back to ungrouped, nothing to cascade.
        return {
          ...state,
          steps: remove(state.steps, action.id),
          items: {
            ...state.items,
            local: state.items.local.map((item) => (item.stepId === action.id ? { ...item, stepId: null } : item)),
          },
        }
      }
      // A real step's delete cascades its current items server-side, so stop tracking them here
      // too, rather than separately queuing delete calls the cascade already covers.
      return {
        ...state,
        steps: remove(state.steps, action.id),
        items: {
          baseline: state.items.baseline.filter((item) => item.stepId !== action.id),
          local: state.items.local.filter((item) => item.stepId !== action.id),
        },
      }
    }
    case 'SET_ITEMS':
      return { ...state, items: action.collection }
    case 'REPLACE_ALL':
      return action.state
    default:
      return state
  }
}

function collectionIsDirty(collection) {
  const { creates, updates, deletes } = diffMutations(collection)
  return creates.length > 0 || updates.length > 0 || deletes.length > 0 || diffOrder(collection) !== null
}

async function runStep(label, fn) {
  try {
    return await fn()
  } catch (error) {
    error.draftStepLabel = label
    throw error
  }
}

/**
 * Local-draft state for one trilha's structure (steps -> items, plus the ungrouped bucket).
 * Mirrors `useCurriculumDraft`'s diff-at-flush model; see that hook and the plan this was built
 * from for the shared rationale. Items live in one flat collection (not split per group) because
 * an item's group can change (a "move"), which needs its own endpoint distinct from create/update/
 * delete/reorder - keeping one collection makes create-then-move-then-reorder all diff correctly
 * against the same baseline instead of juggling an item disappearing from one group's collection
 * and reappearing in another's.
 */
export function useTrilhaStructureDraft(trilhaId, initialStructure) {
  const [state, dispatch] = useReducer(reducer, initialStructure, seedStructure)
  const [isFlushing, setIsFlushing] = useState(false)

  const steps = state.steps.local.map((step) => ({
    ...step,
    items: state.items.local.filter((item) => item.stepId === step.id),
  }))
  const ungroupedItems = state.items.local.filter((item) => item.stepId === null)

  const isDirty = collectionIsDirty(state.steps) || collectionIsDirty(state.items)

  function addStep() {
    const { collection, id } = insert(state.steps, { title: 'Nova etapa', description: '' })
    dispatch({ type: 'SET_STEPS', collection })
    return id
  }

  function renameStep(id, { title, description }) {
    dispatch({ type: 'SET_STEPS', collection: patch(state.steps, id, { title, description }) })
  }

  function deleteStep(id) {
    dispatch({ type: 'DELETE_STEP', id })
  }

  function reorderStepsDraft(ids) {
    dispatch({ type: 'SET_STEPS', collection: reorder(state.steps, ids) })
  }

  function addItem({ type, item, stepId }) {
    const fields = { stepId, note: null, course: type === 'course' ? item : null, post: type === 'post' ? item : null }
    const { collection, id } = insert(state.items, fields)
    dispatch({ type: 'SET_ITEMS', collection })
    return id
  }

  function removeItem(id) {
    dispatch({ type: 'SET_ITEMS', collection: remove(state.items, id) })
  }

  function saveItemNote(id, note) {
    dispatch({ type: 'SET_ITEMS', collection: patch(state.items, id, { note }) })
  }

  function moveItem(id, targetStepId) {
    dispatch({ type: 'SET_ITEMS', collection: patch(state.items, id, { stepId: targetStepId }) })
  }

  /** `groupKey` is a step id, or `null` for the ungrouped bucket. */
  function reorderItemsDraft(groupKey, ids) {
    const others = state.items.local.filter((item) => item.stepId !== groupKey)
    const byId = new Map(state.items.local.filter((item) => item.stepId === groupKey).map((item) => [item.id, item]))
    const reordered = ids.map((id) => byId.get(id)).filter(Boolean)
    dispatch({ type: 'SET_ITEMS', collection: { ...state.items, local: [...others, ...reordered] } })
  }

  async function flush() {
    setIsFlushing(true)
    let working = state
    try {
      const stepsDiff = diffMutations(working.steps)
      for (const draft of stepsDiff.creates) {
        const real = await runStep(`a etapa "${draft.title}"`, () =>
          createTrilhaStep(trilhaId, { title: draft.title, description: draft.description || undefined }),
        )
        working = {
          ...working,
          steps: commitCreate(working.steps, draft.id, { id: real.id, title: real.title, description: real.description ?? '' }),
          // Items assigned to this brand-new step were carrying its temp id; point them at the real one.
          items: {
            ...working.items,
            local: working.items.local.map((item) => (item.stepId === draft.id ? { ...item, stepId: real.id } : item)),
          },
        }
      }
      for (const { id, fields } of diffMutations(working.steps).updates) {
        await runStep(`a etapa "${fields.title ?? id}"`, () =>
          updateTrilhaStep(trilhaId, id, { title: fields.title, description: fields.description }),
        )
        working = { ...working, steps: { ...working.steps, baseline: working.steps.baseline.map((s) => (s.id === id ? working.steps.local.find((l) => l.id === id) : s)) } }
      }
      for (const id of diffMutations(working.steps).deletes) {
        await runStep('uma etapa excluida', () => deleteTrilhaStep(trilhaId, id))
        working = { ...working, steps: commitDelete(working.steps, id) }
      }
      const stepOrder = diffOrder(working.steps)
      if (stepOrder) {
        await runStep('a ordem das etapas', () => reorderTrilhaSteps(trilhaId, stepOrder))
        working = { ...working, steps: { ...working.steps, baseline: working.steps.local } }
      }

      // Items: creates (with an immediate note patch if one was typed before the item was ever saved).
      for (const draft of diffMutations(working.items).creates) {
        const payload = {
          ...(draft.course ? { courseId: draft.course.id } : { postId: draft.post.id }),
          stepId: draft.stepId,
        }
        const real = await runStep('um item da trilha', () => addTrilhaItem(trilhaId, payload))
        working = {
          ...working,
          items: commitCreate(working.items, draft.id, {
            id: real.id,
            stepId: real.stepId,
            note: draft.note ?? null,
            course: real.course,
            post: real.post,
          }),
        }
        if (draft.note) {
          await runStep('a nota de um item', () => updateTrilhaItem(trilhaId, real.id, { note: draft.note }))
        }
      }

      // Notes and cross-group moves are independent server calls, so diff and commit them
      // separately - a generic whole-item commit would wrongly mark one "done" alongside the other.
      for (const item of working.items.local) {
        const baselineItem = working.items.baseline.find((b) => b.id === item.id)
        if (!baselineItem || baselineItem.note === item.note) continue
        await runStep('a nota de um item', () => updateTrilhaItem(trilhaId, item.id, { note: item.note }))
        working = {
          ...working,
          items: { ...working.items, baseline: working.items.baseline.map((b) => (b.id === item.id ? { ...b, note: item.note } : b)) },
        }
      }
      for (const item of working.items.local) {
        const baselineItem = working.items.baseline.find((b) => b.id === item.id)
        if (!baselineItem || baselineItem.stepId === item.stepId) continue
        await runStep('mover um item entre etapas', () => moveTrilhaItem(trilhaId, item.id, item.stepId))
        working = {
          ...working,
          items: { ...working.items, baseline: working.items.baseline.map((b) => (b.id === item.id ? { ...b, stepId: item.stepId } : b)) },
        }
      }
      for (const id of diffMutations(working.items).deletes) {
        await runStep('um item excluido', () => removeTrilhaItem(trilhaId, id))
        working = { ...working, items: commitDelete(working.items, id) }
      }

      // Reorder within each surviving group - moves above already made baseline group membership
      // match local's, so this only fires when the *order* within a group actually changed.
      const groupKeys = [...working.steps.local.map((step) => step.id), null]
      for (const stepId of groupKeys) {
        const order = diffOrder(groupSlice(working.items, stepId))
        if (!order) continue
        await runStep('a ordem dos itens', () => reorderTrilhaItems(trilhaId, stepId, order))
        working = {
          ...working,
          items: {
            ...working.items,
            baseline: [
              ...working.items.baseline.filter((item) => item.stepId !== stepId),
              ...order.map((id) => working.items.local.find((item) => item.id === id)),
            ],
          },
        }
      }

      dispatch({ type: 'REPLACE_ALL', state: working })
    } catch (error) {
      dispatch({ type: 'REPLACE_ALL', state: working })
      throw error
    } finally {
      setIsFlushing(false)
    }
  }

  return {
    steps,
    ungroupedItems,
    isDirty,
    isFlushing,
    addStep,
    renameStep,
    deleteStep,
    reorderSteps: reorderStepsDraft,
    addItem,
    removeItem,
    saveItemNote,
    moveItem,
    reorderItems: reorderItemsDraft,
    flush,
  }
}
