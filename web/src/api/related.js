import { api } from '@/lib/api'

/** Related courses/posts, curated only by the owner of the source course/post. */
export const relatedKeys = {
  course: (courseId, page) => ['courses', courseId, 'related', page],
  post: (postId, page) => ['posts', postId, 'related', page],
}

export async function listCourseRelated(courseId, page = 0, size = 12) {
  const { data } = await api.get(`/courses/${courseId}/related`, { params: { page, size } })
  return data
}

export async function addCourseRelated(courseId, payload) {
  const { data } = await api.post(`/courses/${courseId}/related`, payload)
  return data
}

export async function removeCourseRelated(courseId, relatedItemId) {
  await api.delete(`/courses/${courseId}/related/${relatedItemId}`)
}

export async function listPostRelated(postId, page = 0, size = 12) {
  const { data } = await api.get(`/posts/${postId}/related`, { params: { page, size } })
  return data
}

export async function addPostRelated(postId, payload) {
  const { data } = await api.post(`/posts/${postId}/related`, payload)
  return data
}

export async function removePostRelated(postId, relatedItemId) {
  await api.delete(`/posts/${postId}/related/${relatedItemId}`)
}
