// Logica da pagina que os robos (WhatsApp, Discord, LinkedIn, Google...) recebem no lugar da SPA, e do
// sitemap. Fica em _lib para a Vercel nao tratar o arquivo como uma funcao propria.
//
// O site e uma SPA: sem JavaScript todas as URLs devolvem o mesmo index.html, entao sem isto todo curso
// compartilhado aparece como "CourseMaker" generico. Aqui buscamos o conteudo na API e montamos so o HTML
// com as tags certas.

const SITE_URL = (process.env.SITE_URL || 'https://coursemakerbr.vercel.app').replace(/\/+$/, '')
const API_URL = (process.env.API_URL || process.env.VITE_API_URL || 'https://coursemaker-rawh.onrender.com').replace(/\/+$/, '')
const SITE_NAME = 'CourseMaker'
const DEFAULT_IMAGE = `${SITE_URL}/og-default.png`
const DEFAULT_DESCRIPTION = 'CourseMaker — aprenda ou ensine o que quiser. Matricule-se ou crie seu próprio curso.'
const API_TIMEOUT_MS = 8000

/** Apelidos e slugs so tem letras minusculas, numeros e hifen: qualquer outra coisa nem vai para a API. */
const SAFE_SEGMENT = /^[a-z0-9][a-z0-9-]*$/i

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/** Tira marcacao e espacos repetidos e corta na palavra, para caber numa descricao de prévia. */
function plainText(value, max = 200) {
  const text = String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_`>~\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 40))}…`
}

/**
 * Miniatura em 1200x630 (proporcao dos cartoes de prévia). Imagens do Cloudinary sao recortadas na hora;
 * qualquer outra URL vai como esta, e sem miniatura vai a imagem padrao.
 */
