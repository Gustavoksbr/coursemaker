import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  UserMinus,
  UserPlus,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ContentBadges } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/Field'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { SaveToLibraryButton } from '@/components/library/SaveToLibraryButton'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { BlockList } from '@/components/blocks/BlockRenderer'
import { CommentThread } from '@/components/comments/CommentThread'
import { CurriculumNav, flattenLessons } from '@/components/course/CurriculumNav'
import { PrivatePasswordModal } from '@/components/course/PrivatePasswordModal'
import { CourseTrilhasSection } from '@/components/trilha/CourseTrilhasSection'
import { RelatedItemsSection } from '@/components/related/RelatedItemsSection'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { blockKeys } from '@/api/shared'
import {
  completeLesson,
  courseKeys,
  enroll,
  getCourseBySlug,
  listLessonBlocks,
  uncompleteLesson,
  unenroll,
} from '@/api/courses'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

export default function CourseViewPage() {
  const { nickname, slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, user } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const courseQuery = useQuery({
    queryKey: courseKeys.bySlug(nickname, slug),
    queryFn: () => getCourseBySlug(nickname, slug),
  })

  const detail = courseQuery.data
  const course = detail?.summary
  const lessons = useMemo(() => flattenLessons(detail?.modules), [detail?.modules])

  const activeLessonId = searchParams.get('lesson')
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? null
  const activeIndex = lessons.findIndex((lesson) => lesson.id === activeLessonId)

  // Ask for the password as soon as we learn the course is locked.
  useEffect(() => {
    if (detail?.requiresPassword) setPasswordOpen(true)
  }, [detail?.requiresPassword])

  const selectLesson = (lessonId) => {
    const params = new URLSearchParams(searchParams)
    if (lessonId) params.set('lesson', lessonId)
    else params.delete('lesson')
    setSearchParams(params)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const { mutate: toggleEnrollment, isPending: enrolling } = useMutation({
    mutationFn: () => (course.enrolledByMe ? unenroll(course.id) : enroll(course.id)),
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: courseKeys.bySlug(nickname, slug) })
      toast.success(status.enrolled ? 'Matricula confirmada!' : 'Matricula cancelada.')
    },
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel atualizar a matricula.')),
  })

  const { mutate: toggleCompletion } = useMutation({
    mutationFn: ({ lessonId, completed }) =>
      completed ? uncompleteLesson(lessonId) : completeLesson(lessonId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.bySlug(nickname, slug) }),
    onError: (error) => toast.error(errorMessage(error, 'Nao foi possivel atualizar o progresso.')),
  })

  if (courseQuery.isPending) return <PageLoader label="Carregando curso..." />

  if (courseQuery.isError) {
    return (
      <ErrorState
        title="Curso indisponivel"
        message={errorMessage(courseQuery.error, 'Este curso nao existe ou nao esta acessivel.')}
        onRetry={courseQuery.refetch}
      />
    )
  }

  const handleEnrollClick = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (detail.requiresPassword) {
      setPasswordOpen(true)
      return
    }
    toggleEnrollment()
  }

  return (
    <>
      <div className="flex flex-1">
        {detail.canViewContent && detail.modules.length > 0 && sidebarOpen && (
          <aside className="hidden w-72 shrink-0 border-r border-slate-800 lg:block">
            <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto p-3">
              {course.progressEnabled && detail.progress && (
                <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
                  <ProgressBar
                    completed={detail.progress.completedLessons}
                    total={detail.progress.totalLessons}
                    percentage={detail.progress.percentage}
                    ariaLabel="Progresso no curso"
                  />
                </div>
              )}
              <CurriculumNav
                modules={detail.modules}
                activeLessonId={activeLessonId}
                onSelectLesson={selectLesson}
                progressEnabled={course.progressEnabled}
              />
            </div>
          </aside>
        )}

        <div className="min-w-0 flex-1">
          {activeLesson ? (
            <LessonView
              course={course}
              lesson={activeLesson}
              lessons={lessons}
              activeIndex={activeIndex}
              onSelectLesson={selectLesson}
              onBackToLanding={() => selectLesson(null)}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen((open) => !open)}
              onToggleCompletion={toggleCompletion}
              canTrackProgress={course.progressEnabled && isAuthenticated}
            />
          ) : (
            <Landing
              detail={detail}
              course={course}
              lessons={lessons}
              currentUser={user}
              onSelectLesson={selectLesson}
              onEnrollClick={handleEnrollClick}
              enrolling={enrolling}
              onUnlockClick={() => setPasswordOpen(true)}
              onSavedChange={() =>
                queryClient.invalidateQueries({ queryKey: courseKeys.bySlug(nickname, slug) })
              }
            />
          )}
        </div>
      </div>

      <PrivatePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        courseId={course.id}
        courseName={course.name}
        onUnlocked={() => {
          setPasswordOpen(false)
          toast.success('Acesso liberado!')
          queryClient.invalidateQueries({ queryKey: courseKeys.bySlug(nickname, slug) })
        }}
      />
    </>
  )
}

