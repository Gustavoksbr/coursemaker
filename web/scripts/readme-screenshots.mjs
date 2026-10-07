/**
 * Gera as imagens de docs/screenshots (usadas no README) SEM backend e SEM banco: o Playwright intercepta toda
 * chamada a /api/v1 e responde com dados inventados (a padaria do Seu Zé, o professor Demo...). O que aparece nas
 * imagens é só o frontend renderizando esses dados.
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

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173'
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/screenshots')
fs.mkdirSync(OUT, { recursive: true })

// ----------------------------------------------------------------------------------------------- dados inventados

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const COURSE_ID = id(1)
const SLUG = 'oficina-de-logica-a-padaria-do-seu-ze'
const OWNER = { id: id(2), nickname: 'professor-demo', name: 'Professor Demo', image: null }
const STUDENT = {
  id: id(3), email: 'aluna@exemplo.com', nickname: 'aluna-demo', name: 'Aluna Demo', image: null, bio: null, stacks: [],
  role: 'user', needsNickname: false, createdAt: '2026-09-01T12:00:00Z',
}
const OWNER_USER = { ...STUDENT, id: OWNER.id, email: 'professor@exemplo.com', nickname: OWNER.nickname, name: OWNER.name }

const pyStarter = `# caixa.py - Padaria Pão Quente
# Preços sempre em centavos (um pão francês custa 50).

def preco_com_desconto(preco_unitario, quantidade):
    total = preco_unitario * quantidade
    if quantidade > 10:
        total = total * 90 // 100
    return total
`
const pySolution = `def preco_com_desconto(preco_unitario, quantidade):
    total = preco_unitario * quantidade
    if quantidade >= 10:
        total = total * 90 // 100
    return total
`
const rustStarter = `// tarifa.rs - cobrança do Estacionamento Central
// Valores em centavos.

fn valor_do_estacionamento(minutos: i32) -> i32 {
    if minutos <= 15 {
        return 0;
    }
    let horas = (minutos - 15) / 60;
    let valor = horas * 500;
    if valor > 4000 { 4000 } else { valor }
}
`
const goStarter = `// frete.go - cálculo de frete da Casa do Pedreiro
// Todos os valores em centavos.

func frete(pesoGramas int, expresso bool) int {
    valor := 0
    if pesoGramas < 500 {
        valor = 1500
    } else if pesoGramas < 2000 {
        valor = 2500
    } else {
        valor = 2500 + (pesoGramas-2000)/1000*500
    }
    if expresso {
        valor = valor * 2
    }
    return valor
}
`

const text = (n, parent, html) => ({ id: id(n), parentId: parent, type: 'text', content: html, language: null, order: 0 })
const scene = (title, story, file, rules) =>
  `<h3>${title}</h3><p>${story}</p><p>Arquivo: <code>${file}</code></p><ul>${rules.map((r) => `<li>${r}</li>`).join('')}</ul>` +
  '<p>Use <em>Executar exemplos</em> para testar com os casos visiveis e <em>Enviar solucao</em> para valer: alguns testes ficam escondidos e cobrem os casos de borda.</p>'

const EX = {
  py: { block: id(110), lesson: id(100), language: 'python' },
  rust: { block: id(120), lesson: id(101), language: 'rust' },
  go: { block: id(130), lesson: id(102), language: 'go' },
}

const publicContent = {
  py: {
    mode: 'function', title: 'Desconto por quantidade', functionName: 'preco_com_desconto', params: ['preco_unitario', 'quantidade'],
    starterCode: pyStarter, examples: [{ args: [50, 10], expected: 450 }, { args: [50, 9], expected: 450 }], hiddenCount: 5,
  },
  rust: {
    mode: 'function', title: 'Valor do estacionamento', functionName: 'valor_do_estacionamento', params: ['minutos'], paramTypes: ['int'],
    returnType: 'int', starterCode: rustStarter, examples: [{ args: [16], expected: 500 }, { args: [75], expected: 500 }], hiddenCount: 5,
  },
  go: {
    mode: 'function', title: 'Cálculo do frete', functionName: 'frete', params: ['pesoGramas', 'expresso'], paramTypes: ['int', 'boolean'],
    returnType: 'int', starterCode: goStarter, examples: [{ args: [500, false], expected: 1500 }, { args: [501, false], expected: 2500 }], hiddenCount: 6,
  },
}

const lessonsDef = [
  { id: id(90), title: 'Sobre este curso', blocks: [text(91, id(90), '<p>Bem-vindo! Cada aula tem um <strong>exercício de código</strong> corrigido automaticamente, com um trecho de sistema de verdade para você consertar.</p>')] },
  {
    id: EX.py.lesson, title: 'Desconto por quantidade',
    blocks: [
      text(111, EX.py.lesson, scene('O desconto não está pegando', 'O Seu Zé prometeu: <strong>quem leva 10 pães ou mais ganha 10% de desconto no total</strong>. Só que ontem um cliente levou exatamente 10 pães e pagou sem desconto.', 'caixa.py',
        ['A partir de 10 unidades (inclusive), o total ganha 10% de desconto.', 'O desconto é arredondado para baixo: o total final é um número inteiro de centavos.', 'Com menos de 10 unidades o preço é só preço × quantidade.'])),
      { id: EX.py.block, parentId: EX.py.lesson, type: 'code_exercise', content: JSON.stringify(publicContent.py), language: 'python', order: 1 },
    ],
  },
  {
    id: EX.rust.lesson, title: 'Tarifa do estacionamento',
    blocks: [
      text(121, EX.rust.lesson, scene('Uma hora e um minuto cobra só uma hora', 'Os clientes que passam alguns minutos da hora cheia não pagam a hora seguinte: a divisão de inteiros no Rust arredonda para baixo.', 'tarifa.rs',
        ['Os primeiros 15 minutos são grátis.', 'Depois disso, R$ 5,00 (500 centavos) por hora <strong>começada</strong>.', 'O valor máximo do dia é R$ 40,00 (4000 centavos).'])),
      { id: EX.rust.block, parentId: EX.rust.lesson, type: 'code_exercise', content: JSON.stringify(publicContent.rust), language: 'rust', order: 1 },
    ],
  },
  {
    id: EX.go.lesson, title: 'Cálculo de frete',
    blocks: [
      text(131, EX.go.lesson, scene('O frete cobra mais do que deveria', 'Clientes com pedidos de exatamente 500 g estão pagando a faixa de cima.', 'frete.go',
        ['Até 500 g (inclusive): R$ 15,00 (1500).', 'Acima de 2 kg: R$ 25,00 mais R$ 5,00 por <strong>quilo extra começado</strong>.'])),
      { id: EX.go.block, parentId: EX.go.lesson, type: 'code_exercise', content: JSON.stringify(publicContent.go), language: 'go', order: 1 },
    ],
  },
  { id: id(103), title: 'A etiqueta da vitrine', blocks: [] },
  { id: id(104), title: 'Fechamento do caixa', blocks: [] },
]

const state = {
  who: 'student',
  passed: [],
  progress: {},
  nextRun: null,
  nextSubmit: null,
  validate: null,
}

function courseDetail() {
  const lessons = lessonsDef.map((l, i) => ({
    id: l.id, moduleId: id(10 + (i === 0 ? 0 : 1)), title: l.title, order: i, completed: state.passed.includes(l.id), blocks: l.blocks,
  }))
  return {
    summary: {
      id: COURSE_ID, name: 'Oficina de Lógica: a padaria do Seu Zé', slug: SLUG,
      description: 'Pratique lógica de programação consertando o sistema de uma padaria: descontos, troco, etiquetas e fechamento de caixa.',
      thumbnailUrl: null, visibility: 'public', status: 'available', categories: ['logica', 'python', 'exercicios'], featured: false, blockedByAdmin: false,
      area: { id: id(4), name: 'Tecnologia', slug: 'tecnologia', allowsCodeExercises: true },
      school: null, owner: OWNER, likeCount: 12, enrollmentCount: 48, lessonCount: lessons.length, likedByMe: false,
      enrolledByMe: state.who === 'student', savedByMe: false, createdAt: '2026-09-10T12:00:00Z', updatedAt: '2026-09-20T12:00:00Z',
    },
    landingDescription: '<p>Seu Zé abriu a <strong>Padaria Pão Quente</strong> e o sistema do caixa está cheio de pequenos erros. Em cada aula você conserta um trecho de código de verdade.</p>',
    modules: [
      { id: id(10), courseId: COURSE_ID, title: 'Antes de começar', description: null, order: 0, lessons: [lessons[0]] },
      { id: id(11), courseId: COURSE_ID, title: 'Prática: o caixa da padaria', description: null, order: 1, lessons: lessons.slice(1) },
    ],
    isOwner: state.who === 'owner', canViewContent: true, requiresPassword: false, hasPassword: false,
    progress: { completedLessons: state.passed.length, totalLessons: lessons.length, percentage: Math.round((state.passed.length / lessons.length) * 100) },
    answeredQuestionBlockIds: [],
    passedExerciseBlockIds: Object.values(EX).filter((e) => state.passed.includes(e.lesson)).map((e) => e.block),
  }
}

const tests = {
  py: [
    { visible: true, args: [50, 10], expected: 450 }, { visible: true, args: [50, 9], expected: 450 },
    { visible: false, args: [200, 20], expected: 3600 }, { visible: false, args: [333, 10], expected: 2997 },
    { visible: false, args: [333, 11], expected: 3296 }, { visible: false, args: [100, 1], expected: 100 }, { visible: false, args: [70, 0], expected: 0 },
  ],
  go: [
    { visible: true, args: [500, false], expected: 1500 }, { visible: true, args: [501, false], expected: 2500 },
    { visible: false, args: [2000, false], expected: 2500 }, { visible: false, args: [2001, false], expected: 3000 },
    { visible: false, args: [3001, true], expected: 7000 }, { visible: false, args: [100, true], expected: 3000 }, { visible: false, args: [0, false], expected: 1500 },
  ],
}

const ownerSpec = (key) => {
  if (key === 'go') {
    return {
      language: 'go',
      exercise: { mode: 'function', title: 'Cálculo do frete', functionName: 'frete', params: ['pesoGramas', 'expresso'], paramTypes: ['int', 'boolean'], returnType: 'int',
        starterCode: goStarter, solutionCode: goStarter.replace('pesoGramas < 500', 'pesoGramas <= 500').replace('pesoGramas < 2000', 'pesoGramas <= 2000'), tests: tests.go },
    }
  }
  return {
    language: 'python',
    exercise: { mode: 'function', title: 'Desconto por quantidade', functionName: 'preco_com_desconto', params: ['preco_unitario', 'quantidade'], paramTypes: null, returnType: null,
      starterCode: pyStarter, solutionCode: pySolution, tests: tests.py },
  }
}

// ------------------------------------------------------------------------------------------- servidor de mentira

const CORS = {
  'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-type': 'application/json',
}
const emptyPage = { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true }

function answer(method, pathname, search, body) {
  let m
  if (method === 'GET' && pathname === '/auth/me') return state.who === 'owner' ? OWNER_USER : STUDENT
  if (method === 'GET' && (m = pathname.match(/^\/courses\/by-slug\//))) return courseDetail()
  if (method === 'GET' && pathname === '/areas') return [{ id: id(4), name: 'Tecnologia', slug: 'tecnologia', allowsCodeExercises: true }]
  if (method === 'GET' && pathname === '/code-exercises/languages') {
    const all = ['javascript', 'python', 'typescript', 'php', 'ruby', 'java', 'csharp', 'cpp', 'c', 'go', 'rust', 'kotlin']
    return { function: all, output: all }
  }
  if ((m = pathname.match(/^\/blocks\/([^/]+)\/exercise\/progress$/))) {
    const key = Object.keys(EX).find((k) => EX[k].block === m[1])
    return { blockId: m[1], passed: state.passed.includes(EX[key]?.lesson), failedSubmissions: 0, solutionAvailable: false, lastCode: state.progress[m[1]] ?? null }
  }
  if (method === 'POST' && /\/exercise\/run$/.test(pathname)) return state.nextRun
  if (method === 'POST' && /\/exercise\/submit$/.test(pathname)) return state.nextSubmit
  if ((m = pathname.match(/^\/blocks\/([^/]+)\/exercise\/spec$/))) return ownerSpec(m[1] === EX.go.block ? 'go' : 'py')
  if (method === 'POST' && /\/code-exercise\/validate$/.test(pathname)) return state.validate
  if ((m = pathname.match(/^\/lessons\/([^/]+)\/blocks$/))) return lessonsDef.find((l) => l.id === m[1])?.blocks ?? []
  if (/unread-count$/.test(pathname)) return { count: 0 }
  if (method !== 'GET') return {}
  if (/size=/.test(search)) return emptyPage
  return []
}

async function newPage(browser, who, viewport = { width: 1280, height: 1000 }) {
  state.who = who
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'pt-BR', colorScheme: 'dark' })
  await ctx.addInitScript(() => localStorage.setItem('coursemaker.token', 'token-de-mentira'))
  await ctx.route('**/api/v1/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    let body = null
    try { body = req.postDataJSON() } catch { /* sem corpo */ }
    const result = answer(req.method(), url.pathname.replace('/api/v1', ''), url.search, body)
    return route.fulfill({ status: 200, headers: CORS, body: JSON.stringify(result ?? {}) })
  })
  const page = await ctx.newPage()
  return { page, ctx }
}

