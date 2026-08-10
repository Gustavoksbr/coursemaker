import { test, expect } from './support/fixtures'
import { apiUrl, createTestUser, uniqueEmail } from './support/api'

test.describe('autenticacao', () => {
  test('registrar leva direto para a biblioteca; nickname so e cobrado ao criar conteudo', async ({
    page,
  }) => {
    // Registering does not force the nickname step: it only blocks *creating* something (see
    // useNicknameGate), so a fresh account can browse its own empty library right away.
    const email = uniqueEmail('register-ui')

    await page.goto('/register')
    await page.locator('#name').fill('Usuario Novo')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill('SenhaForte123')
    await page.locator('#confirm').fill('SenhaForte123')
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page).toHaveURL(/\/biblioteca$/)
    await expect(page.getByRole('heading', { name: 'Sua biblioteca' })).toBeVisible()

    // Trying to create a course is where the nickname gate actually kicks in.
    await page.goto('/cursos')
    await page.getByRole('button', { name: 'Criar curso' }).click()
    const gate = page.getByRole('dialog')
    await expect(gate.getByText('Escolha seu nickname')).toBeVisible()

    const nickname = `novo${Date.now()}`
    await gate.locator('#nickname').fill(nickname)
    await gate.getByRole('button', { name: 'Continuar e criar' }).click()

    // The gate closes and the original action (opening the create-course modal) resumes.
    await expect(gate.getByText('Escolha seu nickname')).toHaveCount(0)
    await expect(page.getByRole('dialog').locator('#course-name')).toBeVisible()
  })

  test('nao deixa registrar duas vezes com o mesmo email', async ({ page, api }) => {
    const { email, password } = await createTestUser(api)

    await page.goto('/register')
    await page.locator('#name').fill('Duplicado')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('#confirm').fill(password)
    await page.getByRole('button', { name: 'Criar conta' }).click()

    await expect(page.getByText(/ja existe uma conta/i)).toBeVisible()
    await expect(page).toHaveURL(/\/register$/)
  })

  test('login com senha errada mostra erro e nao entra', async ({ page, api }) => {
    const { email } = await createTestUser(api)

    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill('senha-completamente-errada')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.getByText(/nao foi possivel entrar|invalid|incorreta/i)).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('bloqueia login apos varias senhas erradas seguidas (rate limit)', async ({ page, api }) => {
    const { email } = await createTestUser(api)

    await page.goto('/login')
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.locator('#email').fill(email)
      await page.locator('#password').fill('senha-errada-' + attempt)
      await page.getByRole('button', { name: 'Entrar' }).click()
      // Wait for this attempt's request to resolve before firing the next one.
      // eslint-disable-next-line no-await-in-loop
      await expect(page.getByRole('button', { name: 'Entrar' })).toBeEnabled()
    }

    await page.locator('#email').fill(email)
    await page.locator('#password').fill('mais-uma-tentativa')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.getByText(/muitas tentativas/i)).toBeVisible()
  })

  test('nickname nao pode ser trocado depois de definido', async ({ api }) => {
    const { headers, user } = await createTestUser(api)

    const res = await api.patch(apiUrl(`/users/${user.id}`), {
      data: { nickname: `outro${Date.now()}` },
      headers,
    })

    expect(res.status()).toBe(409)
  })
})
