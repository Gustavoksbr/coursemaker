import { api } from '@/lib/api'
import { listParams } from './shared'

export const userKeys = {
  profile: (nickname) => ['users', nickname],
  nicknameAvailable: (nickname) => ['users', 'nickname-available', nickname],
  search: (filters) => ['users', 'search', filters],
}

export async function searchUsers(filters) {
  const { data } = await api.get('/users/search', { params: listParams(filters) })
  return data
}

export async function getPublicProfile(nickname) {
  const { data } = await api.get(`/users/${encodeURIComponent(nickname)}`)
  return data
}

export async function isNicknameAvailable(nickname) {
  const { data } = await api.get('/users/nickname-available', { params: { nickname } })
  return data.available
}

export async function updateProfile(id, payload) {
  const { data } = await api.patch(`/users/${id}`, payload)
  return data
}

/** Anonymizes the account - irreversible, requires typing the nickname back to confirm. */
export async function deleteAccount(confirmNickname) {
  await api.delete('/users/me', { data: { confirmNickname } })
}

export async function search(q, limit = 6, areaIds = []) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  params.set('limit', String(limit))
  areaIds.forEach((areaId) => params.append('area', areaId))
  const { data } = await api.get('/search', { params })
  return data
}

export const searchKeys = {
  unified: (q, limit, areaIds = []) => ['search', q, limit, areaIds],
}
