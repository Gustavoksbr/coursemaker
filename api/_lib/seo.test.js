// node --test api/_lib/seo.test.js
const test = require('node:test')
const assert = require('node:assert/strict')
const seo = require('./seo')

const owner = { nickname: 'ana', name: 'Ana <b>Souza</b>', image: 'https://img/x.png' }
const course = {
  id: '1', name: 'Curso "Legal"', slug: 'curso-legal', description: '<p>Aprenda <b>muito</b></p>\n\nrápido',
  thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/v1/foto.jpg', visibility: 'public',
  status: 'available', blockedByAdmin: false, owner, area: { name: 'Tecnologia' }, lessonCount: 3, updatedAt: '2026-10-01T10:00:00Z',
}

function stubFetch(routes) {
  const original = global.fetch
  global.fetch = async (url) => {
    const path = String(url).split('/api/v1')[1]
    const hit = Object.entries(routes).find(([prefix]) => path.startsWith(prefix))
    if (!hit) return { ok: false, status: 404, json: async () => ({}) }
    const value = hit[1]
    if (value === 'boom') throw new Error('network down')
    if (typeof value === 'number') return { ok: value < 400, status: value, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => value }
  }
  return () => { global.fetch = original }
}

test('escapeHtml neutraliza marcacao e aspas', () => {
  assert.equal(seo.escapeHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;')
})

test('plainText tira tags, junta espacos e corta na palavra', () => {
  assert.equal(seo.plainText('<p>Olá   <b>mundo</b></p>'), 'Olá mundo')
  const long = seo.plainText('palavra '.repeat(100), 50)
  assert.ok(long.length <= 51 && long.endsWith('…'))
})

test('previewImage recorta Cloudinary em 1200x630 e cai na imagem padrao', () => {
  assert.match(seo.previewImage(course.thumbnailUrl), /upload\/c_fill,w_1200,h_630,g_auto,f_auto,q_auto\/v1\/foto\.jpg$/)
  assert.equal(seo.previewImage('https://outro.site/a.png'), 'https://outro.site/a.png')
  assert.equal(seo.previewImage(null), seo.DEFAULT_IMAGE)
  assert.equal(seo.previewImage('http://inseguro/a.png'), seo.DEFAULT_IMAGE)
})

test('so conteudo publico, disponivel e nao bloqueado e indexavel', () => {
  assert.equal(seo.isIndexable(course), true)
  assert.equal(seo.isIndexable({ ...course, visibility: 'private' }), false)
  assert.equal(seo.isIndexable({ ...course, status: 'draft' }), false)
  assert.equal(seo.isIndexable({ ...course, blockedByAdmin: true }), false)
})

test('pagina de curso: tags, dados estruturados e nada de HTML cru dos dados', async () => {
  const restore = stubFetch({ '/courses/by-slug/ana/curso-legal': { summary: course, modules: [{ lessons: [{ title: 'Aula <1>' }] }] } })
  try {
    const page = await seo.buildPage('course', { nickname: 'ana', slug: 'curso-legal' })
    assert.equal(page.status, 200)
    assert.match(page.html, /<meta name="robots" content="index,follow">/)
    assert.match(page.html, /og:image" content="https:\/\/res\.cloudinary\.com\/demo\/image\/upload\/c_fill/)
    assert.match(page.html, /rel="canonical" href="https:\/\/coursemakerbr\.vercel\.app\/courses\/ana\/curso-legal"/)
    assert.ok(!page.html.includes('<b>Souza'), 'o HTML dos dados precisa sair escapado')
    assert.ok(page.html.includes('Aula &lt;1&gt;'))
    const ld = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(page.html)[1]
    assert.equal(JSON.parse(ld)['@type'], 'Course')
  } finally { restore() }
})

test('curso privado nao e indexado, mas tem prévia', async () => {
  const restore = stubFetch({ '/courses/by-slug/': { summary: { ...course, visibility: 'private' }, modules: [] } })
  try {
    const page = await seo.buildPage('course', { nickname: 'ana', slug: 'curso-legal' })
    assert.match(page.html, /content="noindex,nofollow"/)
    assert.match(page.html, /og:title/)
  } finally { restore() }
})

test('conteudo inexistente responde 404 de verdade; API fora do ar responde generico com cache curto', async () => {
  let restore = stubFetch({})
  try {
    const missing = await seo.buildPage('course', { nickname: 'ana', slug: 'nada' })
    assert.equal(missing.status, 404)
    assert.ok(!missing.html.includes('rel="canonical"'))
  } finally { restore() }

  restore = stubFetch({ '/courses/by-slug/': 'boom' })
  try {
    const down = await seo.buildPage('course', { nickname: 'ana', slug: 'curso-legal' })
    assert.equal(down.status, 200)
    assert.equal(down.cache, 'public, s-maxage=60')
    assert.match(down.html, /<title>CourseMaker<\/title>/)
  } finally { restore() }
})

test('segmentos fora do padrao nem chegam na API', async () => {
  let called = false
  const original = global.fetch
  global.fetch = async () => { called = true; return { ok: true, status: 200, json: async () => ({}) } }
  try {
    for (const bad of ['../etc', 'a/b', 'a?x=1', '', '-x']) {
      const page = await seo.buildPage('course', { nickname: bad, slug: 'ok' })
      assert.equal(page.status, 404)
    }
    assert.equal(called, false)
    assert.equal((await seo.buildPage('desconhecido', {})).status, 404)
  } finally { global.fetch = original }
})

test('sitemap lista so conteudo publico e os autores', async () => {
  const page = (items) => ({ items, hasNext: false })
  const restore = stubFetch({
    '/courses': page([course, { ...course, slug: 'privado', visibility: 'private' }, { ...course, slug: 'rascunho', status: 'draft' }]),
    '/posts': page([{ ...course, slug: 'post-1', title: 'P', owner: { nickname: 'bia', name: 'Bia' } }]),
    '/trilhas': page([]),
    '/schools': [{ slug: 'escola-x' }, { slug: '../ruim' }],
  })
  try {
    const xml = await seo.buildSitemap()
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])
    assert.ok(urls.includes('https://coursemakerbr.vercel.app/courses/ana/curso-legal'))
    assert.ok(urls.includes('https://coursemakerbr.vercel.app/posts/bia/post-1'))
    assert.ok(urls.includes('https://coursemakerbr.vercel.app/escolas/escola-x'))
    assert.ok(urls.includes('https://coursemakerbr.vercel.app/users/ana'))
    assert.ok(!urls.some((u) => u.includes('privado') || u.includes('rascunho') || u.includes('ruim')))
    assert.match(xml, /<lastmod>2026-10-01<\/lastmod>/)
  } finally { restore() }
})
