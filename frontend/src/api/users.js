import { api } from '@/lib/api'

export const userKeys = {
  profile: (nickname) => ['users', nickname],
  nicknameAvailable: (nickname) => ['users', 'nickname-available', nickname],
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

export async function search(q, limit = 6) {
  const { data } = await api.get('/search', { params: q ? { q, limit } : { limit } })
  return data
}

export const searchKeys = {
  unified: (q, limit) => ['search', q, limit],
}
