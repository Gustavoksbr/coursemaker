import { api } from '@/lib/api'

export const libraryKeys = {
  folders: (areaId) => ['library', 'folders', 'list', areaId],
  folder: (id, areaId) => ['library', 'folders', 'one', id, areaId],
  folderItems: (id, page, areaId) => ['library', 'folders', 'items', id, page, areaId],
  status: (kind, contentId) => ['library', 'status', kind, contentId],
  overview: ['library', 'overview'],
}

/** Every enrolled course + followed trilha, with progress - the "Meus cursos e trilhas" table. */
export async function getLibraryOverview() {
  const { data } = await api.get('/library/overview')
  return data
}

// ------------------------------------------------------------- save/unsave
//
// There is no standalone "favorite" action: every save goes through moveXToFolder, which picks
// a folder. Favoritos is just the folder a save falls back to (folderId=null). See
// SaveToFolderModal.

export async function getCourseStatus(courseId) {
  const { data } = await api.get(`/library/courses/${courseId}/status`)
  return data
}
export async function unsaveCourse(courseId) {
  const { data } = await api.delete(`/library/courses/${courseId}`)
  return data
}
export async function moveCourseToFolder(courseId, folderId) {
  const { data } = await api.put(`/library/courses/${courseId}/folder`, { folderId })
  return data
}

export async function getPostStatus(postId) {
  const { data } = await api.get(`/library/posts/${postId}/status`)
  return data
}
export async function unsavePost(postId) {
  const { data } = await api.delete(`/library/posts/${postId}`)
  return data
}
export async function movePostToFolder(postId, folderId) {
  const { data } = await api.put(`/library/posts/${postId}/folder`, { folderId })
  return data
}

export async function getTrilhaStatus(trilhaId) {
  const { data } = await api.get(`/library/trilhas/${trilhaId}/status`)
  return data
}
export async function unsaveTrilha(trilhaId) {
  const { data } = await api.delete(`/library/trilhas/${trilhaId}`)
  return data
}
export async function moveTrilhaToFolder(trilhaId, folderId) {
  const { data } = await api.put(`/library/trilhas/${trilhaId}/folder`, { folderId })
  return data
}

// ------------------------------------------------------------------ folders

export async function listFolders(areaId) {
  const { data } = await api.get('/library/folders', { params: { areaId } })
  return data
}

export async function createFolder(name) {
  const { data } = await api.post('/library/folders', { name })
  return data
}

export async function renameFolder(id, name) {
  const { data } = await api.patch(`/library/folders/${id}`, { name })
  return data
}

export async function deleteFolder(id) {
  await api.delete(`/library/folders/${id}`)
}

export async function getFolder(id, areaId) {
  const { data } = await api.get(`/library/folders/${id}`, { params: { areaId } })
  return data
}

export async function listFolderItems(id, page = 0, size = 12, areaId) {
  const { data } = await api.get(`/library/folders/${id}/items`, { params: { page, size, areaId } })
  return data
}
