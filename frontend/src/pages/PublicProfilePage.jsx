import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, CalendarDays, GraduationCap, Waypoints } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { CourseCard } from '@/components/course/CourseCard'
import { PostCard } from '@/components/post/PostCard'
import { TrilhaCard } from '@/components/trilha/TrilhaCard'
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback'
import { useAuth } from '@/context/AuthContext'
import { getPublicProfile, userKeys } from '@/api/users'
import { errorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'

export default function PublicProfilePage() {
  const { nickname } = useParams()
  const { user } = useAuth()
  const [tab, setTab] = useState('courses')

  const { data: profile, isPending, isError, error, refetch } = useQuery({
    queryKey: userKeys.profile(nickname),
    queryFn: () => getPublicProfile(nickname),
  })

  if (isPending) return <PageLoader label="Carregando perfil..." />

  if (isError) {
    return (
      <ErrorState
        title="Perfil nao encontrado"
        message={errorMessage(error, `Nao existe um usuario com o nickname "${nickname}".`)}
        onRetry={refetch}
      />
    )
  }

  const isMe = user?.id === profile.id
  const items = tab === 'courses' ? profile.courses : tab === 'posts' ? profile.posts : profile.trilhas

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <Avatar src={profile.image} name={profile.name} size="xl" />

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-100">{profile.name}</h1>
          <p className="text-sm text-brand-400">@{profile.nickname}</p>

          {profile.bio && (
            <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm text-slate-300">{profile.bio}</p>
          )}

          {profile.stacks?.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {profile.stacks.map((stack) => (
                <span key={stack} className="badge bg-brand-500/15 text-brand-300">
                  {stack}
                </span>
              ))}
            </div>
          )}

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500 sm:justify-start">
            <CalendarDays size={13} /> No CourseMaker desde {formatDate(profile.createdAt)}
          </p>
        </div>

        {isMe && (
          <Link to="/profile" className="btn-secondary shrink-0">
            Editar perfil
          </Link>
        )}
      </header>

      <div className="border-b border-slate-800">
        <div className="flex gap-1">
          <Tab
            active={tab === 'courses'}
            onClick={() => setTab('courses')}
            icon={GraduationCap}
            label="Cursos"
            count={profile.courses.length}
          />
          <Tab
            active={tab === 'posts'}
            onClick={() => setTab('posts')}
            icon={BookOpen}
            label="Posts"
            count={profile.posts.length}
          />
          <Tab
            active={tab === 'trilhas'}
            onClick={() => setTab('trilhas')}
            icon={Waypoints}
            label="Trilhas"
            count={profile.trilhas.length}
          />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={tab === 'courses' ? GraduationCap : tab === 'posts' ? BookOpen : Waypoints}
          title={
            tab === 'courses' ? 'Nenhum curso ainda' : tab === 'posts' ? 'Nenhum post ainda' : 'Nenhuma trilha ainda'
          }
          message={
            isMe
              ? 'O que voce publicar vai aparecer aqui.'
              : `${profile.name} ainda nao publicou nada por aqui.`
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tab === 'courses'
            ? items.map((course) => <CourseCard key={course.id} course={course} />)
            : tab === 'posts'
              ? items.map((post) => <PostCard key={post.id} post={post} />)
              : items.map((trilha) => <TrilhaCard key={trilha.id} trilha={trilha} />)}
        </div>
      )}
    </div>
  )
}

function Tab({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={cn(
        '-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
        active
          ? 'border-brand-500 text-brand-400'
          : 'border-transparent text-slate-400 hover:text-slate-200',
      )}
    >
      <Icon size={16} /> {label}
      <span className="text-xs text-slate-500">({count})</span>
    </button>
  )
}
