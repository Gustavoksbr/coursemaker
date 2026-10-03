import { test, expect } from './support/fixtures'
import { createCourse, createTestUser, enroll, publishCourse } from './support/api'

test.describe('cursos', () => {
  test('cria um curso pela UI e comeca como rascunho', async ({ page, loginAs, api }) => {
    const { token } = await createTestUser(api)
    await loginAs(token)

    const courseName = `Curso UI ${Date.now()}`
    await page.goto('/cursos')
    await page.getByRole('button', { name: 'Criar curso' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.locator('#course-name').fill(courseName)
    await dialog.getByRole('button', { name: 'Continuar' }).click()
    await dialog.getByRole('button', { name: 'Criar curso' }).click()

    await expect(page).toHaveURL(/\/edit$/)
    await expect(page.getByText('Rascunho')).toBeVisible()
  })

  test('rascunho aparece na busca para o proprio dono, mas nao para estranhos', async ({
    page,
    loginAs,
    api,
    browser,
  }) => {
    const owner = await createTestUser(api)
    const draft = await createCourse(api, owner.token, { name: `So o dono ve ${Date.now()}` })
    await loginAs(owner.token)

    await page.goto(`/cursos?q=${encodeURIComponent(draft.name)}`)
    await expect(page.getByText(draft.name)).toBeVisible()

    const strangerContext = await browser.newContext()
    const strangerPage = await strangerContext.newPage()
    await strangerPage.goto(`/cursos?q=${encodeURIComponent(draft.name)}`)
    await expect(strangerPage.getByText(draft.name)).toHaveCount(0)
    await strangerContext.close()
  })

  test('publicar torna o curso visivel no catalogo publico', async ({ page, api }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Publicado ${Date.now()}` })
    await publishCourse(api, owner.token, course.id)

    await page.goto(`/cursos?q=${encodeURIComponent(course.name)}`)
    await expect(page.getByText(course.name)).toBeVisible()
  })

  test('rascunho de outro usuario nao pode ser aberto por quem nao e dono', async ({
    page,
    loginAs,
    api,
  }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Privado Rascunho ${Date.now()}` })

    const stranger = await createTestUser(api)
    await loginAs(stranger.token)

    await page.goto(`/courses/${owner.user.nickname}/${course.slug}`)
    await expect(page.getByText(/nao existe|indisponivel|nao esta acessivel/i)).toBeVisible()
  })

  test('curso privado exige senha para ver o conteudo', async ({ page, loginAs, api }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, {
      name: `Privado ${Date.now()}`,
      visibility: 'private',
      password: 'segredo123',
    })
    await publishCourse(api, owner.token, course.id)

    const student = await createTestUser(api)
    await loginAs(student.token)

    await page.goto(`/courses/${owner.user.nickname}/${course.slug}`)
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Curso privado')).toBeVisible()

    await dialog.locator('#course-password').fill('senha-errada')
    await dialog.getByRole('button', { name: 'Desbloquear' }).click()
    await expect(dialog.getByText(/incorreta/i)).toBeVisible()

    await dialog.locator('#course-password').fill('segredo123')
    await dialog.getByRole('button', { name: 'Desbloquear' }).click()
    await expect(page.getByText('Acesso liberado!')).toBeVisible()
  })

  test('dono nao consegue se matricular no proprio curso', async ({ api }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Curso proprio ${Date.now()}` })
    await publishCourse(api, owner.token, course.id)

    const res = await enroll(api, owner.token, course.id)
    expect(res.status()).toBe(403)
  })

  test('slugs duplicados do mesmo dono ganham sufixo numerico', async ({ api }) => {
    const owner = await createTestUser(api)
    const first = await createCourse(api, owner.token, { name: 'Mesmo Nome', slug: undefined })
    const second = await createCourse(api, owner.token, { name: 'Mesmo Nome', slug: undefined })

    expect(first.slug).not.toBe(second.slug)
    expect(second.slug.startsWith(first.slug)).toBe(true)
  })

  test('salvar um curso persiste apos recarregar a pagina', async ({ page, loginAs, api }) => {
    const owner = await createTestUser(api)
    const course = await createCourse(api, owner.token, { name: `Salvavel ${Date.now()}` })
    await publishCourse(api, owner.token, course.id)

    const fan = await createTestUser(api)
    await loginAs(fan.token)

    await page.goto(`/courses/${owner.user.nickname}/${course.slug}`)
    await page.getByLabel('Salvar na biblioteca').click()
    await page.getByRole('dialog').getByText('Favoritos', { exact: true }).click()
    await expect(page.getByLabel('Salvo na biblioteca - editar')).toBeVisible()

    await page.reload()
    await expect(page.getByLabel('Salvo na biblioteca - editar')).toBeVisible()
  })
})
