// Titulo, descricao e URL canonica das paginas. Cursos, posts, trilhas, perfis e escolas tambem recebem
// tags proprias dos robos de previa pela funcao /api/seo (ver vercel.json); aqui e o que o navegador mostra
// (aba, historico, e o Google, que executa JavaScript).

export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://coursemakerbr.vercel.app').replace(/\/+$/, '')
export const SITE_NAME = 'CourseMaker'
export const DEFAULT_TITLE = 'CourseMaker — aprenda ou ensine o que quiser'
export const DEFAULT_DESCRIPTION =
  'CourseMaker — aprenda ou ensine o que quiser. Matricule-se ou crie seu próprio curso.'

/** "Curso X | CourseMaker"; sem titulo, o padrao do site. */
export function pageTitle(title) {
  const text = (title ?? '').trim()
  return text ? `${text} | ${SITE_NAME}` : DEFAULT_TITLE
}

/** Texto puro, em uma linha, cortado na palavra para caber numa descricao de busca (~160 caracteres). */
export function plainDescription(value, max = 160) {
  const text = String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_`>~[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return DEFAULT_DESCRIPTION
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 40))}…`
}

/** URL canonica de uma rota: dominio fixo do site, sem query, hash nem barra final. */
export function canonicalUrl(pathname) {
  const path = (pathname || '/').replace(/\/+$/, '')
  // /inicio is the home page again, for people who are signed in (where `/` leads to the library): the
  // address search engines should know it by stays `/`.
  return `${SITE_URL}${path === '/inicio' ? '/' : path || '/'}`
}
