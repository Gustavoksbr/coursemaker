import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { canonicalUrl, DEFAULT_DESCRIPTION, DEFAULT_TITLE, pageTitle, plainDescription } from '@/lib/seo'

function metaTag(name) {
  let tag = document.head.querySelector(`meta[name="${name}"]`)
  const created = !tag
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', name)
    document.head.appendChild(tag)
  }
  return { tag, created }
}

/**
 * Titulo da aba, descricao e URL canonica da pagina atual (e "noindex" quando nao deve aparecer em buscas).
 * Nao desenha nada. Ao sair da pagina volta ao padrao do site, entao um componente novo sempre parte limpo.
 */
export function PageMeta({ title, description, noindex = false }) {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = pageTitle(title)

    const { tag: descriptionTag } = metaTag('description')
    descriptionTag.setAttribute('content', description ? plainDescription(description) : DEFAULT_DESCRIPTION)

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', canonicalUrl(pathname))

    let robots = null
    if (noindex) {
      robots = metaTag('robots').tag
      robots.setAttribute('content', 'noindex,nofollow')
    }

    return () => {
      document.title = DEFAULT_TITLE
      descriptionTag.setAttribute('content', DEFAULT_DESCRIPTION)
      canonical.remove()
      robots?.remove()
    }
  }, [title, description, noindex, pathname])

  return null
}

/** Titulos das paginas fixas; as de conteudo (curso, post...) usam <PageMeta> com os dados carregados. */
const STATIC_TITLES = {
  '/pesquisar': 'Procurar cursos, trilhas e posts',
  '/escolas': 'Escolas',
  '/privacidade': 'Política de Privacidade',
  '/biblioteca': 'Biblioteca',
  '/profile': 'Editar perfil',
  '/mensagens': 'Mensagens',
  '/setup-nickname': 'Escolha seu nickname',
  '/code-playground': 'Playground de código',
  '/admin/areas': 'Administração: áreas',
  '/admin/schools': 'Administração: escolas',
  '/admin/home': 'Administração: página inicial',
  '/admin/moderacao': 'Administração: moderação',
}

const PRIVATE_PATHS = new Set(['/biblioteca', '/profile', '/mensagens', '/setup-nickname', '/code-playground'])

/** Montado nos layouts: aplica o titulo das paginas fixas segundo a URL (as demais cuidam do proprio). */
export function RouteMeta() {
  const { pathname } = useLocation()
  const key = pathname.replace(/\/+$/, '') || '/'
  const title = STATIC_TITLES[key]
  if (!title) return null
  return <PageMeta title={title} noindex={PRIVATE_PATHS.has(key) || key.startsWith('/admin/')} />
}
