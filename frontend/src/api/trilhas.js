import { api } from '@/lib/api'
import { listParams } from './shared'

export const trilhaKeys = {
  all: ['trilhas'],
  list: (filters) => ['trilhas', 'list', filters],
  bySlug: (nickname, slug) => ['trilhas', 'by-slug', nickname, slug],
  byId: (id) => ['trilhas', 'id', id],
  progress: (trilhaId) => ['trilhas', trilhaId, 'progress'],
  courseTrilhas: (courseId, page) => ['courses', courseId, 'trilhas', page],
  courseTrilhasHighlighted: (courseId) => ['courses', courseId, 'trilhas', 'highlighted'],
  postTrilhas: (postId, page) => ['posts', postId, 'trilhas', page],
  following: ['trilhas', 'me', 'following'],
  completed: ['trilhas', 'me', 'completed'],
}

export async function listTrilhas(filters) {
  const { data } = await api.get('/trilhas', { params: listParams(filters) })
  return data
}

export async function getTrilhaBySlug(nickname, slug) {
  const { data } = await api.get(`/trilhas/by-slug/${encodeURIComponent(nickname)}/${encodeURIComponent(slug)}`)
  return data
}

export async function getTrilha(id) {
  const { data } = await api.get(`/trilhas/${id}`)
  return data
}

export async function checkTrilhaSlug(name) {
  const { data } = await api.get('/trilhas/slug-check', { params: { name } })
  return data
}

export async function createTrilha(payload) {
  const { data } = await api.post('/trilhas', payload)
  return data
}

export async function updateTrilha(id, payload) {
  const { data } = await api.patch(`/trilhas/${id}`, payload)
  return data
}

export async function deleteTrilha(id) {
  await api.delete(`/trilhas/${id}`)
}

export async function toggleTrilhaFeatured(id) {
  const { data } = await api.post(`/trilhas/${id}/featured`)
  return data
}

// -------------------------------------------------------------------- items
//
// The full item tree (steps + ungrouped items) travels inside the trilha detail payload
// (`detail.structure`), the same way a course embeds its modules/lessons -- items are curated
// only by the trilha owner, so there is no unbounded list to paginate here.

export async function addTrilhaItem(trilhaId, payload) {
  const { data } = await api.post(`/trilhas/${trilhaId}/items`, payload)
  return data
}

export async function updateTrilhaItem(trilhaId, itemId, payload) {
  const { data } = await api.patch(`/trilhas/${trilhaId}/items/${itemId}`, payload)
  return data
}

/** Moves the item into a step, or ungroups it when `stepId` is null. */
export async function moveTrilhaItem(trilhaId, itemId, stepId) {
  const { data } = await api.put(`/trilhas/${trilhaId}/items/${itemId}/step`, { stepId })
  return data
}

export async function removeTrilhaItem(trilhaId, itemId) {
  await api.delete(`/trilhas/${trilhaId}/items/${itemId}`)
}

/** Full ordered id list for one group: the items of `stepId`, or the ungrouped ones when null. */
export async function reorderTrilhaItems(trilhaId, stepId, ids) {
  await api.put(`/trilhas/${trilhaId}/items/reorder`, { stepId, ids })
}

// -------------------------------------------------------------------- steps

export async function createTrilhaStep(trilhaId, payload) {
  const { data } = await api.post(`/trilhas/${trilhaId}/steps`, payload)
  return data
}

export async function updateTrilhaStep(trilhaId, stepId, payload) {
  const { data } = await api.patch(`/trilhas/${trilhaId}/steps/${stepId}`, payload)
  return data
}

export async function deleteTrilhaStep(trilhaId, stepId) {
  await api.delete(`/trilhas/${trilhaId}/steps/${stepId}`)
}

export async function reorderTrilhaSteps(trilhaId, ids) {
  await api.put(`/trilhas/${trilhaId}/steps/reorder`, ids)
}

// -------------------------------------------------------- enrollment/progress

export async function enrollTrilha(trilhaId) {
  await api.post(`/trilhas/${trilhaId}/enroll`)
}

export async function unenrollTrilha(trilhaId) {
  await api.delete(`/trilhas/${trilhaId}/enroll`)
}

export async function getTrilhaProgress(trilhaId) {
  const { data } = await api.get(`/trilhas/${trilhaId}/progress`)
  return data
}

export async function completeTrilhaItem(itemId) {
  const { data } = await api.post(`/trilha-items/${itemId}/complete`)
  return data
}

export async function uncompleteTrilhaItem(itemId) {
  const { data } = await api.delete(`/trilha-items/${itemId}/complete`)
  return data
}

// ------------------------------------------------------------- course side

export async function getCourseTrilhas(courseId, page = 0, size = 12) {
  const { data } = await api.get(`/courses/${courseId}/trilhas`, { params: { page, size } })
  return data
}

export async function getHighlightedCourseTrilhas(courseId) {
  const { data } = await api.get(`/courses/${courseId}/trilhas/highlighted`)
  return data
}

export async function highlightCourseTrilha(courseId, trilhaId) {
  await api.put(`/courses/${courseId}/trilhas/${trilhaId}/highlight`)
}

export async function unhighlightCourseTrilha(courseId, trilhaId) {
  await api.delete(`/courses/${courseId}/trilhas/${trilhaId}/highlight`)
}

// --------------------------------------------------------------- post side

export async function getPostTrilhas(postId, page = 0, size = 12) {
  const { data } = await api.get(`/posts/${postId}/trilhas`, { params: { page, size } })
  return data
}

// ------------------------------------------------------------------ library

export async function myFollowedTrilhas() {
  const { data } = await api.get('/trilhas/me/following')
  return data
}

export async function myCompletedTrilhas() {
  const { data } = await api.get('/trilhas/me/completed')
  return data
}
