import { test, expect } from './support/fixtures'
import {
  addTrilhaItem,
  addTrilhaStep,
  apiUrl,
  createCourse,
  createPost,
  createTestUser,
  createTrilha,
  publishCourse,
  publishPost,
  publishTrilha,
} from './support/api'

test.describe('trilhas', () => {
  test('cria trilha e adiciona um curso pela busca da UI', async ({ page, loginAs, api }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Curso p/ trilha ${Date.now()}` })
    await publishCourse(api, owner.token, course.id)
    await loginAs(owner.token)

    await page.goto('/trilhas')
    await page.getByRole('button', { name: 'Criar trilha' }).click()
    const createDialog = page.getByRole('dialog')
    await createDialog.locator('#trilha-title').fill(`Trilha UI ${Date.now()}`)
    await createDialog.getByRole('button', { name: 'Criar trilha' }).click()

    await expect(page).toHaveURL(/\/edit$/)

    await page.getByRole('button', { name: 'Adicionar item' }).click()
    const pickerDialog = page.getByRole('dialog')
    await pickerDialog.getByPlaceholder(/buscar/i).fill(course.name)
    await pickerDialog.getByText(course.name).click()

    await expect(page.getByText(course.name)).toBeVisible()
  })

  test('nao deixa adicionar o mesmo curso duas vezes na trilha', async ({ api }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Curso duplicado ${Date.now()}` })
    const trilha = await createTrilha(api, owner.token)

    await addTrilhaItem(api, owner.token, trilha.id, { courseId: course.id })
    const secondAttempt = await api.post(apiUrl(`/trilhas/${trilha.id}/items`), {
      data: { courseId: course.id },
      headers: owner.headers,
    })

    expect(secondAttempt.status()).toBe(400)
  })

  test('agrupar itens em etapas reflete na visualizacao publica', async ({ page, api }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Curso com etapa ${Date.now()}` })
    await publishCourse(api, owner.token, course.id)
    const trilha = await createTrilha(api, owner.token, { title: `Trilha com etapas ${Date.now()}` })
    await publishTrilha(api, owner.token, trilha.id)
    const item = await addTrilhaItem(api, owner.token, trilha.id, { courseId: course.id })
    const step = await addTrilhaStep(api, owner.token, trilha.id, 'Fundamentos')
    const moveRes = await api.put(apiUrl(`/trilhas/${trilha.id}/items/${item.id}/step`), {
      data: { stepId: step.id },
      headers: owner.headers,
    })
    expect(moveRes.ok()).toBe(true)

    await page.goto(`/trilhas/${owner.user.nickname}/${trilha.slug}`)
    await expect(page.getByText(/1 - Fundamentos/)).toBeVisible()
    await expect(page.getByText(course.name)).toBeVisible()
  })

  test('excluir uma etapa remove os itens da trilha mas nao apaga o curso', async ({ page, api }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Sobrevive ${Date.now()}` })
    await publishCourse(api, owner.token, course.id)
    const trilha = await createTrilha(api, owner.token)
    const step = await addTrilhaStep(api, owner.token, trilha.id)
    await addTrilhaItem(api, owner.token, trilha.id, { courseId: course.id, stepId: step.id })

    const beforeDelete = await api.delete(apiUrl(`/trilhas/${trilha.id}/steps/${step.id}`), { headers: owner.headers })
    expect(beforeDelete.ok()).toBe(true)

    const detail = await (await api.get(apiUrl(`/trilhas/${trilha.id}`), { headers: owner.headers })).json()
    expect(detail.structure.steps).toHaveLength(0)
    expect(detail.structure.ungroupedItems).toHaveLength(0)

    await page.goto(`/courses/${owner.user.nickname}/${course.slug}`)
    await expect(page.getByRole('heading', { name: course.name })).toBeVisible()
  })

  test('curso publico pode estar em trilhas de donos diferentes; dono do curso controla o destaque', async ({
    page,
    api,
  }) => {
    // The anti-troll design: a public course can be pulled into anyone's trilha without the course
    // owner's say-so (that part is unavoidable and intentional), but only the course owner decides
    // which of those memberships get the spotlight on the course's own page.
    const courseOwner = await createTestUser(api)
    const course = await createCourse(api, courseOwner.token, { name: `Cobicado ${Date.now()}` })
    await publishCourse(api, courseOwner.token, course.id)

    const strangerA = await createTestUser(api)
    const trilhaA = await createTrilha(api, strangerA.token, { title: `Trilha A ${Date.now()}` })
    await publishTrilha(api, strangerA.token, trilhaA.id)
    await addTrilhaItem(api, strangerA.token, trilhaA.id, { courseId: course.id })

    const strangerB = await createTestUser(api)
    const trilhaB = await createTrilha(api, strangerB.token, { title: `Trilha B ${Date.now()}` })
    await publishTrilha(api, strangerB.token, trilhaB.id)
    await addTrilhaItem(api, strangerB.token, trilhaB.id, { courseId: course.id })

    // Both trilhas are reachable via "ver mais" regardless of curation.
    const allTrilhas = await (
      await api.get(apiUrl(`/courses/${course.id}/trilhas`), { headers: courseOwner.headers })
    ).json()
    expect(allTrilhas.items.map((t) => t.id).sort()).toEqual([trilhaA.id, trilhaB.id].sort())

    // The course owner curates: only trilha A gets highlighted.
    const highlight = await api.put(apiUrl(`/courses/${course.id}/trilhas/${trilhaA.id}/highlight`), {
      headers: courseOwner.headers,
    })
    expect(highlight.ok()).toBe(true)

    const highlighted = await (
      await api.get(apiUrl(`/courses/${course.id}/trilhas/highlighted`), { headers: courseOwner.headers })
    ).json()
    expect(highlighted.map((t) => t.id)).toEqual([trilhaA.id])

    await page.goto(`/courses/${courseOwner.user.nickname}/${course.slug}`)
    const trilhasSection = page.locator('section', { has: page.getByRole('heading', { name: 'Trilhas deste curso' }) })
    await expect(trilhasSection.getByText(trilhaA.title)).toBeVisible()
    await expect(trilhasSection.getByText(trilhaB.title)).toHaveCount(0)

    await trilhasSection.getByRole('button', { name: 'Ver mais' }).click()
    const modal = page.getByRole('dialog')
    await expect(modal.getByText(trilhaA.title)).toBeVisible()
    await expect(modal.getByText(trilhaB.title)).toBeVisible()
  })

  test('curso relacionado nao e reciproco', async ({ page, api }) => {
    const owner = await createTestUser(api)
    const courseX = await createCourse(api, owner.token, { name: `X Origem ${Date.now()}` })
    const courseY = await createCourse(api, owner.token, { name: `Y Relacionado ${Date.now()}` })
    await publishCourse(api, owner.token, courseX.id)
    await publishCourse(api, owner.token, courseY.id)

    const link = await api.post(apiUrl(`/courses/${courseX.id}/related`), {
      data: { relatedCourseId: courseY.id },
      headers: owner.headers,
    })
    expect(link.ok()).toBe(true)

    await page.goto(`/courses/${owner.user.nickname}/${courseX.slug}`)
    await expect(page.getByText('Relacionados')).toBeVisible()
    await expect(page.getByText(courseY.name)).toBeVisible()

    await page.goto(`/courses/${owner.user.nickname}/${courseY.slug}`)
    await expect(page.getByText('Relacionados')).toHaveCount(0)
  })

  test('nota do dono num item da trilha aparece na visualizacao publica', async ({ page, api }) => {
    const owner = await createTestUser(api)
    const post = await createPost(api, owner.token, { title: `Post com nota ${Date.now()}` })
    await publishPost(api, owner.token, post.id)
    const trilha = await createTrilha(api, owner.token)
    await publishTrilha(api, owner.token, trilha.id)
    const item = await addTrilhaItem(api, owner.token, trilha.id, { postId: post.id })

    const note = 'Leia isso antes do proximo curso.'
    await api.patch(apiUrl(`/trilhas/${trilha.id}/items/${item.id}`), { data: { note }, headers: owner.headers })

    await page.goto(`/trilhas/${owner.user.nickname}/${trilha.slug}`)
    await expect(page.getByText(note)).toBeVisible()
  })

  test('seguir a trilha e concluir um item atualiza o progresso, independente do curso', async ({
    page,
    loginAs,
    api,
  }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Curso do progresso ${Date.now()}` })
    await publishCourse(api, owner.token, course.id)
    const trilha = await createTrilha(api, owner.token, { title: `Trilha com progresso ${Date.now()}` })
    await publishTrilha(api, owner.token, trilha.id)
    await addTrilhaItem(api, owner.token, trilha.id, { courseId: course.id })

    const follower = await createTestUser(api)
    await loginAs(follower.token)

    await page.goto(`/trilhas/${owner.user.nickname}/${trilha.slug}`)
    await page.getByRole('button', { name: 'Seguir trilha' }).click()
    await expect(page.getByRole('button', { name: 'Deixar de seguir' })).toBeVisible()
    await expect(page.getByText('0 de 1')).toBeVisible()

    await page.locator('li', { hasText: course.name }).getByRole('button').first().click()
    await expect(page.getByText('1 de 1')).toBeVisible()
  })
})
