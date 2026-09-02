import { api } from '@/lib/api'

export const homeKeys = {
  settings: ['home', 'site-settings'],
  stats: ['home', 'stats'],
  testimonials: ['home', 'testimonials'],
  allTestimonials: ['home', 'testimonials', 'all'],
}

export async function getSiteSettings() {
  const { data } = await api.get('/site-settings')
  return data
}

export async function updateSiteSettings(payload) {
  const { data } = await api.patch('/site-settings', payload)
  return data
}

export async function getStats() {
  const { data } = await api.get('/stats')
  return data
}

export async function listTestimonials() {
  const { data } = await api.get('/testimonials')
  return data
}

/** Admin-only: includes unpublished drafts. */
export async function listAllTestimonials() {
  const { data } = await api.get('/testimonials/all')
  return data
}

export async function createTestimonial(payload) {
  const { data } = await api.post('/testimonials', payload)
  return data
}

export async function updateTestimonial(id, payload) {
  const { data } = await api.patch(`/testimonials/${id}`, payload)
  return data
}

export async function deleteTestimonial(id) {
  await api.delete(`/testimonials/${id}`)
}
