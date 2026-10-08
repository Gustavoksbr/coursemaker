import { test, expect } from './support/fixtures'
import { apiUrl, createTestUser, uniqueEmail } from './support/api'

/** Opens the sign-in dialog from the navbar (there are no login/register pages). */
async function openAuthDialog(page, buttonName) {
  await page.getByRole('banner').getByRole('button', { name: buttonName }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

test.describe('autenticacao', () => {
  test('registrar pelo modal mantem o usuario na mesma pagina; nickname so e cobrado ao criar conteudo', async ({
    page,
  }) => {
    // Sign-up is a dialog over whatever page the user is on, so nothing navigates. It does not force
    // the nickname step either: that only blocks *creating* something (see useNicknameGate).
    const email = uniqueEmail('register-ui')

    await page.goto('/pesquisar')
    await openAuthDialog(page, 'Criar conta')
    const dialog = page.getByRole('dialog')
    await dialog.locator('#auth-name').fill('Usuario Novo')
    await dialog.locator('#auth-email').fill(email)
    await dialog.locator('#auth-register-password').fill('SenhaForte123')
    await dialog.locator('#auth-confirm').fill('SenhaForte123')
    await dialog.getByRole('button', { name: 'Criar conta' }).click()

    await expect(dialog).toHaveCount(0)
    await expect(page).toHaveURL(/\/pesquisar$/)

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

    await page.goto('/')
    await openAuthDialog(page, 'Criar conta')
    const dialog = page.getByRole('dialog')
    await dialog.locator('#auth-name').fill('Duplicado')
    await dialog.locator('#auth-email').fill(email)
    await dialog.locator('#auth-register-password').fill(password)
    await dialog.locator('#auth-confirm').fill(password)
    await dialog.getByRole('button', { name: 'Criar conta' }).click()

    await expect(dialog.getByText(/ja existe uma conta/i)).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
  })

  test('login com senha errada mostra erro e nao entra', async ({ page, api }) => {
    const { email } = await createTestUser(api)

    await page.goto('/pesquisar')
    await openAuthDialog(page, 'Entrar')
    const dialog = page.getByRole('dialog')
    await dialog.locator('#auth-identifier').fill(email)
    await dialog.locator('#auth-password').fill('senha-completamente-errada')
    await dialog.getByRole('button', { name: 'Entrar' }).click()

    // Every failure says how many tries are left before the block.
    await expect(dialog.getByText(/credenciais invalidas/i).first()).toBeVisible()
    await expect(dialog.getByText(/restam \d+ tentativas?/i)).toBeVisible()
    await expect(page).toHaveURL(/\/pesquisar$/)
  })

  test('bloqueia login apos varias senhas erradas seguidas (rate limit)', async ({ page, api }) => {
    const { email } = await createTestUser(api)

    await page.goto('/pesquisar')
    await openAuthDialog(page, 'Entrar')
    const dialog = page.getByRole('dialog')
    // The e2e profile pins the login limit to 5 attempts (see application-e2e.properties).
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await dialog.locator('#auth-identifier').fill(email)
      await dialog.locator('#auth-password').fill('senha-errada-' + attempt)
      await dialog.getByRole('button', { name: 'Entrar' }).click()
      // Wait for this attempt's request to resolve before firing the next one.
      // eslint-disable-next-line no-await-in-loop
      await expect(dialog.getByRole('alert')).toBeVisible()
    }

    // The 5th failure reports the block itself, with a countdown, and the button locks.
    await expect(dialog.getByText(/login bloqueado, tente novamente em/i)).toBeVisible()
    await expect(dialog.getByRole('button', { name: /aguarde \d+ s/i })).toBeDisabled()
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
