import { useReducer, useState } from 'react'
import {
  commitCreate,
  commitDelete,
  commitReorder,
  commitUpdate,
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
  createLesson,
  createLessonBlock,
  createModule,
  deleteLesson,
  deleteLessonBlock,
  deleteModule,
  listLessonBlocks,
  reorderLessonBlocks,
  reorderLessons,
  reorderModules,
  updateLesson,
  updateLessonBlock,
  updateModule,
} from '@/api/courses'

/** Strips a `ModuleResponse`/`LessonResponse` down to the fields the editor actually renders or edits. */
function seedModules(initialModules) {
  const modules = emptyCollection(initialModules.map((module) => ({ id: module.id, title: module.title })))
  const lessonsByModuleKey = {}
  for (const module of initialModules) {
    lessonsByModuleKey[module.id] = emptyCollection(
      module.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title })),
    )
  }
  return { modules, lessonsByModuleKey, blocksByLessonKey: {} }
}

function remapKey(record, oldKey, newKey) {
  if (!(oldKey in record)) return record
  const { [oldKey]: value, ...rest } = record
  return { ...rest, [newKey]: value }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_MODULES':
      return { ...state, modules: action.collection }
    case 'DELETE_MODULE': {
      const { [action.id]: removedLessons, ...restLessons } = state.lessonsByModuleKey
      return { ...state, modules: remove(state.modules, action.id), lessonsByModuleKey: restLessons }
    }
    case 'SET_LESSONS':
      return { ...state, lessonsByModuleKey: { ...state.lessonsByModuleKey, [action.moduleId]: action.collection } }
    case 'DELETE_LESSON': {
      const collection = remove(state.lessonsByModuleKey[action.moduleId] ?? emptyCollection([]), action.id)
      const { [action.id]: removedBlocks, ...restBlocks } = state.blocksByLessonKey
      return {
        ...state,
        lessonsByModuleKey: { ...state.lessonsByModuleKey, [action.moduleId]: collection },
        blocksByLessonKey: restBlocks,
      }
    }
    case 'SET_BLOCKS':
      return { ...state, blocksByLessonKey: { ...state.blocksByLessonKey, [action.lessonId]: action.collection } }
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

/** Annotates an error with which flush step failed, for the page's toast message. */
async function runStep(label, fn) {
  try {
    return await fn()
  } catch (error) {
    error.draftStepLabel = label
    throw error
  }
}

/**
 * Local-draft state for one course's curriculum (modules -> lessons -> blocks). Every add/rename/
 * delete/reorder mutates draft state only; nothing hits the network until `flush()`. See the plan
 * this was built from for the full design rationale (diff-at-flush, temp ids, flush ordering).
 */
export function useCurriculumDraft(courseId, initialModules) {
  const [state, dispatch] = useReducer(reducer, initialModules, seedModules)
  const [isFlushing, setIsFlushing] = useState(false)

  const modules = state.modules.local.map((module) => ({
    ...module,
    lessons: (state.lessonsByModuleKey[module.id] ?? emptyCollection([])).local,
  }))

  const isDirty =
    collectionIsDirty(state.modules) ||
    Object.values(state.lessonsByModuleKey).some(collectionIsDirty) ||
    Object.values(state.blocksByLessonKey).some(collectionIsDirty)

  function addModule() {
    const { collection, id } = insert(state.modules, { title: 'Novo modulo' })
    dispatch({ type: 'SET_MODULES', collection })
    return id
  }

  function renameModule(id, title) {
    dispatch({ type: 'SET_MODULES', collection: patch(state.modules, id, { title }) })
  }

  function deleteModule(id) {
    dispatch({ type: 'DELETE_MODULE', id })
  }

  function reorderModulesDraft(ids) {
    dispatch({ type: 'SET_MODULES', collection: reorder(state.modules, ids) })
  }

  function addLesson(moduleId) {
    const current = state.lessonsByModuleKey[moduleId] ?? emptyCollection([])
    const { collection, id } = insert(current, { title: 'Nova licao' })
    dispatch({ type: 'SET_LESSONS', moduleId, collection })
    return id
  }

  function renameLesson(moduleId, id, title) {
    const current = state.lessonsByModuleKey[moduleId] ?? emptyCollection([])
    dispatch({ type: 'SET_LESSONS', moduleId, collection: patch(current, id, { title }) })
  }

  function deleteLessonDraft(moduleId, id) {
    dispatch({ type: 'DELETE_LESSON', moduleId, id })
  }

  function reorderLessonsDraft(moduleId, ids) {
    const current = state.lessonsByModuleKey[moduleId] ?? emptyCollection([])
    dispatch({ type: 'SET_LESSONS', moduleId, collection: reorder(current, ids) })
  }

  /**
   * Live draft for one lesson's blocks: `blocks` always reflects the latest edits (nothing waits on
   * an explicit per-block save), and every mutator writes straight into this draft - only `flush()`
   * (called from the page's own "Salvar alteracoes") ever touches the network.
   */
  function blocksDraftFor(lessonId) {
    const collection = state.blocksByLessonKey[lessonId] ?? emptyCollection([])
    return {
      blocks: collection.local,
      async seed() {
        const existing = state.blocksByLessonKey[lessonId]
        if (existing) return existing.local
        // A lesson that only exists in the draft (not created on the server yet) obviously has no
        // blocks to fetch - asking the API about a temp id would just 400.
        if (isTempId(lessonId)) {
          dispatch({ type: 'SET_BLOCKS', lessonId, collection: emptyCollection([]) })
          return []
        }
        const fetched = await listLessonBlocks(lessonId)
        const seeded = fetched.map((block) => ({
          id: block.id,
          type: block.type,
          content: block.content,
          language: block.language,
        }))
        dispatch({ type: 'SET_BLOCKS', lessonId, collection: emptyCollection(seeded) })
        return seeded
      },
      addBlock(fields) {
        const current = state.blocksByLessonKey[lessonId] ?? emptyCollection([])
        const { collection: next, id } = insert(current, fields)
        dispatch({ type: 'SET_BLOCKS', lessonId, collection: next })
        return id
      },
      updateBlock(id, fields) {
        const current = state.blocksByLessonKey[lessonId] ?? emptyCollection([])
        dispatch({ type: 'SET_BLOCKS', lessonId, collection: patch(current, id, fields) })
      },
      removeBlock(id) {
        const current = state.blocksByLessonKey[lessonId] ?? emptyCollection([])
        dispatch({ type: 'SET_BLOCKS', lessonId, collection: remove(current, id) })
      },
      reorderBlocks(ids) {
        const current = state.blocksByLessonKey[lessonId] ?? emptyCollection([])
        dispatch({ type: 'SET_BLOCKS', lessonId, collection: reorder(current, ids) })
      },
    }
  }

  /**
   * create -> update -> delete -> reorder, then recurse into surviving children with real ids.
   * Resolves to `{ lessonIdRemap }` (temp id -> real id for every lesson created this flush), so
   * the page can follow an active `?lesson=` selection that was pointing at a temp id.
   */
  async function flush() {
    setIsFlushing(true)
    let working = state
    const lessonIdRemap = {}
    try {
      const modulesDiff = diffMutations(working.modules)
      for (const draft of modulesDiff.creates) {
        const real = await runStep(`o modulo "${draft.title}"`, () => createModule(courseId, { title: draft.title }))
        working = {
          ...working,
          modules: commitCreate(working.modules, draft.id, { id: real.id, title: real.title }),
          lessonsByModuleKey: remapKey(working.lessonsByModuleKey, draft.id, real.id),
        }
      }
      for (const { id, fields } of diffMutations(working.modules).updates) {
        await runStep(`o modulo "${fields.title ?? id}"`, () => updateModule(id, fields))
        working = { ...working, modules: commitUpdate(working.modules, id) }
      }
      for (const id of diffMutations(working.modules).deletes) {
        await runStep('um modulo excluido', () => deleteModule(id))
        const { [id]: removedLessons, ...restLessons } = working.lessonsByModuleKey
        working = { ...working, modules: commitDelete(working.modules, id), lessonsByModuleKey: restLessons }
      }
      const moduleOrder = diffOrder(working.modules)
      if (moduleOrder) {
        await runStep('a ordem dos modulos', () => reorderModules(courseId, moduleOrder))
        working = { ...working, modules: commitReorder(working.modules) }
      }

      for (const module of working.modules.local) {
        let lessons = working.lessonsByModuleKey[module.id] ?? emptyCollection([])
        const lessonsDiff = diffMutations(lessons)

        for (const draft of lessonsDiff.creates) {
          const real = await runStep(`a licao "${draft.title}"`, () => createLesson(module.id, { title: draft.title }))
          lessons = commitCreate(lessons, draft.id, { id: real.id, title: real.title })
          working = { ...working, blocksByLessonKey: remapKey(working.blocksByLessonKey, draft.id, real.id) }
          lessonIdRemap[draft.id] = real.id
        }
        for (const { id, fields } of diffMutations(lessons).updates) {
          await runStep(`a licao "${fields.title ?? id}"`, () => updateLesson(id, fields))
          lessons = commitUpdate(lessons, id)
        }
        for (const id of diffMutations(lessons).deletes) {
          await runStep('uma licao excluida', () => deleteLesson(id))
          lessons = commitDelete(lessons, id)
          const { [id]: removedBlocks, ...restBlocks } = working.blocksByLessonKey
          working = { ...working, blocksByLessonKey: restBlocks }
        }
        const lessonOrder = diffOrder(lessons)
        if (lessonOrder) {
          await runStep(`a ordem das licoes de "${module.title}"`, () => reorderLessons(module.id, lessonOrder))
          lessons = commitReorder(lessons)
        }
        working = { ...working, lessonsByModuleKey: { ...working.lessonsByModuleKey, [module.id]: lessons } }

        for (const lesson of lessons.local) {
          let blocks = working.blocksByLessonKey[lesson.id] ?? emptyCollection([])
          const blocksDiff = diffMutations(blocks)

          for (const draft of blocksDiff.creates) {
            const real = await runStep(`um bloco de "${lesson.title}"`, () =>
              createLessonBlock(lesson.id, { type: draft.type, content: draft.content, language: draft.language }),
            )
            blocks = commitCreate(blocks, draft.id, {
              id: real.id,
              type: real.type,
              content: real.content,
              language: real.language,
            })
          }
          for (const { id, fields } of diffMutations(blocks).updates) {
            await runStep(`um bloco de "${lesson.title}"`, () => updateLessonBlock(id, fields))
            blocks = commitUpdate(blocks, id)
          }
          for (const id of diffMutations(blocks).deletes) {
            await runStep('um bloco excluido', () => deleteLessonBlock(id))
            blocks = commitDelete(blocks, id)
          }
          const blockOrder = diffOrder(blocks)
          if (blockOrder) {
            await runStep(`a ordem dos blocos de "${lesson.title}"`, () => reorderLessonBlocks(lesson.id, blockOrder))
            blocks = commitReorder(blocks)
          }
          working = { ...working, blocksByLessonKey: { ...working.blocksByLessonKey, [lesson.id]: blocks } }
        }
      }

      dispatch({ type: 'REPLACE_ALL', state: working })
      return { lessonIdRemap }
    } catch (error) {
      // Whatever committed before the failure stays committed; the rest stays dirty for a retry.
      dispatch({ type: 'REPLACE_ALL', state: working })
      error.lessonIdRemap = lessonIdRemap
      throw error
    } finally {
      setIsFlushing(false)
    }
  }

  return {
    modules,
    isDirty,
    isFlushing,
    addModule,
    renameModule,
    deleteModule,
    reorderModules: reorderModulesDraft,
    addLesson,
    renameLesson,
    deleteLesson: deleteLessonDraft,
    reorderLessons: reorderLessonsDraft,
    blocksDraftFor,
    flush,
  }
}
