import { api } from '@/lib/api'
import { listParams } from './shared'

export const courseKeys = {
  all: ['courses'],
  list: (filters) => ['courses', 'list', filters],
  bySlug: (nickname, slug) => ['courses', 'by-slug', nickname, slug],
  byId: (id) => ['courses', 'id', id],
  students: (courseId) => ['courses', courseId, 'students'],
  progress: (courseId) => ['courses', courseId, 'progress'],
  bans: (courseId) => ['courses', courseId, 'bans'],
  inProgress: (areaId) => ['enrollments', 'in-progress', areaId],
  completed: (areaId) => ['enrollments', 'completed', areaId],
  lastAccessed: (areaId) => ['enrollments', 'last-accessed', areaId],
}

export async function listCourses(filters) {
  const { data } = await api.get('/courses', { params: listParams(filters) })
  return data
}

export async function getCourseBySlug(nickname, slug) {
  const { data } = await api.get(`/courses/by-slug/${encodeURIComponent(nickname)}/${encodeURIComponent(slug)}`)
  return data
}

export async function getCourse(id) {
  const { data } = await api.get(`/courses/${id}`)
  return data
}

export async function checkCourseSlug(name) {
  const { data } = await api.get('/courses/slug-check', { params: { name } })
  return data
}

export async function createCourse(payload) {
  const { data } = await api.post('/courses', payload)
  return data
}

export async function updateCourse(id, payload) {
  const { data } = await api.patch(`/courses/${id}`, payload)
  return data
}

export async function deleteCourse(id) {
  await api.delete(`/courses/${id}`)
}

export async function toggleCourseFeatured(id) {
  const { data } = await api.post(`/courses/${id}/featured`)
  return data
}

export async function downloadCourseCertificate(id) {
  const { data } = await api.get(`/courses/${id}/certificate`, { responseType: 'blob' })
  return data
}

// ------------------------------------------------------------------ curriculum

export async function listModules(courseId) {
  const { data } = await api.get(`/courses/${courseId}/modules`)
  return data
}

export async function createModule(courseId, payload) {
  const { data } = await api.post(`/courses/${courseId}/modules`, payload)
  return data
}

export async function updateModule(id, payload) {
  const { data } = await api.patch(`/modules/${id}`, payload)
  return data
}

export async function deleteModule(id) {
  await api.delete(`/modules/${id}`)
}

export async function reorderModules(courseId, ids) {
  const { data } = await api.put(`/courses/${courseId}/modules/reorder`, { ids })
  return data
}

export async function createLesson(moduleId, payload) {
  const { data } = await api.post(`/modules/${moduleId}/lessons`, payload)
  return data
}

export async function updateLesson(id, payload) {
  const { data } = await api.patch(`/lessons/${id}`, payload)
  return data
}

export async function deleteLesson(id) {
  await api.delete(`/lessons/${id}`)
}

export async function reorderLessons(moduleId, ids) {
  const { data } = await api.put(`/modules/${moduleId}/lessons/reorder`, { ids })
  return data
}

// ---------------------------------------------------------------- lesson blocks

export async function listLessonBlocks(lessonId) {
  const { data } = await api.get(`/lessons/${lessonId}/blocks`)
  return data
}

export async function createLessonBlock(lessonId, payload) {
  const { data } = await api.post(`/lessons/${lessonId}/blocks`, payload)
  return data
}

export async function updateLessonBlock(id, payload) {
  const { data } = await api.patch(`/blocks/${id}`, payload)
  return data
}

export async function deleteLessonBlock(id) {
  await api.delete(`/blocks/${id}`)
}

export async function reorderLessonBlocks(lessonId, ids) {
  const { data } = await api.put(`/lessons/${lessonId}/blocks/reorder`, { ids })
  return data
}

// ----------------------------------------------------- enrollment and progress

export async function enroll(courseId, password) {
  // A wrong course password answers 401; that is about the course, not about the session.
  const { data } = await api.post(
    '/enrollments',
    { courseId, password },
    { skipAuthRedirect: true },
  )
  return data
}

export async function unenroll(courseId) {
  const { data } = await api.delete(`/enrollments/${courseId}`)
  return data
}

export async function myEnrollments() {
  const { data } = await api.get('/enrollments/me')
  return data
}

export async function myInProgressCourses(areaId) {
  const { data } = await api.get('/enrollments/me/in-progress', { params: { areaId } })
  return data
}

export async function myCompletedCourses(areaId) {
  const { data } = await api.get('/enrollments/me/completed', { params: { areaId } })
  return data
}

/** The enrolled course this student opened most recently, or null. */
export async function lastAccessedCourse(areaId) {
  const { data } = await api.get('/enrollments/me/last-accessed', { params: { areaId } })
  return data
}

export async function validatePrivateAccess(courseId, password) {
  // 401 here means "wrong course password", not "your token expired": stay signed in.
  const { data } = await api.post(
    '/enrollments/private-access/validate',
    { courseId, password },
    { skipAuthRedirect: true },
  )
  return data
}

export async function listStudents(courseId) {
  const { data } = await api.get(`/courses/${courseId}/students`)
  return data
}

export async function revokeAccess(courseId, userId) {
  await api.post(`/courses/${courseId}/revoke-access/${userId}`)
}

export async function getProgress(courseId) {
  const { data } = await api.get(`/courses/${courseId}/progress`)
  return data
}

export async function completeLesson(lessonId) {
  const { data } = await api.post(`/lessons/${lessonId}/complete`)
  return data
}

export async function uncompleteLesson(lessonId) {
  const { data } = await api.delete(`/lessons/${lessonId}/complete`)
  return data
}

// ------------------------------------------------------------------ engagement
// Comment list/create/delete moved to '@/api/comments' (kind-aware: course/post/trilha).
// Banning a commenter stays course-only, so it lives here.

export async function listBans(courseId) {
  const { data } = await api.get(`/courses/${courseId}/bans`)
  return data
}

export async function banUser(courseId, userId) {
  await api.post(`/courses/${courseId}/bans/${userId}`)
}

export async function unbanUser(courseId, userId) {
  await api.delete(`/courses/${courseId}/bans/${userId}`)
}
