import { describe, expect, it } from 'vitest'
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
} from './draftCollection'

describe('insert', () => {
  it('appends a new item with a temp id', () => {
    const { collection, id } = insert(emptyCollection([{ id: 'a', title: 'A' }]), { title: 'B' })
    expect(isTempId(id)).toBe(true)
    expect(collection.local.map((item) => item.title)).toEqual(['A', 'B'])
    expect(collection.baseline.map((item) => item.title)).toEqual(['A'])
  })
})

describe('diffMutations', () => {
  it('collapses a create-then-delete of the same local-only item to a no-op', () => {
    let collection = emptyCollection([])
    const { collection: afterInsert, id } = insert(collection, { title: 'Draft module' })
    collection = remove(afterInsert, id)

    expect(diffMutations(collection)).toEqual({ creates: [], updates: [], deletes: [] })
  })

  it('reports a create for a new local-only item', () => {
    const { collection } = insert(emptyCollection([]), { title: 'New' })
    const { creates, updates, deletes } = diffMutations(collection)

    expect(creates).toHaveLength(1)
    expect(creates[0].title).toBe('New')
    expect(updates).toEqual([])
    expect(deletes).toEqual([])
  })

  it('reports only the changed fields for an update', () => {
    const baseline = [{ id: 'a', title: 'Old', description: 'Same' }]
    const collection = patch(emptyCollection(baseline), 'a', { title: 'New' })

    expect(diffMutations(collection).updates).toEqual([{ id: 'a', fields: { title: 'New' } }])
  })

  it('reports a delete for a removed baseline item', () => {
    const baseline = [{ id: 'a', title: 'A' }]
    const collection = remove(emptyCollection(baseline), 'a')

    expect(diffMutations(collection)).toEqual({ creates: [], updates: [], deletes: ['a'] })
  })

  it('deleting a parent that was only ever local skips its never-diffed children implicitly', () => {
    // draftCollection only knows about one list; this documents the guarantee the tree-level hooks
    // rely on: a temp-id item removed before flush never appears in `creates`, so nothing downstream
    // (a child collection keyed by that temp id) is ever asked to create against a real parent.
    const { collection: withDraftModule, id: moduleId } = insert(emptyCollection([]), { title: 'Draft' })
    const collection = remove(withDraftModule, moduleId)
    expect(diffMutations(collection).creates).toEqual([])
  })
})

describe('diffOrder', () => {
  it('is null when local matches baseline order', () => {
    const baseline = [{ id: 'a' }, { id: 'b' }]
    expect(diffOrder(emptyCollection(baseline))).toBeNull()
  })

  it('returns the new order when it differs from baseline', () => {
    const baseline = [{ id: 'a' }, { id: 'b' }]
    const collection = reorder(emptyCollection(baseline), ['b', 'a'])
    expect(diffOrder(collection)).toEqual(['b', 'a'])
  })

  it('ignores baseline items that were deleted from local when comparing order', () => {
    const baseline = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const collection = remove(emptyCollection(baseline), 'b')
    // a, c kept their relative order - only b left, so this is not a reorder.
    expect(diffOrder(collection)).toBeNull()
  })
})

describe('commitCreate', () => {
  it('remaps the temp id to the real item everywhere in local, and folds it into baseline', () => {
    const { collection, id: tempId } = insert(emptyCollection([]), { title: 'Draft' })
    const real = { id: 'real-uuid', title: 'Draft' }

    const committed = commitCreate(collection, tempId, real)

    expect(committed.local).toEqual([real])
    expect(committed.baseline).toEqual([real])
    expect(diffMutations(committed)).toEqual({ creates: [], updates: [], deletes: [] })
  })
})

describe('commitUpdate / commitDelete / commitReorder', () => {
  it('commitUpdate advances baseline so a re-diff no longer reports it', () => {
    const collection = patch(emptyCollection([{ id: 'a', title: 'Old' }]), 'a', { title: 'New' })
    const committed = commitUpdate(collection, 'a')
    expect(diffMutations(committed).updates).toEqual([])
  })

  it('commitDelete removes the item from baseline so a re-diff no longer reports it', () => {
    const collection = remove(emptyCollection([{ id: 'a' }]), 'a')
    const committed = commitDelete(collection, 'a')
    expect(diffMutations(committed).deletes).toEqual([])
  })

  it('commitReorder advances baseline so a re-diff reports no order change', () => {
    const collection = reorder(emptyCollection([{ id: 'a' }, { id: 'b' }]), ['b', 'a'])
    const committed = commitReorder(collection)
    expect(diffOrder(committed)).toBeNull()
  })
})
