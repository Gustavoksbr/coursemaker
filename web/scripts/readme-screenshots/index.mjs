/**
 * Gera as imagens de docs/screenshots (usadas no README) SEM backend e SEM banco: o Playwright intercepta toda
 * chamada a /api/v1 e responde com dados inventados (ver data.mjs). O que aparece nas imagens é só o frontend
 * renderizando esses dados.
 *
 *   npm run dev                       # em outro terminal (porta 5173)
 *   npm run docs:screenshots          # grava em ../docs/screenshots
 *
 * O navegador do Playwright precisa estar instalado (npx playwright install chromium).
 */
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { answer, state } from './api.mjs'
import { COURSE_BY_N, EX, GIT_LESSON, OWNER, PY_SOLUTION, SLUG, TESTS, TRILHAS, POSTS, id } from './data.mjs'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173'
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/screenshots')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-type': 'application/json' }

async function newPage(browser, who, viewport = { width: 1280, height: 900 }) {
  state.who = who
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', colorScheme: 'dark', isMobile: viewport.width < 600, hasTouch: viewport.width < 600 })
  await ctx.addInitScript(() => localStorage.setItem('coursemaker.token', 'token-de-mentira'))
  await ctx.route('**/api/v1/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const result = answer(req.method(), url.pathname.replace('/api/v1', ''), url.search)
    return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify(result ?? {}) })
  })
  const page = await ctx.newPage()
  return { page, ctx }
}

const shot = async (page, name, options = {}) => {
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(OUT, name), ...options })
  console.log('ok', name)
}

/** Rola até o elemento ficar a `gap` px do topo. O site rola suavemente; "instant" evita que a animação desfaça o ajuste. */
const toTop = (locator, gap = 90) =>
  locator.evaluate((el, g) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - g, behavior: 'instant' }), gap)

const browser = await chromium.launch()
const lessonUrl = (lesson) => `${BASE}/courses/${OWNER.nickname}/${SLUG}?lesson=${lesson}`

// ============================================================================================== o site como um todo

// 01. início
{
  const { page, ctx } = await newPage(browser, 'student', { width: 1280, height: 1500 })
  await page.goto(`${BASE}/`)
  await page.getByText('Aprenda e ensine').first().waitFor()
  await page.getByText('Cursos em Tecnologia').first().waitFor().catch(() => {})
  await shot(page, '01-inicio.png')
  await ctx.close()
}

// 02. explorar / pesquisar
{
  const { page, ctx } = await newPage(browser, 'student', { width: 1280, height: 1250 })
  await page.goto(`${BASE}/pesquisar`)
  await page.getByText(COURSE_BY_N(2).name).first().waitFor()
  await shot(page, '02-explorar.png')
  await ctx.close()
}

// 03. página de um curso
{
  const { page, ctx } = await newPage(browser, 'student', { width: 1280, height: 1250 })
  await page.goto(`${BASE}/courses/${COURSE_BY_N(4).owner.nickname}/${COURSE_BY_N(4).slug}`)
  await page.getByText('Git e GitHub na Prática').first().waitFor()
  await shot(page, '03-curso.png')
  await ctx.close()
}

// 04. uma aula de leitura (texto + código com realce) e o menu das aulas
{
  const { page, ctx } = await newPage(browser, 'student', { width: 1280, height: 900 })
  await page.goto(`${BASE}/courses/${COURSE_BY_N(4).owner.nickname}/${COURSE_BY_N(4).slug}?lesson=${GIT_LESSON.modules[1].lessons[0].id}`)
  await page.getByText('Boa prática').first().waitFor()
  await shot(page, '04-aula.png')
  await ctx.close()
}

// 05. trilha
{
  const { page, ctx } = await newPage(browser, 'student', { width: 1280, height: 1100 })
  await page.goto(`${BASE}/trilhas/${TRILHAS[0].owner.nickname}/${TRILHAS[0].slug}`)
  await page.getByText('Sua primeira linguagem').first().waitFor()
  await toTop(page.getByText('Sequencia', { exact: true }), 95)
  await shot(page, '05-trilha.png')
  await ctx.close()
}

// 06. post
{
  const { page, ctx } = await newPage(browser, 'student', { width: 1280, height: 1100 })
  await page.goto(`${BASE}/posts/${POSTS[0].owner.nickname}/${POSTS[0].slug}`)
  await page.getByText('Entenda o problema com exemplos').first().waitFor()
  await toTop(page.getByText('Entenda o problema com exemplos').first(), 150)
  await shot(page, '06-post.png')
  await ctx.close()
}

