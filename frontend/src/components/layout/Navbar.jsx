import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Bell,
  Bookmark,
  CheckCheck,
  GraduationCap,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PenSquare,
  Plus,
  Search,
  Shield,
  User as UserIcon,
  UserPlus,
  Waypoints,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useMessaging } from '@/context/MessagingContext'
import { useNotifications } from '@/context/NotificationContext'
import { Avatar } from '@/components/ui/Avatar'
import { Spinner } from '@/components/ui/Feedback'
import { NicknameGateModal } from '@/components/auth/NicknameGateModal'
import { CreateContentModal } from '@/components/shared/CreateContentModal'
import { CreateCourseModal } from '@/components/course/CreateCourseModal'
import { CreateTrilhaModal } from '@/components/trilha/CreateTrilhaModal'
import { useNicknameGate } from '@/hooks/useNicknameGate'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/format'

const NOTIFICATION_ICON = {
  enrollment: UserPlus,
  trilha_follow: Waypoints,
  comment: MessageSquare,
}

const NOTIFICATION_TEXT = {
  enrollment: 'se matriculou em',
  trilha_follow: 'comecou a seguir',
  comment: 'comentou em',
}


export function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const { notifications, loading: notificationsLoading, unreadCount, markRead, markAllRead } = useNotifications()
  const { unreadCount: messagesUnreadCount } = useMessaging()
  const navigate = useNavigate()
  const { requireNickname, nicknameModalProps } = useNicknameGate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false)
  const [createCourseOpen, setCreateCourseOpen] = useState(false)
  const [createTrilhaOpen, setCreateTrilhaOpen] = useState(false)
  const menuRef = useRef(null)
  const notificationsRef = useRef(null)

  // A link to a page you cannot open (it is behind auth) is just confusing, so Biblioteca only
  // shows up once there is a library to look at.
  const navLinks = [
    { to: '/pesquisar', label: 'Procurar', icon: Search },
    ...(isAuthenticated ? [{ to: '/biblioteca', label: 'Biblioteca', icon: Bookmark }] : []),
  ]

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

  const handleChoose = (type) => {
    setCreateChoiceOpen(false)
    requireNickname(() => {
      if (type === 'course') setCreateCourseOpen(true)
      else if (type === 'trilha') setCreateTrilhaOpen(true)
      else navigate('/posts/new')
    })
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
              <button
                type="button"
                className="btn-primary px-3 py-1.5 text-sm"
                onClick={() => setCreateChoiceOpen(true)}
              >
                <Plus size={16} /> <span className="hidden sm:inline">Criar</span>
              </button>

              <Link
                to="/mensagens"
                className="btn-ghost relative px-2"
                aria-label="Mensagens"
                title="Mensagens"
              >
                <Mail size={18} />
                {messagesUnreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white">
                    {messagesUnreadCount > 9 ? '9+' : messagesUnreadCount}
                  </span>
                )}
              </Link>

              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  className="btn-ghost relative px-2"
                  aria-haspopup="menu"
                  aria-expanded={notificationsOpen}
                  aria-label="Notificacoes"
                  title="Notificacoes"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-80 animate-slide-up overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl"
                  >
                    <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-100">Notificacoes</p>
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllRead()}
                          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-brand-400"
                        >
                          <CheckCheck size={13} /> Marcar tudo como lido
                        </button>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="flex justify-center py-6">
                          <Spinner />
                        </div>
                      ) : notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-slate-500">
                          Sua caixa de mensagens esta vazia.
                        </p>
                      ) : (
                        <ul>
                          {notifications.map((notification) => {
                            const Icon = NOTIFICATION_ICON[notification.type] ?? Bell
                            return (
                              <li key={notification.id}>
                                <Link
                                  to={notification.entityLink}
                                  role="menuitem"
                                  onClick={() => {
                                    if (!notification.read) markRead(notification.id)
                                    setNotificationsOpen(false)
                                  }}
                                  className={cn(
                                    'flex items-start gap-3 border-b border-slate-700/60 px-4 py-3 text-sm hover:bg-slate-700/50',
                                    !notification.read && 'bg-brand-500/5',
                                  )}
                                >
                                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-700 text-brand-400">
                                    <Icon size={15} />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-slate-200">
                                      <span className="font-semibold">{notification.actor.name}</span>{' '}
                                      {NOTIFICATION_TEXT[notification.type]}{' '}
                                      <span className="font-medium text-slate-300">{notification.entityTitle}</span>
                                    </span>
                                    <time dateTime={notification.createdAt} className="mt-0.5 block text-xs text-slate-500">
                                      {formatRelative(notification.createdAt)}
                                    </time>
                                  </span>
                                  {!notification.read && (
                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                                  )}
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
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
                    {isAdmin && (
                      <Link
                        to="/admin/areas"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700"
                      >
                        <Shield size={15} /> Gerenciar areas
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        to="/admin/schools"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700"
                      >
                        <Shield size={15} /> Gerenciar escolas
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        to="/admin/home"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700"
                      >
                        <Shield size={15} /> Personalizar home
                      </Link>
                    )}
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

      <CreateContentModal
        open={createChoiceOpen}
        onClose={() => setCreateChoiceOpen(false)}
        onChoose={handleChoose}
      />
      <CreateCourseModal open={createCourseOpen} onClose={() => setCreateCourseOpen(false)} />
      <CreateTrilhaModal open={createTrilhaOpen} onClose={() => setCreateTrilhaOpen(false)} />
      <NicknameGateModal {...nicknameModalProps} />
    </header>
  )
}