function previewImage(url) {
  if (!url || !/^https:\/\//i.test(url)) return DEFAULT_IMAGE
  const cloudinary = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/i.exec(url)
  if (cloudinary && !/\bw_1200\b/.test(cloudinary[2])) {
    return `${cloudinary[1]}c_fill,w_1200,h_630,g_auto,f_auto,q_auto/${cloudinary[2]}`
  }
  return url
}

const isoDate = (value) => (value ? String(value).slice(0, 10) : undefined)

/** Conteudo que pode ir para o Google: publico, disponivel e nao bloqueado por um administrador. */
function isIndexable(item) {
  return item?.visibility === 'public' && item?.status === 'available' && !item?.blockedByAdmin
}

async function fetchJson(path) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const response = await fetch(`${API_URL}/api/v1${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (response.status === 404) return { notFound: true }
    if (!response.ok) return { error: true }
    return { data: await response.json() }
  } catch {
    return { error: true }
  } finally {
    clearTimeout(timer)
  }
}

const jsonLd = (data) => JSON.stringify(data).replace(/</g, '\\u003c')

/** Monta as tags da pagina (titulo, descricao, imagem, canonical, dados estruturados) para um tipo de conteudo. */
function describe(kind, payload, params) {
  const person = (owner) => (owner ? { '@type': 'Person', name: owner.name, url: `${SITE_URL}/users/${owner.nickname}` } : undefined)

  if (kind === 'course') {
    const course = payload.summary
    const url = `${SITE_URL}/courses/${course.owner.nickname}/${course.slug}`
    const description = plainText(
      course.description || payload.landingDescription
        || `Curso de ${course.area?.name ?? 'tecnologia'} por ${course.owner.name}, com ${course.lessonCount ?? 0} aulas.`,
    )
    const lessons = (payload.modules || []).flatMap((module) => (module.lessons || []).map((lesson) => lesson.title))
    return {
      title: `${course.name} — curso de ${course.owner.name} | ${SITE_NAME}`,
      description, url, image: previewImage(course.thumbnailUrl), type: 'website',
      indexable: isIndexable(course), lessons,
      structured: {
        '@context': 'https://schema.org', '@type': 'Course', name: course.name, description, url,
        image: previewImage(course.thumbnailUrl), inLanguage: 'pt-BR', author: person(course.owner),
        provider: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        dateModified: course.updatedAt,
      },
    }
  }

  if (kind === 'post') {
    const post = payload.summary || payload
    const owner = post.owner
    const url = `${SITE_URL}/posts/${owner.nickname}/${post.slug}`
    const description = plainText(post.description || `Artigo de ${owner.name} no ${SITE_NAME}.`)
    return {
      title: `${post.title} — ${owner.name} | ${SITE_NAME}`,
      description, url, image: previewImage(post.thumbnailUrl), type: 'article',
      indexable: isIndexable(post), lessons: [],
      structured: {
        '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description, url,
        image: previewImage(post.thumbnailUrl), inLanguage: 'pt-BR', author: person(owner),
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        datePublished: post.createdAt, dateModified: post.updatedAt,
      },
    }
  }

  if (kind === 'trilha') {
    const trilha = payload.summary || payload
    const owner = trilha.owner
    const url = `${SITE_URL}/trilhas/${owner.nickname}/${trilha.slug}`
    const description = plainText(trilha.description || `Trilha de aprendizado de ${owner.name} no ${SITE_NAME}.`)
    return {
      title: `${trilha.title} — trilha de ${owner.name} | ${SITE_NAME}`,
      description, url, image: previewImage(trilha.thumbnailUrl), type: 'website',
      indexable: isIndexable(trilha), lessons: [],
      structured: {
        '@context': 'https://schema.org', '@type': 'Course', name: trilha.title, description, url,
        image: previewImage(trilha.thumbnailUrl), inLanguage: 'pt-BR', author: person(owner),
        provider: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      },
    }
  }

  if (kind === 'school') {
    const school = payload
    const url = `${SITE_URL}/escolas/${school.slug}`
    const description = plainText(school.description || `Escola ${school.name} no ${SITE_NAME}.`)
    return {
      title: `${school.name} | ${SITE_NAME}`, description, url, image: previewImage(school.logoUrl),
      type: 'website', indexable: true, lessons: [],
      structured: { '@context': 'https://schema.org', '@type': 'EducationalOrganization', name: school.name, description, url, logo: previewImage(school.logoUrl) },
    }
  }

  // user
  const user = payload
  const url = `${SITE_URL}/users/${user.nickname}`
  const description = plainText(user.bio || `Perfil de ${user.name} no ${SITE_NAME}: cursos, trilhas e posts publicados.`)
  return {
    title: `${user.name} (@${user.nickname}) | ${SITE_NAME}`, description, url, image: previewImage(user.image),
    type: 'profile', indexable: !user.deleted, lessons: [],
    structured: { '@context': 'https://schema.org', '@type': 'ProfilePage', mainEntity: { '@type': 'Person', name: user.name, url, image: user.image } },
  }
}

const ENDPOINTS = {
  course: ({ nickname, slug }) => `/courses/by-slug/${nickname}/${slug}`,
  post: ({ nickname, slug }) => `/posts/by-slug/${nickname}/${slug}`,
  trilha: ({ nickname, slug }) => `/trilhas/by-slug/${nickname}/${slug}`,
  school: ({ slug }) => `/schools/${slug}`,
  user: ({ nickname }) => `/users/${nickname}`,
}

function renderHtml(meta, { status = 200 } = {}) {
  const robots = meta.indexable && status === 200 ? 'index,follow' : 'noindex,nofollow'
  const lessons = meta.lessons?.length
    ? `<h2>Conteúdo</h2><ul>${meta.lessons.map((title) => `<li>${escapeHtml(title)}</li>`).join('')}</ul>`
    : ''
  const structured = meta.structured ? `<script type="application/ld+json">${jsonLd(meta.structured)}</script>` : ''

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="${escapeHtml(meta.description)}">
<meta name="robots" content="${robots}">
${status === 200 ? `<link rel="canonical" href="${escapeHtml(meta.url)}">` : ''}
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="pt_BR">
<meta property="og:type" content="${meta.type}">
<meta property="og:title" content="${escapeHtml(meta.title)}">
<meta property="og:description" content="${escapeHtml(meta.description)}">
<meta property="og:url" content="${escapeHtml(meta.url)}">
<meta property="og:image" content="${escapeHtml(meta.image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(meta.title)}">
<meta name="twitter:description" content="${escapeHtml(meta.description)}">
<meta name="twitter:image" content="${escapeHtml(meta.image)}">
${structured}
</head>
<body>
<h1>${escapeHtml(meta.title)}</h1>
<p>${escapeHtml(meta.description)}</p>
${lessons}
<p><a href="${escapeHtml(meta.url)}">Abrir no ${SITE_NAME}</a></p>
</body>
</html>`
}

const GENERIC_META = {
  title: SITE_NAME, description: DEFAULT_DESCRIPTION, url: `${SITE_URL}/`, image: DEFAULT_IMAGE,
  type: 'website', indexable: false, lessons: [],
}

/**
 * Resposta para uma pagina de conteudo: { status, html, cache }.
 * - conteudo inexistente: 404 de verdade (a SPA sempre responderia 200);
 * - API fora do ar: tags genericas com cache curto, para o robo nao guardar um cartao vazio por muito tempo.
 */
async function buildPage(kind, params) {
  const valid = Object.values(params).every((segment) => typeof segment === 'string' && SAFE_SEGMENT.test(segment))
  if (!ENDPOINTS[kind] || !valid) {
    return { status: 404, html: renderHtml({ ...GENERIC_META, title: `Página não encontrada | ${SITE_NAME}` }, { status: 404 }), cache: 'public, s-maxage=300' }
  }

  const result = await fetchJson(ENDPOINTS[kind](params))
  if (result.notFound) {
    return { status: 404, html: renderHtml({ ...GENERIC_META, title: `Página não encontrada | ${SITE_NAME}` }, { status: 404 }), cache: 'public, s-maxage=300' }
  }
  if (result.error) {
    return { status: 200, html: renderHtml(GENERIC_META), cache: 'public, s-maxage=60' }
  }

  let meta
  try {
    meta = describe(kind, result.data, params)
  } catch {
    return { status: 200, html: renderHtml(GENERIC_META), cache: 'public, s-maxage=60' }
  }
  return { status: 200, html: renderHtml(meta), cache: 'public, s-maxage=3600, stale-while-revalidate=86400' }
}

// ----------------------------------------------------------------------------------------- sitemap

async function fetchAllPages(path, maxPages = 40) {
  const items = []
  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchJson(`${path}${path.includes('?') ? '&' : '?'}size=50&page=${page}`)
    if (!result.data) break
    const batch = Array.isArray(result.data) ? result.data : result.data.items || []
    items.push(...batch)
    if (Array.isArray(result.data) || !result.data.hasNext) break
  }
  return items
}

