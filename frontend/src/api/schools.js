import { api } from '@/lib/api'

export const schoolKeys = {
  all: ['schools'],
  list: () => ['schools', 'list'],
  mine: () => ['schools', 'mine'],
  bySlug: (slug) => ['schools', 'slug', slug],
  withMembers: (id) => ['schools', id, 'members'],
}

export async function listSchools() {
  const { data } = await api.get('/schools')
  return data
}

export async function getSchoolBySlug(slug) {
  const { data } = await api.get(`/schools/${encodeURIComponent(slug)}`)
  return data
}

/** Schools the logged-in user is allowed to publish under - feeds `SchoolSelect`. */
export async function listMySchools() {
  const { data } = await api.get('/users/me/schools')
  return data
}

export async function getSchoolWithMembers(id) {
  const { data } = await api.get(`/schools/${id}/members`)
  return data
}

export async function createSchool(payload) {
  const { data } = await api.post('/schools', payload)
  return data
}

export async function updateSchool(id, payload) {
  const { data } = await api.patch(`/schools/${id}`, payload)
  return data
}

export async function deleteSchool(id) {
  await api.delete(`/schools/${id}`)
}

export async function grantSchoolMembership(schoolId, userId) {
  await api.put(`/schools/${schoolId}/members/${userId}`)
}

export async function revokeSchoolMembership(schoolId, userId) {
  await api.delete(`/schools/${schoolId}/members/${userId}`)
}
