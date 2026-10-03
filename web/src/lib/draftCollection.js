/**
 * Pure, framework-free operations on one ordered list at one level of a draft tree (e.g. "this
 * course's modules", "this module's lessons"). A collection is `{ baseline, local }`: `baseline`
 * is the last-known-server state, `local` is what the UI renders and every action mutates. Nothing
 * here talks to the network - the editor-specific hooks (`useCurriculumDraft` etc.) compose these
 * into the actual nested shapes and decide what to do with the diff.
 *
 * New items get a `tmp_` id (see `isTempId`) until `commitCreate` folds the real server item in.
 */

export function isTempId(id) {
  return typeof id === 'string' && id.startsWith('tmp_')
}

function makeTempId() {
  return `tmp_${crypto.randomUUID()}`
}

/** Starts a collection from the last-known-server list (or `[]` for one that doesn't exist yet). */
export function emptyCollection(baseline = []) {
  return { baseline, local: baseline }
}

/** Appends a new local-only item (creates always land at the end, matching every create endpoint). */
export function insert(collection, fields) {
  const id = makeTempId()
  const item = { id, ...fields }
  return { collection: { ...collection, local: [...collection.local, item] }, id }
}

export function patch(collection, id, fields) {
  return { ...collection, local: collection.local.map((item) => (item.id === id ? { ...item, ...fields } : item)) }
}

export function remove(collection, id) {
  return { ...collection, local: collection.local.filter((item) => item.id !== id) }
}

export function reorder(collection, orderedIds) {
  const byId = new Map(collection.local.map((item) => [item.id, item]))
  return { ...collection, local: orderedIds.map((id) => byId.get(id)).filter(Boolean) }
}

function shallowDiff(before, after) {
  const fields = {}
  for (const key of Object.keys(after)) {
    if (key === 'id') continue
    if (!Object.is(before[key], after[key])) fields[key] = after[key]
  }
  return fields
}

/**
 * Creates/updates/deletes needed to bring the server from `baseline` to `local`, ignoring order
 * (see `diffOrder` for that). A create-then-delete of the same local-only item naturally produces
 * no create and no delete, since it never had a baseline counterpart to reconcile against.
 */
export function diffMutations(collection) {
  const baselineById = new Map(collection.baseline.map((item) => [item.id, item]))
  const localIds = new Set(collection.local.map((item) => item.id))

  const creates = collection.local.filter((item) => isTempId(item.id))

  const updates = []
  for (const item of collection.local) {
    if (isTempId(item.id)) continue
    const before = baselineById.get(item.id)
    if (!before) continue
    const fields = shallowDiff(before, item)
    if (Object.keys(fields).length > 0) updates.push({ id: item.id, fields })
  }

  const deletes = collection.baseline.filter((item) => !localIds.has(item.id)).map((item) => item.id)

  return { creates, updates, deletes }
}

/**
 * The full ordered id list to send, or `null` if the order already matches baseline. Only
 * meaningful once every id in `local` is real - call after `commitCreate`/`commitDelete` have
 * already run for this collection's creates/deletes, not before.
 */
export function diffOrder(collection) {
  const localIds = collection.local.map((item) => item.id)
  const baselineIds = collection.baseline.map((item) => item.id).filter((id) => localIds.includes(id))
  const unchanged = localIds.length === baselineIds.length && localIds.every((id, index) => id === baselineIds[index])
  return unchanged ? null : localIds
}

/** Folds a just-created server item into baseline, and swaps its temp id for the real one in local. */
export function commitCreate(collection, tempId, realItem) {
  return {
    baseline: [...collection.baseline, realItem],
    local: collection.local.map((item) => (item.id === tempId ? realItem : item)),
  }
}

/** Advances baseline to match the current local value of one successfully-patched item. */
export function commitUpdate(collection, id) {
  const current = collection.local.find((item) => item.id === id)
  return { ...collection, baseline: collection.baseline.map((item) => (item.id === id ? current : item)) }
}

/** Drops a successfully-deleted item from baseline (it is already gone from local). */
export function commitDelete(collection, id) {
  return { ...collection, baseline: collection.baseline.filter((item) => item.id !== id) }
}

/** Advances baseline's order (and content) to match local's, after a successful reorder call. */
export function commitReorder(collection) {
  return { ...collection, baseline: collection.local }
}