function sitemapXml(entries) {
  const urls = entries
    .map(({ loc, lastmod }) => `<url><loc>${escapeHtml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
}

/** Todas as paginas que valem a pena indexar: as fixas e o conteudo publico (cursos, posts, trilhas, escolas, autores). */
async function buildSitemap() {
  const [courses, posts, trilhas, schools] = await Promise.all([
    fetchAllPages('/courses'), fetchAllPages('/posts'), fetchAllPages('/trilhas'), fetchAllPages('/schools'),
  ])

  const entries = [
    { loc: `${SITE_URL}/` },
    { loc: `${SITE_URL}/pesquisar` },
    { loc: `${SITE_URL}/escolas` },
  ]
  const authors = new Map()

  const add = (kind, items, titleField) => {
    for (const item of items) {
      if (!isIndexable(item) || !item.owner?.nickname || !item.slug || !SAFE_SEGMENT.test(item.slug)) continue
      entries.push({ loc: `${SITE_URL}/${kind}/${item.owner.nickname}/${item.slug}`, lastmod: isoDate(item.updatedAt) })
      authors.set(item.owner.nickname, true)
    }
  }
  add('courses', courses)
  add('posts', posts)
  add('trilhas', trilhas)

  for (const school of schools) {
    if (school?.slug && SAFE_SEGMENT.test(school.slug)) entries.push({ loc: `${SITE_URL}/escolas/${school.slug}` })
  }
  for (const nickname of authors.keys()) {
    if (SAFE_SEGMENT.test(nickname)) entries.push({ loc: `${SITE_URL}/users/${nickname}` })
  }
  return sitemapXml(entries)
}

module.exports = {
  buildPage, buildSitemap, describe, renderHtml, previewImage, plainText, escapeHtml, isIndexable, sitemapXml,
  SITE_URL, DEFAULT_IMAGE,
}
