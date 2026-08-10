import { test, expect } from './support/fixtures'
import { createCourse, createTestUser, createTrilha, publishTrilha } from './support/api'

test.describe('perfil publico', () => {
  test('dono ve o proprio rascunho no perfil, mas um estranho nao', async ({
    page,
    loginAs,
    api,
    browser,
  }) => {
    const owner = await createTestUser(api)
    const draft = await createCourse(api, owner.token, { name: `Rascunho no perfil ${Date.now()}` })

    await loginAs(owner.token)
    await page.goto(`/users/${owner.user.nickname}`)
    await expect(page.getByText(draft.name)).toBeVisible()

    // A separate browser context for the stranger: localStorage is per-context, so this is the
    // only way to hold two signed-in identities at once without one token overwriting the other.
    const stranger = await createTestUser(api)
    const strangerContext = await browser.newContext()
    const strangerPage = await strangerContext.newPage()
    await strangerPage.addInitScript((token) => {
      window.localStorage.setItem('coursemaker.token', token)
    }, stranger.token)

    await strangerPage.goto(`/users/${owner.user.nickname}`)
    await expect(strangerPage.getByText(draft.name)).toHaveCount(0)
    await strangerContext.close()
  })

  test('aba de trilhas mostra as trilhas publicadas do usuario', async ({ page, api }) => {
    const owner = await createTestUser(api)
    const trilha = await createTrilha(api, owner.token, { title: `Trilha do perfil ${Date.now()}` })
    await publishTrilha(api, owner.token, trilha.id)

    await page.goto(`/users/${owner.user.nickname}`)
    await page.getByRole('button', { name: 'Trilhas' }).click()
    await expect(page.getByText(trilha.title)).toBeVisible()
  })
})
