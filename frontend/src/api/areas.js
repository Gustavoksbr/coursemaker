import { api } from '@/lib/api'

export const areaKeys = {
  all: ['areas'],
  list: () => ['areas', 'list'],
}

export async function listAreas() {
  const { data } = await api.get('/areas')
  return data
}

export async function createArea(payload) {
  const { data } = await api.post('/areas', payload)
  return data
}

export async function updateArea(id, payload) {
  const { data } = await api.patch(`/areas/${id}`, payload)
  return data
}

export async function deleteArea(id) {
  await api.delete(`/areas/${id}`)
}
