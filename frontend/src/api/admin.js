import { api } from '@/lib/api'

export const adminKeys = {
  blockedContent: ['admin', 'blocked-content'],
}

/** Every course, post and trilha currently blocked by an admin. */
export async function listBlockedContent() {
  const { data } = await api.get('/admin/blocked-content')
  return data
}