const shot = async (page, name, options = {}) => {
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(OUT, name), ...options })
  console.log('ok', name)
}

// ------------------------------------------------------------------------------------------------ as telas

/** Rola até o elemento ficar no topo da janela (com uma folga para a barra de cima). */
const toTop = (locator, gap = 90) =>
  locator.evaluate((el, g) => {
    // O site rola suavemente; "instant" evita que a animação desfaça o ajuste.
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - g, behavior: 'instant' })
  }, gap)

const browser = await chromium.launch()
const lessonUrl = (lesson) => `${BASE}/courses/${OWNER.nickname}/${SLUG}?lesson=${lesson}`

// 1. aluna: exercício pendente (Python)
{
  const { page, ctx } = await newPage(browser, 'student')
  await page.goto(lessonUrl(EX.py.lesson))
  await page.getByText('Cálculo do frete', { exact: false }).count()
  await page.getByText('Exercicio de codigo').first().waitFor()
  await toTop(page.locator('.cm-editor').first(), 215)
  await shot(page, '01-aluno-exercicio.png')

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
  await shot(page, '02-aluno-exemplos-falhando.png')
  await ctx.close()
}

// 3. aluna: acertou tudo (com o código corrigido no editor)
{
  state.progress[EX.py.block] = pySolution
  const { page, ctx } = await newPage(browser, 'student')
  await page.goto(lessonUrl(EX.py.lesson))
  await page.getByText('Exercicio de codigo').first().waitFor()
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
  await shot(page, '03-aluno-acertou.png')
  await ctx.close()
  state.passed = []
  delete state.progress[EX.py.block]
}

