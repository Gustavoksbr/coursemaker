import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, FolderOpen, GraduationCap, History, Plus, Waypoints } from 'lucide-react'
import { CourseCard } from '@/components/course/CourseCard'
import { TrilhaCard } from '@/components/trilha/TrilhaCard'
import { FolderCard } from '@/components/library/FolderCard'
import { FolderModal } from '@/components/library/FolderModal'
import { Avatar } from '@/components/ui/Avatar'
import { ContentBadges } from '@/components/ui/Badge'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { courseKeys, lastAccessedCourse, myCompletedCourses, myInProgressCourses } from '@/api/courses'
import { myCompletedTrilhas, myFollowedTrilhas, trilhaKeys } from '@/api/trilhas'
import { libraryKeys, listFolders } from '@/api/library'

const SECTIONS = [
  { id: 'continuar', label: 'Continuar assistindo', icon: History },
  { id: 'em-andamento', label: 'Em andamento', icon: GraduationCap },
  { id: 'concluidos', label: 'Concluidos', icon: CheckCircle2 },
  { id: 'trilhas', label: 'Trilhas que sigo', icon: Waypoints },
  { id: 'pastas', label: 'Pastas', icon: FolderOpen },
]

export default function LibraryPage() {
  const [createFolderOpen, setCreateFolderOpen] = useState(false)

  const lastAccessedQuery = useQuery({ queryKey: courseKeys.lastAccessed, queryFn: lastAccessedCourse })
  const inProgressQuery = useQuery({ queryKey: courseKeys.inProgress, queryFn: myInProgressCourses })
  const completedCoursesQuery = useQuery({ queryKey: courseKeys.completed, queryFn: myCompletedCourses })
  const completedTrilhasQuery = useQuery({ queryKey: trilhaKeys.completed, queryFn: myCompletedTrilhas })
  const followingQuery = useQuery({ queryKey: trilhaKeys.following, queryFn: myFollowedTrilhas })
  const foldersQuery = useQuery({ queryKey: libraryKeys.folders, queryFn: listFolders })

  const completedLoading = completedCoursesQuery.isPending || completedTrilhasQuery.isPending
  const completedItems = [
    ...(completedCoursesQuery.data ?? []).map((course) => ({ kind: 'course', data: course })),
    ...(completedTrilhasQuery.data ?? []).map((trilha) => ({ kind: 'trilha', data: trilha })),
  ]

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6">
      <aside className="hidden w-52 shrink-0 lg:block">
        <nav className="sticky top-20 space-y-1">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            >
              <Icon size={15} /> {label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 space-y-12">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Sua biblioteca</h1>
          <p className="mt-1 text-sm text-slate-400">Cursos, posts e trilhas que voce matriculou, segue ou salvou.</p>
        </div>

        <section id="continuar" className="scroll-mt-20">
          <SectionTitle icon={History} title="Continuar assistindo" />
          {lastAccessedQuery.isPending ? (
            <Loading />
          ) : lastAccessedQuery.data ? (
            <ContinueWatchingCard course={lastAccessedQuery.data} />
          ) : (
            <EmptyState
              icon={History}
              title="Nada por aqui ainda"
              message="Assim que voce abrir um curso em que esta matriculado, ele aparece aqui."
            />
          )}
        </section>

        <section id="em-andamento" className="scroll-mt-20">
          <SectionTitle icon={GraduationCap} title="Em andamento" count={inProgressQuery.data?.length} />
          {inProgressQuery.isPending ? (
            <Loading />
          ) : inProgressQuery.data.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Nenhum curso em andamento"
              message="Cursos em que voce se matricular e ainda nao terminou aparecem aqui."
            />
          ) : (
            <ScrollRow>
              {inProgressQuery.data.map((course) => (
                <CardSlot key={course.id}>
                  <CourseCard course={course} />
                </CardSlot>
              ))}
            </ScrollRow>
          )}
        </section>

        <section id="concluidos" className="scroll-mt-20">
          <SectionTitle icon={CheckCircle2} title="Concluidos" count={completedItems.length} />
          {completedLoading ? (
            <Loading />
          ) : completedItems.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nada concluido ainda"
              message="Cursos e trilhas que voce terminar aparecem aqui."
            />
          ) : (
            <ScrollRow>
              {completedItems.map(({ kind, data }) => (
                <CardSlot key={`${kind}-${data.id}`}>
                  {kind === 'course' ? <CourseCard course={data} /> : <TrilhaCard trilha={data} />}
                </CardSlot>
              ))}
            </ScrollRow>
          )}
        </section>

        <section id="trilhas" className="scroll-mt-20">
          <SectionTitle icon={Waypoints} title="Trilhas que sigo" count={followingQuery.data?.length} />
          {followingQuery.isPending ? (
            <Loading />
          ) : followingQuery.data.length === 0 ? (
            <EmptyState
              icon={Waypoints}
              title="Voce ainda nao segue nenhuma trilha"
              message="Trilhas que voce seguir aparecem aqui."
              action={
                <Link to="/trilhas" className="btn-secondary">
                  Explorar trilhas
                </Link>
              }
            />
          ) : (
            <ScrollRow>
              {followingQuery.data.map((trilha) => (
                <CardSlot key={trilha.id}>
                  <TrilhaCard trilha={trilha} />
                </CardSlot>
              ))}
            </ScrollRow>
          )}
        </section>

        <section id="pastas" className="scroll-mt-20">
          <div className="mb-3 flex items-center justify-between gap-4">
            <SectionTitle icon={FolderOpen} title="Pastas" count={foldersQuery.data?.length} bare />
            <button type="button" onClick={() => setCreateFolderOpen(true)} className="btn-secondary text-xs">
              <Plus size={14} /> Nova pasta
            </button>
          </div>
          {foldersQuery.isPending ? (
            <Loading />
          ) : foldersQuery.data.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="Nenhuma pasta ainda"
              message="Crie pastas para organizar o que voce salvar, como numa biblioteca."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {foldersQuery.data.map((folder) => (
                <FolderCard key={folder.id} folder={folder} />
              ))}
            </div>
          )}
        </section>
      </div>

      <FolderModal open={createFolderOpen} onClose={() => setCreateFolderOpen(false)} />
    </div>
  )
}

