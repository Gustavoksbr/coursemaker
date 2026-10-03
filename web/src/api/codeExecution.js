import { api } from '@/lib/api'

export async function runCode(payload) {
  const { data } = await api.post('/code-execution/run', payload)
  return data
}

export async function runSquareExercise(payload) {
  const { data } = await api.post('/code-execution/exercises/square/run', payload)
  return data
}