// 4. aluna: erro de compilação em Rust, com a dica sobre a chamada de teste
{
  const { page, ctx } = await newPage(browser, 'student')
  await page.goto(lessonUrl(EX.rust.lesson))
  await page.getByText('Exercicio de codigo').first().waitFor()
  state.nextRun = {
    allPassed: false, passedCount: 0, total: 2, tests: [], stderr: '', output: '', timedOut: false,
    compileError: `error[E0425]: cannot find function \`valor_do_estacionamento\` in this scope\n  --> main.rs:69:16\n   |\n69 |   cm_run(0, || valor_do_estacionamento(16_i32));\n   |                ^^^^^^^^^^^^^^^^^^^^^^^ not found in this scope\n\nerror: aborting due to previous error\n\nDica: o erro acima esta na chamada de teste, nao no seu codigo.\nConfira se o nome e valor_do_estacionamento e se recebe (i32).`,
  }
  await page.getByRole('button', { name: 'Executar exemplos' }).click()
  await page.getByText('Resultado dos exemplos').waitFor()
  await toTop(page.locator('.cm-editor').first(), 215)
  await shot(page, '04-aluno-erro-de-compilacao.png')
  await ctx.close()
}

// 5. aluna: menu do curso, aba Atividades, com progresso
{
  state.passed = [EX.py.lesson, EX.rust.lesson]
  const { page, ctx } = await newPage(browser, 'student')
  await page.goto(lessonUrl(EX.go.lesson))
  const tab = page.locator('button', { hasText: 'Atividades' }).first()
  await tab.waitFor()
  await tab.click()
  await toTop(page.locator('.cm-editor').first(), 215)
  await shot(page, '05-aluno-atividades.png')
  await ctx.close()
  state.passed = []
}