function SectionTitle({ icon: Icon, title, count, bare }) {
  if (bare) {
    return (
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
        <Icon size={18} className="text-brand-400" /> {title}
        {count != null && count > 0 && <span className="text-sm font-normal text-slate-500">({count})</span>}
      </h2>
    )
  }
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
        <Icon size={18} className="text-brand-400" /> {title}
        {count != null && count > 0 && <span className="text-sm font-normal text-slate-500">({count})</span>}
      </h2>
    </div>
  )
}

function Loading() {
  return (
    <div className="flex justify-center py-8">
      <Spinner />
    </div>
  )
}

/** Horizontal, snap-scrolling row -- the responsive answer to "infinitely many saved items". */
function ScrollRow({ children }) {
  return <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">{children}</div>
}

function CardSlot({ children }) {
  return <div className="w-72 shrink-0 snap-start">{children}</div>
}

function ContinueWatchingCard({ course }) {
  const href = `/courses/${course.owner.nickname}/${course.slug}`
  return (
    <Link
      to={href}
      className="card flex flex-col gap-4 overflow-hidden p-4 sm:flex-row sm:items-center"
    >
      <Thumbnail src={course.thumbnailUrl} alt={course.name} className="w-full rounded-lg sm:w-56" />
      <div className="min-w-0 flex-1">
        <ContentBadges status={course.status} visibility={course.visibility} featured={course.featured} className="mb-2" />
        <h3 className="truncate text-lg font-bold text-slate-100">{course.name}</h3>
        {course.description && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{course.description}</p>}
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Avatar src={course.owner.image} name={course.owner.name} size="sm" />
          {course.owner.name}
        </div>
      </div>
    </Link>
  )
}
