import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

/** Shell for every page: navbar on top, routed content below, footer at the bottom. */
export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800 py-6">
        <p className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-500 sm:px-6">
          CourseMaker — cursos e posts feitos por desenvolvedores, para desenvolvedores.
        </p>
      </footer>
    </div>
  )
}

/**
 * Shell without the footer, for pages that own the whole viewport (course editor, course viewer).
 */
export function FullHeightLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