// 6. aluna no celular
{
  const { page, ctx } = await newPage(browser, 'student', { width: 390, height: 844 })
  await page.goto(lessonUrl(EX.go.lesson))
  await page.getByText('Exercicio de codigo').first().waitFor()
  await toTop(page.locator('.cm-editor').first(), 215)
  await shot(page, '06-aluno-celular.png')
  await ctx.close()
}

// 7. dono: editor do exercício (Python)
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
  await shot(page, '07-dono-editor-do-exercicio.png')

  // 8. dono: "Testar solução" com um teste errado
  state.validate = {
    valid: false, passedCount: 6, total: 7, compileError: null, stderr: '', output: '', timedOut: false,
    results: [0, 1, 2, 3, 4, 5, 6].map((i) => (i === 3
      ? { index: 3, passed: false, actual: 2996, error: null }
      : { index: i, passed: true, actual: tests.py[i].expected, error: null })),
  }
  await page.getByRole('button', { name: 'Testar solucao' }).click()
  await page.getByText('Ou o valor esperado esta errado').waitFor()
  await toTop(page.getByRole('button', { name: 'Testar solucao' }), 520)
  await shot(page, '08-dono-testar-solucao.png')
  await ctx.close()
}

// 9. dono: exercício tipado (Go) com tipo por parâmetro
{
  const { page, ctx } = await newPage(browser, 'owner', { width: 1280, height: 960 })
  await openOwnerLesson(page, 'Cálculo de frete')
  await toTop(page.getByText('Titulo do exercicio'), 110)
  await shot(page, '09-dono-exercicio-tipado-go.png')
  await ctx.close()
}

await browser.close()
console.log('Imagens em', OUT)