function Landing({
  detail,
  course,
  lessons,
  currentUser,
  onSelectLesson,
  onEnrollClick,
  enrolling,
  onUnlockClick,
  onSavedChange,
}) {
  const isOwner = detail.isOwner

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8 sm:px-6">
      <header className="space-y-4">
        <ContentBadges
          status={course.status}
          visibility={course.visibility}
          featured={course.featured}
        />

        <h1 className="break-words text-3xl font-bold tracking-tight text-slate-100">{course.name}</h1>
        {course.description && (
          <p className="break-words text-lg text-slate-400">{course.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Link
            to={`/users/${course.owner.nickname}`}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-brand-400"
          >
            <Avatar src={course.owner.image} name={course.owner.name} />
            <span>
              <span className="block font-medium">{course.owner.name}</span>
              <span className="block text-xs text-slate-500">@{course.owner.nickname}</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <SaveToLibraryButton kind="course" contentId={course.id} saved={course.savedByMe} onChange={onSavedChange} />
            {isOwner ? (
              <Link
                to={`/courses/${course.owner.nickname}/${course.slug}/edit`}
                className="btn-secondary"
              >
                <Pencil size={16} /> Editar curso
              </Link>
            ) : (
              <Button onClick={onEnrollClick} loading={enrolling} variant={course.enrolledByMe ? 'secondary' : 'primary'}>
                {course.enrolledByMe ? (
                  <>
                    <UserMinus size={16} /> Desmatricular-se
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Matricular-se
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <Thumbnail src={course.thumbnailUrl} alt={course.name} className="rounded-xl" />
      </header>

      <div className="flex flex-wrap gap-6 rounded-xl border border-slate-700 bg-slate-800/50 px-5 py-4 text-sm">
        <Stat label="Licoes" value={course.lessonCount} />
        <Stat label="Alunos" value={course.enrollmentCount} />
        {course.categories?.length > 0 && (
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">Categorias</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {course.categories.map((category) => (
                <span key={category} className="badge bg-slate-700/60 text-slate-300">
                  {category}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {course.progressEnabled && detail.progress && (
        <ProgressBar
          completed={detail.progress.completedLessons}
          total={detail.progress.totalLessons}
          percentage={detail.progress.percentage}
          ariaLabel="Progresso no curso"
        />
      )}

      {detail.landingDescription && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-slate-100">Sobre o curso</h2>
          <p className="whitespace-pre-wrap text-slate-300">{detail.landingDescription}</p>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-100">Conteudo</h2>

        {detail.requiresPassword ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/5 px-6 py-10 text-center">
            <Lock className="text-violet-400" size={28} />
            <div>
              <p className="font-semibold text-slate-200">Conteudo protegido por senha</p>
              <p className="mt-1 text-sm text-slate-400">
                Informe a senha do curso para ver os modulos e as licoes.
              </p>
            </div>
            <Button onClick={onUnlockClick}>Informar senha</Button>
          </div>
        ) : !detail.canViewContent ? (
          <p className="rounded-xl border border-slate-700 px-6 py-10 text-center text-sm text-slate-400">
            Voce ainda nao tem acesso ao conteudo deste curso.
          </p>
        ) : lessons.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-500">
            {isOwner
              ? 'Seu curso ainda nao tem licoes. Abra o editor para comecar.'
              : 'Este curso ainda nao tem licoes publicadas.'}
          </p>
        ) : (
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-2">
            <CurriculumNav
              modules={detail.modules}
              activeLessonId={null}
              onSelectLesson={onSelectLesson}
              progressEnabled={course.progressEnabled}
            />
          </div>
        )}
      </section>

      <CourseTrilhasSection contentId={course.id} kind="course" />

      <RelatedItemsSection kind="course" contentId={course.id} />

      {detail.canViewContent && <CommentThread courseId={course.id} isOwner={isOwner} />}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-slate-100">{value}</p>
    </div>
  )
}

function LessonView({
  course,
  lesson,
  lessons,
  activeIndex,
  onSelectLesson,
  onBackToLanding,
  sidebarOpen,
  onToggleSidebar,
  onToggleCompletion,
  canTrackProgress,
}) {
  const { data: blocks, isPending, isError, error, refetch } = useQuery({
    queryKey: blockKeys.lesson(lesson.id),
    queryFn: () => listLessonBlocks(lesson.id),
  })

  const previous = activeIndex > 0 ? lessons[activeIndex - 1] : null
  const next = activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : null

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="btn-ghost hidden px-2 lg:inline-flex"
          aria-label={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
        >
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
        <button type="button" onClick={onBackToLanding} className="btn-ghost text-sm">
          <ChevronLeft size={16} /> {course.name}
        </button>
      </div>

      <header className="mb-6 border-b border-slate-800 pb-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">{lesson.moduleTitle}</p>
        <h1 className="mt-1 break-words text-2xl font-bold text-slate-100">{lesson.title}</h1>

        {canTrackProgress && (
          <Checkbox
            className="mt-4"
            label="Marcar como concluida"
            checked={lesson.completed}
            onChange={() => onToggleCompletion({ lessonId: lesson.id, completed: lesson.completed })}
          />
        )}
      </header>

      {isPending ? (
        <PageLoader label="Carregando conteudo..." />
      ) : isError ? (
        <ErrorState message={errorMessage(error)} onRetry={refetch} />
      ) : (
        <BlockList blocks={blocks} />
      )}

      <nav className="mt-10 flex items-center justify-between gap-3 border-t border-slate-800 pt-6">
        <button
          type="button"
          onClick={() => previous && onSelectLesson(previous.id)}
          disabled={!previous}
          className={cn('btn-ghost min-w-0 text-left', !previous && 'invisible')}
        >
          <ChevronLeft size={16} />
          <span className="min-w-0 truncate">{previous?.title}</span>
        </button>
        <button
          type="button"
          onClick={() => next && onSelectLesson(next.id)}
          disabled={!next}
          className={cn('btn-secondary min-w-0 text-right', !next && 'invisible')}
        >
          <span className="min-w-0 truncate">{next?.title}</span>
          <ChevronRight size={16} />
        </button>
      </nav>
    </article>
  )
}
