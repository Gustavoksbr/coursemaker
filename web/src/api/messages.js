import { api } from '@/lib/api'

export const messageKeys = {
  conversations: ['messages', 'conversations'],
  unreadCount: ['messages', 'unread-count'],
  thread: (nickname) => ['messages', 'thread', nickname],
}

export async function listConversations() {
  const { data } = await api.get('/messages/conversations')
  return data
}

export async function messagesUnreadCount() {
  const { data } = await api.get('/messages/unread-count')
  return data
}

export async function listThread(nickname, page = 0, size = 20) {
  const { data } = await api.get(`/messages/with/${encodeURIComponent(nickname)}`, { params: { page, size } })
  return data
}

export async function sendMessage(nickname, payload) {
  const { data } = await api.post(`/messages/with/${encodeURIComponent(nickname)}`, payload)
  return data
}

export async function editMessage(id, content) {
  const { data } = await api.patch(`/messages/${id}`, { content })
  return data
}

export async function deleteMessage(id) {
  await api.delete(`/messages/${id}`)
}
