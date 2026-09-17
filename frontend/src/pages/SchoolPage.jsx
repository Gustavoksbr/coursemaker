import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { BookOpen, ExternalLink, GraduationCap, Waypoints } from 'lucide-react'
import { CourseCard } from '@/components/course/CourseCard'
import { PostCard } from '@/components/post/PostCard'
import { TrilhaCard } from '@/components/trilha/TrilhaCard'
import { EmptyState, ErrorState, PageLoader } from '@/components/ui/Feedback'
import { courseKeys, listCourses } from '@/api/courses'
import { listPosts, postKeys } from '@/api/posts'
import { listTrilhas, trilhaKeys } from '@/api/trilhas'
import { getSchoolBySlug, schoolKeys } from '@/api/schools'
import { errorMessage } from '@/lib/api'
import { PAGE_SIZE } from '@/lib/constants'

/**
 * A school's own public page: who they are, plus every course/post/trilha published under their
 * name. Pure provenance, same "Publicado por" framing as the badge (see Badge.jsx) - never
 * "official partner", since the content here was just credited to the school, not vetted by it.
 */
export default function SchoolPage() {
  const { slug } = useParams()
  const [tab, setTab] = useState('courses')

  const schoolQuery = useQuery({
    queryKey: schoolKeys.bySlug(slug),
    queryFn: () => getSchoolBySlug(slug),
  })
  const school = schoolQuery.data

  const filters = { schoolId: school?.id, sort: 'recent', page: 0, size: PAGE_SIZE }
  const coursesQuery = useQuery({
    queryKey: courseKeys.list(filters),
    queryFn: () => listCourses(filters),
    enabled: Boolean(school),
  })
  const postsQuery = useQuery({
    queryKey: postKeys.list(filters),
    queryFn: () => listPosts(filters),
    enabled: Boolean(school),
  })
  const trilhasQuery = useQuery({
    queryKey: trilhaKeys.list(filters),
    queryFn: () => listTrilhas(filters),
    enabled: Boolean(school),
  })

  if (schoolQuery.isPending) return <PageLoader label="Carregando escola..." />

  if (schoolQuery.isError) {
    return (
      <ErrorState
        title="Escola nao encontrada"
        message={errorMessage(schoolQuery.error, `Nao existe uma escola em "${slug}".`)}
        onRetry={schoolQuery.refetch}
      />
    )
  }

  const activeQuery = tab === 'courses' ? coursesQuery : tab === 'posts' ? postsQuery : trilhasQuery
  const items = activeQuery.data?.items ?? []

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        {school.logoUrl ? (
          <img
            src={school.logoUrl}
            alt={school.name}
            className="h-20 w-20 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
            <GraduationCap size={32} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">Escola</p>
          <h1 className="text-2xl font-bold text-slate-100">{school.name}</h1>
          {school.description && (
            <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-slate-300">{school.description}</p>
          )}
          {school.websiteUrl && (
            <a
              href={school.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300"
            >
              Site oficial <ExternalLink size={13} />
            </a>
          )}
        </div>
      </header>

      <div className="flex gap-1 border-b border-slate-800">
        <Tab
          active={tab === 'courses'}
          onClick={() => setTab('courses')}
          icon={GraduationCap}
          label="Cursos"
          count={coursesQuery.data?.totalItems}
        />
        <Tab
          active={tab === 'posts'}
          onClick={() => setTab('posts')}
          icon={BookOpen}
          label="Posts"
          count={postsQuery.data?.totalItems}
        />
        <Tab
          active={tab === 'trilhas'}
          onClick={() => setTab('trilhas')}
          icon={Waypoints}
          label="Trilhas"
          count={trilhasQuery.data?.totalItems}
        />
      </div>

      {activeQuery.isPending ? (
        <PageLoader label="Carregando conteudo..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={tab === 'courses' ? GraduationCap : tab === 'posts' ? BookOpen : Waypoints}
          title={
            tab === 'courses' ? 'Nenhum curso ainda' : tab === 'posts' ? 'Nenhum post ainda' : 'Nenhuma trilha ainda'
          }
          message={`${school.name} ainda nao tem conteudo publicado por aqui.`}
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
      {count != null && <span className="text-xs text-slate-500">({count})</span>}
    </button>
  )
}
