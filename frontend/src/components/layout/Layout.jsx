import { Link, Outlet } from 'react-router-dom'
import { AreaProvider } from '@/context/AreaContext'
import { Navbar } from './Navbar'

/** Shell for every page: navbar on top, routed content below, footer at the bottom. */
export function Layout() {
  return (
    <AreaProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-slate-800 py-6">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 text-center text-xs text-slate-500 sm:px-6">
            <p>CourseMaker — cursos, posts e trilhas feitos por desenvolvedores, para desenvolvedores.</p>
            <Link to="/privacidade" className="hover:text-slate-300 hover:underline">
              Politica de Privacidade
            </Link>
          </div>
        </footer>
      </div>
    </AreaProvider>
  )
}

/**
 * Shell without the footer, for pages that own the whole viewport (course editor, course viewer).
 */
export function FullHeightLayout() {
  return (
    <AreaProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </AreaProvider>
  )
}
