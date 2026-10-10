import { Link, Outlet } from 'react-router-dom'
import { Github } from 'lucide-react'
import { AreaProvider } from '@/context/AreaContext'
import { Navbar } from './Navbar'
import { MessagesModal } from '@/components/messages/MessagesModal'
import { AuthModal } from '@/components/auth/AuthModal'
import { RouteMeta } from './PageMeta'

const GITHUB_URL = 'https://github.com/Gustavoksbr/coursemaker'

/** Rodape do site: aparece em todas as paginas, inclusive nas que ocupam a tela toda (curso, editor, biblioteca). */
function SiteFooter() {
  return (
    <footer className="border-t border-line pb-12 pt-8 text-[13px] text-ink-3">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 sm:px-6">
        <span className="font-mono text-sm font-semibold text-ink">
          course<span className="text-brand-500">/</span>maker
        </span>
        <span>Conteúdo creditado aos canais de origem. Não é parceria oficial.</span>
        <nav className="flex items-center gap-5 sm:ml-auto">
          <Link to="/privacidade" className="hover:text-ink">
            Política de Privacidade
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-ink"
          >
            <Github size={13} /> GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}

/** Shell for every page: navbar on top, routed content below, footer at the bottom. */
export function Layout() {
  return (
    <AreaProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <MessagesModal />
        <AuthModal />
        <RouteMeta />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </AreaProvider>
  )
}

/**
 * Shell for pages that own the whole viewport (course editor, course viewer, library): the content
 * column grows to fill the screen and the footer follows it.
 */
export function FullHeightLayout() {
  return (
    <AreaProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <MessagesModal />
        <AuthModal />
        <RouteMeta />
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </AreaProvider>
  )
}
