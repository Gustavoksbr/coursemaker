import { request as playwrightRequest } from '@playwright/test'

/**
 * Direct HTTP helpers against the live backend, bypassing the UI, for fast/deterministic test
 * setup ("arrange"). The behavior actually under test still goes through the real UI in the specs
 * themselves. Every helper throws with the response body on failure, so a broken helper fails loud
 * at the call site instead of producing a confusing downstream UI assertion failure.
 */

export const API_URL = process.env.E2E_API_URL || 'http://localhost:8080'

// No baseURL on the request context: Playwright joins baseURL + path via WHATWG URL resolution,
// where a leading "/" resolves against the ORIGIN and silently drops any base path (here,
// "/api/v1"). Building the full URL ourselves for every call -- including ad hoc ones in specs --
// sidesteps that trap entirely.
export function apiUrl(path) {
  return `${API_URL}/api/v1${path}`
}

let counter = 0
/**
 * Unique per call, plus a timestamp so re-runs against a dirty DB never collide. The random
 * suffix is what makes it unique *across* workers: the counter only counts within one worker
 * process, so two parallel workers landing on the same millisecond would otherwise produce the
 * same nickname and one of them would 409.
 */
function unique() {
  counter += 1
  return `${Date.now()}${counter}${Math.random().toString(36).slice(2, 7)}`
}

export function uniqueEmail(prefix = 'e2e') {
  return `${prefix}.${unique()}@example.com`
}

export function uniqueSlugSeed(prefix = 'e2e') {
  return `${prefix} ${unique()}`
}

/** A fresh API request context talking straight to the backend (no browser involved). */
export async function newApiContext() {
  return playwrightRequest.newContext()
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

async function okJson(res, what) {
  if (!res.ok()) {
    throw new Error(`${what} failed: ${res.status()} ${await res.text()}`)
  }
  return res.json()
}

/** Registers a brand-new user and claims a unique nickname for them. */
export async function createTestUser(api, { name = 'Teste E2E', password = 'Teste@1234' } = {}) {
  const email = uniqueEmail()
  const { token, user } = await okJson(
    await api.post(apiUrl('/auth/register'), { data: { email, password, name } }),
    'register',
  )

  const nickname = `e2e${unique()}`.toLowerCase().slice(0, 30)
  const updatedUser = await okJson(
    await api.patch(apiUrl(`/users/${user.id}`), { data: { nickname }, headers: authHeaders(token) }),
    'set nickname',
  )

  return { token, user: updatedUser, email, password, headers: authHeaders(token) }
}

// ------------------------------------------------------------------- courses

export async function createCourse(api, token, overrides = {}) {
  const body = { name: uniqueSlugSeed('Curso'), ...overrides }
  return okJson(
    await api.post(apiUrl('/courses'), { data: body, headers: authHeaders(token) }),
    'create course',
  )
}

export async function updateCourse(api, token, courseId, patch) {
  return okJson(
    await api.patch(apiUrl(`/courses/${courseId}`), { data: patch, headers: authHeaders(token) }),
    'update course',
  )
}

export async function publishCourse(api, token, courseId) {
  return updateCourse(api, token, courseId, { status: 'available' })
}

export async function addModule(api, token, courseId, title = 'Modulo 1') {
  return okJson(
    await api.post(apiUrl(`/courses/${courseId}/modules`), { data: { title }, headers: authHeaders(token) }),
    'create module',
  )
}

export async function addLesson(api, token, moduleId, title = 'Licao 1') {
  return okJson(
    await api.post(apiUrl(`/modules/${moduleId}/lessons`), { data: { title }, headers: authHeaders(token) }),
    'create lesson',
  )
}

// --------------------------------------------------------------------- posts

export async function createPost(api, token, overrides = {}) {
  const body = { title: uniqueSlugSeed('Post'), ...overrides }
  return okJson(
    await api.post(apiUrl('/posts'), { data: body, headers: authHeaders(token) }),
    'create post',
  )
}

export async function publishPost(api, token, postId) {
  return okJson(
    await api.patch(apiUrl(`/posts/${postId}`), { data: { status: 'available' }, headers: authHeaders(token) }),
    'publish post',
  )
}

// ------------------------------------------------------------------- trilhas

export async function createTrilha(api, token, overrides = {}) {
  const body = { title: uniqueSlugSeed('Trilha'), ...overrides }
  return okJson(
    await api.post(apiUrl('/trilhas'), { data: body, headers: authHeaders(token) }),
    'create trilha',
  )
}

export async function publishTrilha(api, token, trilhaId) {
  return okJson(
    await api.patch(apiUrl(`/trilhas/${trilhaId}`), { data: { status: 'available' }, headers: authHeaders(token) }),
    'publish trilha',
  )
}

export async function addTrilhaItem(api, token, trilhaId, body) {
  return okJson(
    await api.post(apiUrl(`/trilhas/${trilhaId}/items`), { data: body, headers: authHeaders(token) }),
    'add trilha item',
  )
}

export async function addTrilhaStep(api, token, trilhaId, title = 'Etapa 1') {
  return okJson(
    await api.post(apiUrl(`/trilhas/${trilhaId}/steps`), { data: { title }, headers: authHeaders(token) }),
    'create trilha step',
  )
}

// ----------------------------------------------------------------- enroll

export async function enroll(api, token, courseId, password) {
  return api.post(apiUrl('/enrollments'), { data: { courseId, password }, headers: authHeaders(token) })
}

// ----------------------------------------------------------------- library

export async function moveCourseToFolder(api, token, courseId, folderId) {
  return okJson(
    await api.put(apiUrl(`/library/courses/${courseId}/folder`), {
      data: { folderId },
      headers: authHeaders(token),
    }),
    'save course to folder',
  )
}

export async function createFolder(api, token, name) {
  return okJson(
    await api.post(apiUrl('/library/folders'), { data: { name }, headers: authHeaders(token) }),
    'create folder',
  )
}

export async function listFolders(api, token) {
  return okJson(await api.get(apiUrl('/library/folders'), { headers: authHeaders(token) }), 'list folders')
}

/** The undeletable "Favoritos" folder every user gets; created lazily on the first folder read. */
export async function defaultFolder(api, token) {
  const folders = await listFolders(api, token)
  return folders.find((folder) => folder.isDefault)
}
