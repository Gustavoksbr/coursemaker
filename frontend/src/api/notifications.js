import { api } from '@/lib/api'

export const notificationKeys = {
  list: ['notifications', 'list'],
  unreadCount: ['notifications', 'unread-count'],
}

export async function listNotifications(page = 0, size = 20) {
  const { data } = await api.get('/notifications', { params: { page, size } })
  return data
}

export async function unreadCount() {
  const { data } = await api.get('/notifications/unread-count')
  return data
}

export async function markNotificationRead(id) {
  await api.post(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead() {
  await api.post('/notifications/read-all')
}
