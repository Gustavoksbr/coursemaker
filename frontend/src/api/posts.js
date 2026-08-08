import { api } from '@/lib/api'
import { listParams } from './shared'

export const postKeys = {
  all: ['posts'],
  list: (filters) => ['posts', 'list', filters],
  bySlug: (nickname, slug) => ['posts', 'by-slug', nickname, slug],
  byId: (id) => ['posts', 'id', id],
}

export async function listPosts(filters) {
  const { data } = await api.get('/posts', { params: listParams(filters) })
  return data
}

export async function getPostBySlug(nickname, slug) {
  const { data } = await api.get(`/posts/by-slug/${encodeURIComponent(nickname)}/${encodeURIComponent(slug)}`)
  return data
}

export async function getPost(id) {
  const { data } = await api.get(`/posts/${id}`)
  return data
}

export async function checkPostSlug(title) {
  const { data } = await api.get('/posts/slug-check', { params: { title } })
  return data
}

export async function createPost(payload) {
  const { data } = await api.post('/posts', payload)
  return data
}

export async function updatePost(id, payload) {
  const { data } = await api.patch(`/posts/${id}`, payload)
  return data
}

export async function deletePost(id) {
  await api.delete(`/posts/${id}`)
}

export async function togglePostFeatured(id) {
  const { data } = await api.post(`/posts/${id}/featured`)
  return data
}

export async function likePost(id) {
  const { data } = await api.post(`/posts/${id}/like`)
  return data
}

export async function unlikePost(id) {
  const { data } = await api.delete(`/posts/${id}/like`)
  return data
}

// ------------------------------------------------------------------- blocks

export async function listPostBlocks(postId) {
  const { data } = await api.get(`/posts/${postId}/blocks`)
  return data
}

export async function createPostBlock(postId, payload) {
  const { data } = await api.post(`/posts/${postId}/blocks`, payload)
  return data
}

export async function updatePostBlock(id, payload) {
  const { data } = await api.patch(`/post-blocks/${id}`, payload)
  return data
}

export async function deletePostBlock(id) {
  await api.delete(`/post-blocks/${id}`)
}

export async function reorderPostBlocks(postId, ids) {
  const { data } = await api.put(`/posts/${postId}/blocks/reorder`, { ids })
  return data
}
