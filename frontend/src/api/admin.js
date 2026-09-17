import { api } from '@/lib/api'

export const adminKeys = {
  blockedContent: ['admin', 'blocked-content'],
  homePicks: ['admin', 'home-picks'],
}

/** Every course, post and trilha currently blocked by an admin. */
export async function listBlockedContent() {
  const { data } = await api.get('/admin/blocked-content')
  return data
}

/** What is currently chosen for the home page: courses, posts, trilhas and schools, each ordered. */
export async function getHomePicks() {
  const { data } = await api.get('/admin/home-picks')
  return data
}

/**
 * Replaces the home page's picks for one content kind with exactly this list, in this order.
 * `kind` is "courses", "posts", "trilhas" or "schools".
 */
export async function setHomePicks(kind, ids) {
  const { data } = await api.put(`/admin/home-picks/${kind}`, { ids })
  return data
}