// 07. biblioteca
{
  const { page, ctx } = await newPage(browser, 'student', { width: 1280, height: 1000 })
  await page.goto(`${BASE}/biblioteca`)
  await page.getByText('Sua biblioteca').first().waitFor()
  await shot(page, '07-biblioteca.png')
  await ctx.close()
}

// 08. perfil público
{
  const { page, ctx } = await newPage(browser, 'student', { width: 1280, height: 1000 })
  await page.goto(`${BASE}/users/professor-demo`)
  await page.getByText('Professor Demo').first().waitFor()
  await shot(page, '08-perfil.png')
  await ctx.close()
}

// 09. caixa de mensagens (modal): a conversa aberta
{
  const { page, ctx } = await newPage(browser, 'student', { width: 1280, height: 900 })
  await page.goto(`${BASE}/`)
  await page.getByRole('button', { name: 'Mensagens' }).click()
  await page.getByText('Parabéns! Seu código passou').first().waitFor()
  await page.getByText('Parabéns! Seu código passou').first().click()
  await page.getByText('Achei! Troquei por').waitFor()
  await shot(page, '09-mensagens.png')
  await ctx.close()
}

// 10. notificações
{
  const { page, ctx } = await newPage(browser, 'student', { width: 1280, height: 700 })
  await page.goto(`${BASE}/`)
  await page.getByRole('button', { name: /notifica/i }).first().click()
  await page.getByText(COURSE_BY_N(1).name).first().waitFor()
  await shot(page, '10-notificacoes.png')
  await ctx.close()
}

// 11. administração: áreas (com o interruptor de exercícios de código)
{
  const { page, ctx } = await newPage(browser, 'admin', { width: 1280, height: 640 })
  await page.goto(`${BASE}/admin/areas`)
  await page.getByText('Gerenciar areas').first().waitFor()
  await shot(page, '11-admin-areas.png')
  await ctx.close()
}

// 12. editor do curso (para quem cria): configurações, trilhas em destaque e currículo
{
  const { page, ctx } = await newPage(browser, 'owner', { width: 1280, height: 1250 })
  await page.goto(`${BASE}/courses/${OWNER.nickname}/${SLUG}/edit`)
  await page.getByText('CURRICULO', { exact: false }).first().waitFor()
  await page.getByText('Sobre este curso', { exact: true }).first().click()
  await page.waitForTimeout(800)
  await shot(page, '12-editor-do-curso.png')
  await ctx.close()
}

// 13. no celular: início e uma aula, lado a lado no README
{
  const { page, ctx } = await newPage(browser, 'student', { width: 390, height: 844 })
  await page.goto(`${BASE}/`)
  await page.getByText('Aprenda e ensine').first().waitFor()
  await shot(page, '13-celular-inicio.png')
  await page.goto(`${BASE}/courses/${COURSE_BY_N(4).owner.nickname}/${COURSE_BY_N(4).slug}?lesson=${GIT_LESSON.modules[1].lessons[0].id}`)
  await page.getByText('Boa prática').first().waitFor()
  await shot(page, '13-celular-aula.png')
  await ctx.close()
}

// ============================================================================================ exercícios de código

// 1. aluna: exercício pendente (Python)
{
  const { page, ctx } = await newPage(browser, 'student', { width: 1280, height: 1000 })
  await page.goto(lessonUrl(EX.py.lesson))
  await page.locator('.cm-editor').first().waitFor()
  await toTop(page.locator('.cm-editor').first(), 215)
  await shot(page, 'codigo-01-aluno-exercicio.png')

  // 2. exemplos executados: um falha
  state.nextRun = {
    allPassed: false, passedCount: 1, total: 2, compileError: null, stderr: '', output: '', timedOut: false,
    tests: [
      { index: 0, passed: false, args: [50, 10], input: null, expected: 450, actual: 500, error: null },
      { index: 1, passed: true, args: [50, 9], input: null, expected: 450, actual: 450, error: null },
    ],
  }
  await page.getByRole('button', { name: 'Executar exemplos' }).click()
  await page.getByText('Resultado dos exemplos').waitFor()
  await toTop(page.locator('.cm-editor').first(), 215)
  await shot(page, 'codigo-02-aluno-exemplos-falhando.png')
  await ctx.close()
}

