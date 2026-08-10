import { api } from '@/lib/api'

export async function chatAboutCourse(courseId, payload) {
  const { data } = await api.post(`/ai/courses/${courseId}/chat`, payload)
  return data
}

export async function chatAboutPost(postId, payload) {
  const { data } = await api.post(`/ai/posts/${postId}/chat`, payload)
  return data
}
