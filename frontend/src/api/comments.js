import { api } from '@/lib/api'

const PATH = { course: 'courses', post: 'posts', trilha: 'trilhas' }

export const commentKeys = {
  list: (kind, id) => [PATH[kind], id, 'comments'],
}

export async function listComments(kind, id) {
  const { data } = await api.get(`/${PATH[kind]}/${id}/comments`)
  return data
}

export async function createComment(kind, id, payload) {
  const { data } = await api.post(`/${PATH[kind]}/${id}/comments`, payload)
  return data
}

export async function deleteComment(id) {
  await api.delete(`/comments/${id}`)
}
