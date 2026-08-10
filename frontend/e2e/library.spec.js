import { test, expect } from './support/fixtures'
import {
  apiUrl,
  createCourse,
  createFolder,
  createTestUser,
  defaultFolder,
  enroll,
  listFolders,
  moveCourseToFolder,
  publishCourse,
} from './support/api'

test.describe('biblioteca: pastas', () => {
  test('todo usuario ganha uma pasta Favoritos, e ela vem primeiro', async ({ api }) => {
    const user = await createTestUser(api)
    // Nothing was saved and no folder was created: Favoritos still has to exist on its own.
    const folders = await listFolders(api, user.token)

    expect(folders).toHaveLength(1)
    expect(folders[0].name).toBe('Favoritos')
    expect(folders[0].isDefault).toBe(true)

    await createFolder(api, user.token, `Depois ${Date.now()}`)
    const afterCreating = await listFolders(api, user.token)
    expect(afterCreating[0].isDefault).toBe(true)
    expect(afterCreating.filter((f) => f.isDefault)).toHaveLength(1)
  })

  test('a pasta Favoritos nao pode ser renomeada nem excluida', async ({ page, loginAs, api }) => {
    const user = await createTestUser(api)
    const favorites = await defaultFolder(api, user.token)

    const renameRes = await api.patch(apiUrl(`/library/folders/${favorites.id}`), {
      data: { name: 'Outro nome' },
      headers: user.headers,
    })
    expect(renameRes.status()).toBe(400)

    const deleteRes = await api.delete(apiUrl(`/library/folders/${favorites.id}`), {
      headers: user.headers,
    })
    expect(deleteRes.status()).toBe(400)

    // ...and the UI does not even offer the buttons.
    await loginAs(user.token)
    await page.goto(`/biblioteca/pastas/${favorites.id}`)
    await expect(page.getByRole('heading', { name: 'Favoritos' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Renomear' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Excluir pasta' })).toHaveCount(0)
  })

  test('uma pasta comum pode ser renomeada e excluida', async ({ page, loginAs, api }) => {
    const user = await createTestUser(api)
    const folder = await createFolder(api, user.token, `Comum ${Date.now()}`)
    await loginAs(user.token)

    await page.goto(`/biblioteca/pastas/${folder.id}`)
    await page.getByRole('button', { name: 'Renomear' }).click()

    const renamed = `Renomeada ${Date.now()}`
    const renameDialog = page.getByRole('dialog')
    await renameDialog.locator('#folder-name').fill(renamed)
    await renameDialog.getByRole('button', { name: 'Salvar' }).click()

    await expect(page.getByRole('heading', { name: renamed })).toBeVisible()

    await page.getByRole('button', { name: 'Excluir pasta' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir pasta' }).click()
    await expect(page).toHaveURL(/\/biblioteca$/)
    await expect(page.locator('section#pastas').getByText(renamed)).toHaveCount(0)
  })

  test('salvar pelo card exige escolher a pasta e muda o icone', async ({ page, loginAs, api }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Card salvavel ${Date.now()}` })
    await publishCourse(api, owner.token, course.id)

    const saver = await createTestUser(api)
    await loginAs(saver.token)

    await page.goto(`/cursos?q=${encodeURIComponent(course.name)}`)
    const card = page.locator('article', { hasText: course.name })
    await card.getByLabel('Salvar na biblioteca').click()

    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Salvar na biblioteca')).toBeVisible()
    await dialog.getByText('Favoritos', { exact: true }).click()

    await expect(dialog).toBeHidden()
    await expect(card.getByLabel('Salvo na biblioteca - editar')).toBeVisible()

    await page.goto('/biblioteca')
    await page.locator('section#pastas').getByText('Favoritos').click()
    await expect(page.getByText(course.name)).toBeVisible()
  })

  test('cria uma pasta nova direto do modal, sem passar por Favoritos', async ({
    page,
    loginAs,
    api,
  }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Direto na pasta ${Date.now()}` })
    await publishCourse(api, owner.token, course.id)

    const saver = await createTestUser(api)
    await loginAs(saver.token)

    const folderName = `Quero revisar ${Date.now()}`

    await page.goto(`/cursos?q=${encodeURIComponent(course.name)}`)
    const card = page.locator('article', { hasText: course.name })
    await card.getByLabel('Salvar na biblioteca').click()

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Nova pasta' }).click()
    await dialog.getByPlaceholder('Nome da pasta').fill(folderName)
    await dialog.getByRole('button', { name: 'Criar' }).click()
    await expect(dialog).toBeHidden()

    // It landed in the new folder, and Favoritos was never involved.
    const favorites = await defaultFolder(api, saver.token)
    expect(favorites.itemCount).toBe(0)

    await page.goto('/biblioteca')
    await page.locator('section#pastas').getByText(folderName).click()
    await expect(page.getByRole('heading', { name: folderName })).toBeVisible()
    await expect(page.getByText(course.name)).toBeVisible()
  })

  test('mover um item salvo entre pastas atualiza as contagens', async ({ page, loginAs, api }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Movivel ${Date.now()}` })
    await publishCourse(api, owner.token, course.id)

    const saver = await createTestUser(api)
    const folderA = await createFolder(api, saver.token, `Pasta A ${Date.now()}`)
    const folderB = await createFolder(api, saver.token, `Pasta B ${Date.now()}`)
    await moveCourseToFolder(api, saver.token, course.id, folderA.id)
    await loginAs(saver.token)

    await page.goto(`/cursos?q=${encodeURIComponent(course.name)}`)
    const card = page.locator('article', { hasText: course.name })
    await card.getByLabel('Salvo na biblioteca - editar').click()

    const dialog = page.getByRole('dialog')
    await dialog.getByText(folderB.name, { exact: true }).click()
    await expect(dialog).toBeHidden()

    const folderARes = await api.get(apiUrl(`/library/folders/${folderA.id}`), { headers: saver.headers })
    const folderBRes = await api.get(apiUrl(`/library/folders/${folderB.id}`), { headers: saver.headers })
    expect((await folderARes.json()).itemCount).toBe(0)
    expect((await folderBRes.json()).itemCount).toBe(1)
  })

  test('excluir uma pasta manda os itens para Favoritos em vez de apaga-los', async ({
    page,
    loginAs,
    api,
  }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Sobrevive na pasta ${Date.now()}` })
    await publishCourse(api, owner.token, course.id)

    const saver = await createTestUser(api)
    const folder = await createFolder(api, saver.token, `Temporaria ${Date.now()}`)
    await moveCourseToFolder(api, saver.token, course.id, folder.id)
    await loginAs(saver.token)

    await page.goto('/biblioteca')
    await page.locator('section#pastas').getByText(folder.name).click()
    await page.getByRole('button', { name: 'Excluir pasta' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir pasta' }).click()

    await expect(page).toHaveURL(/\/biblioteca$/)
    await page.locator('section#pastas').getByText('Favoritos').click()
    await expect(page.getByText(course.name)).toBeVisible()

    const status = await (
      await api.get(apiUrl(`/library/courses/${course.id}/status`), { headers: saver.headers })
    ).json()
    expect(status.saved).toBe(true)
  })

  test('salvar sem escolher pasta cai em Favoritos', async ({ api }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Sem pasta ${Date.now()}` })
    await publishCourse(api, owner.token, course.id)

    const saver = await createTestUser(api)
    const status = await moveCourseToFolder(api, saver.token, course.id, null)
    const favorites = await defaultFolder(api, saver.token)

    expect(status.saved).toBe(true)
    expect(status.folderId).toBe(favorites.id)
  })

  test('remover dos salvos tira o item de qualquer lugar da biblioteca', async ({
    page,
    loginAs,
    api,
  }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Removivel ${Date.now()}` })
    await publishCourse(api, owner.token, course.id)

    const saver = await createTestUser(api)
    await moveCourseToFolder(api, saver.token, course.id, null)
    await loginAs(saver.token)

    await page.goto(`/cursos?q=${encodeURIComponent(course.name)}`)
    const card = page.locator('article', { hasText: course.name })
    await card.getByLabel('Salvo na biblioteca - editar').click()

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Remover dos salvos' }).click()
    await expect(dialog).toBeHidden()
    await expect(card.getByLabel('Salvar na biblioteca')).toBeVisible()

    const status = await (
      await api.get(apiUrl(`/library/courses/${course.id}/status`), { headers: saver.headers })
    ).json()
    expect(status.saved).toBe(false)
  })

  test('nao deixa criar duas pastas com o mesmo nome', async ({ api }) => {
    const user = await createTestUser(api)
    const name = `Repetida ${Date.now()}`
    await createFolder(api, user.token, name)

    const secondAttempt = await api.post(apiUrl('/library/folders'), {
      data: { name: name.toUpperCase() },
      headers: user.headers,
    })

    expect(secondAttempt.status()).toBe(400)
  })

  test('nao deixa criar uma pasta chamada Favoritos, ja que ela existe', async ({ api }) => {
    const user = await createTestUser(api)
    await listFolders(api, user.token) // materialises the default folder

    const res = await api.post(apiUrl('/library/folders'), {
      data: { name: 'favoritos' },
      headers: user.headers,
    })

    expect(res.status()).toBe(400)
  })

  test('a pasta de um usuario nao e visivel para outro', async ({ api }) => {
    const owner = await createTestUser(api)
    const folder = await createFolder(api, owner.token, `Privada ${Date.now()}`)

    const stranger = await createTestUser(api)
    const res = await api.get(apiUrl(`/library/folders/${folder.id}`), { headers: stranger.headers })

    // 404, not 403: a stranger should not learn that this id exists at all.
    expect(res.status()).toBe(404)
  })

  test('continuar assistindo e em andamento aparecem depois de matricular e abrir o curso', async ({
    page,
    loginAs,
    api,
  }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Em progresso ${Date.now()}` })
    await publishCourse(api, owner.token, course.id)

    const student = await createTestUser(api)
    const enrollRes = await enroll(api, student.token, course.id)
    expect(enrollRes.ok()).toBe(true)
    await loginAs(student.token)

    await page.goto(`/courses/${owner.user.nickname}/${course.slug}`)

    await page.goto('/biblioteca')
    await expect(page.locator('section#continuar').getByText(course.name)).toBeVisible()
    await expect(page.locator('section#em-andamento').getByText(course.name)).toBeVisible()
  })
})
