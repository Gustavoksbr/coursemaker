import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Bell, BookOpen, Bookmark, GraduationCap, LogOut, Menu, PenSquare, User as UserIcon, Waypoints, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'

const NAV_LINKS = [
  { to: '/cursos', label: 'Cursos', icon: GraduationCap },
  { to: '/posts', label: 'Posts', icon: BookOpen },
  { to: '/trilhas', label: 'Trilhas', icon: Waypoints },
]

const LIBRARY_LINK = { to: '/biblioteca', label: 'Biblioteca', icon: Bookmark }

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef(null)
  const notificationsRef = useRef(null)

  // A link to a page you cannot open (it is behind auth) is just confusing, so it only shows up
  // once there is a library to look at.
  const navLinks = isAuthenticated ? [...NAV_LINKS, LIBRARY_LINK] : NAV_LINKS

  useEffect(() => {
    if (!menuOpen) return undefined
    const onClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  useEffect(() => {
    if (!notificationsOpen) return undefined
    const onClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [notificationsOpen])

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/')
  }

  const linkClass = ({ isActive }) =>
    cn(
      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-slate-800 text-brand-400' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100',
    )

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-bold text-slate-100">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white">
            <GraduationCap size={18} />
          </span>
          <span className="hidden sm:inline">CourseMaker</span>
        </Link>

        <div className="hidden flex-1 items-center gap-1 md:flex">
          {navLinks.map(({ to, label }) => (
            <NavLink key={to} to={to} className={linkClass}>
              {label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  className="btn-ghost px-2"
                  aria-haspopup="menu"
                  aria-expanded={notificationsOpen}
                  aria-label="Notificacoes"
                  title="Notificacoes"
                >
                  <Bell size={18} />
                </button>

                {notificationsOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-72 animate-slide-up overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl"
                  >
                    <div className="border-b border-slate-700 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-100">Notificacoes</p>
                    </div>
                    <p className="px-4 py-6 text-center text-sm text-slate-500">
                      Sua caixa de mensagens esta vazia.
                    </p>
                  </div>
                )}
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-slate-700"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Menu do usuario"
                >
                  <Avatar src={user.image} name={user.name} />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 animate-slide-up overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl"
                  >
                    <div className="border-b border-slate-700 px-4 py-3">
                      <p className="truncate text-sm font-semibold text-slate-100">{user.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {user.nickname ? `@${user.nickname}` : user.email}
                      </p>
                    </div>
                    {user.nickname && (
                      <Link
                        to={`/users/${user.nickname}`}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700"
                      >
                        <UserIcon size={15} /> Meu perfil
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700"
                    >
                      <PenSquare size={15} /> Editar perfil
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 border-t border-slate-700 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-slate-700"
                    >
                      <LogOut size={15} /> Sair
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Entrar
              </Link>
              <Link to="/register" className="btn-primary">
                Criar conta
              </Link>
            </>
          )}

          <button
            type="button"
            className="btn-ghost px-2 md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Abrir navegacao"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-slate-800 px-4 py-2 md:hidden">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  )
}