// 3. aluna: acertou tudo (com o código corrigido no editor)
{
  state.lastCode[EX.py.block] = PY_SOLUTION
  const { page, ctx } = await newPage(browser, 'student', { width: 1280, height: 1000 })
  await page.goto(lessonUrl(EX.py.lesson))
  await page.locator('.cm-editor').first().waitFor()
  state.nextSubmit = {
    allPassed: true, passedCount: 7, total: 7, hiddenPassed: 5, hiddenTotal: 5, compileError: null, stderr: '', timedOut: false,
    exercisePassed: true, failedSubmissions: 0, solutionAvailable: false,
    visible: [
      { index: 0, passed: true, args: [50, 10], input: null, expected: 450, actual: 450, error: null },
      { index: 1, passed: true, args: [50, 9], input: null, expected: 450, actual: 450, error: null },
    ],
  }
  state.passed = [EX.py.lesson]
  await page.getByRole('button', { name: 'Enviar solucao' }).click()
  await page.getByText('Exercicio concluido', { exact: false }).first().waitFor({ timeout: 8000 }).catch(() => {})
  await toTop(page.locator('.cm-editor').first(), 215)
  await shot(page, 'codigo-03-aluno-acertou.png')
  await ctx.close()
  state.passed = []
  delete state.lastCode[EX.py.block]
}

// 4. aluna: erro de compilação em Rust, com a dica sobre a chamada de teste
{
  const { page, ctx } = await newPage(browser, 'student', { width: 1280, height: 1000 })
  await page.goto(lessonUrl(EX.rust.lesson))
  await page.locator('.cm-editor').first().waitFor()
  state.nextRun = {
    allPassed: false, passedCount: 0, total: 2, tests: [], stderr: '', output: '', timedOut: false,
    compileError: `error[E0425]: cannot find function \`valor_do_estacionamento\` in this scope\n  --> main.rs:69:16\n   |\n69 |   cm_run(0, || valor_do_estacionamento(16_i32));\n   |                ^^^^^^^^^^^^^^^^^^^^^^^ not found in this scope\n\nerror: aborting due to previous error\n\nDica: o erro acima esta na chamada de teste, nao no seu codigo.\nConfira se o nome e valor_do_estacionamento e se recebe (i32).`,
  }
  await page.getByRole('button', { name: 'Executar exemplos' }).click()
  await page.getByText('Resultado dos exemplos').waitFor()
  await toTop(page.locator('.cm-editor').first(), 215)
  await shot(page, 'codigo-04-aluno-erro-de-compilacao.png')
  await ctx.close()
}

// 5. aluna: aba Atividades, com progresso
{
  state.passed = [EX.py.lesson, EX.rust.lesson]
  const { page, ctx } = await newPage(browser, 'student', { width: 1280, height: 1000 })
  await page.goto(lessonUrl(EX.go.lesson))
  const tab = page.locator('button', { hasText: 'Atividades' }).first()
  await tab.waitFor()
  await tab.click()
  await toTop(page.locator('.cm-editor').first(), 215)
  await shot(page, 'codigo-05-aluno-atividades.png')
  await ctx.close()
  state.passed = []
}

// 6. dono do curso: editor do exercício (Python) e "Testar solução"
async function openOwnerLesson(page, lessonTitle) {
  await page.goto(`${BASE}/courses/${OWNER.nickname}/${SLUG}/edit`)
  await page.getByText('CURRICULO', { exact: false }).first().waitFor()
  await page.getByText(lessonTitle, { exact: true }).first().click()
  await page.getByText('Titulo do exercicio').waitFor()
}
{
  const { page, ctx } = await newPage(browser, 'owner', { width: 1280, height: 960 })
  await openOwnerLesson(page, 'Desconto por quantidade')
  await toTop(page.getByText('Titulo do exercicio'), 110)
  await shot(page, 'codigo-06-dono-editor-do-exercicio.png')

  state.validate = {
    valid: false, passedCount: 6, total: 7, compileError: null, stderr: '', output: '', timedOut: false,
    results: [0, 1, 2, 3, 4, 5, 6].map((i) => (i === 3 ? { index: 3, passed: false, actual: 2996, error: null } : { index: i, passed: true, actual: TESTS.py[i].expected, error: null })),
  }
  await page.getByRole('button', { name: 'Testar solucao' }).click()
  await page.getByText('Ou o valor esperado esta errado').waitFor()
  await toTop(page.getByRole('button', { name: 'Testar solucao' }), 520)
  await shot(page, 'codigo-07-dono-testar-solucao.png')
  await ctx.close()
}

// 7. dono do curso: exercício tipado (Go), com um tipo por parâmetro
{
  const { page, ctx } = await newPage(browser, 'owner', { width: 1280, height: 960 })
  await openOwnerLesson(page, 'Cálculo de frete')
  await toTop(page.getByText('Titulo do exercicio'), 110)
  await shot(page, 'codigo-08-dono-exercicio-tipado-go.png')
  await ctx.close()
}

await browser.close()
console.log('Imagens em', OUT)
