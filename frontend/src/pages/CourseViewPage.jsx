import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  UserMinus,
  UserPlus,
} from 'lucide-react'
import { ChatWidget } from '@/components/ai/ChatWidget'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ContentBadges } from '@/components/ui/Badge'
import { ErrorState } from '@/components/ui/Feedback'
import { CourseLandingSkeleton, LessonContentSkeleton } from '@/components/ui/Skeleton'
import { SaveToLibraryButton } from '@/components/library/SaveToLibraryButton'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { BlockList } from '@/components/blocks/BlockRenderer'
import { CommentThread } from '@/components/comments/CommentThread'
import { CurriculumNav, flattenLessons } from '@/components/course/CurriculumNav'
import { CertificateButton } from '@/components/shared/CertificateButton'
import { FeatureToggleButton } from '@/components/shared/FeatureToggleButton'
import { BlockToggleButton } from '@/components/shared/BlockToggleButton'
import { PrivatePasswordModal } from '@/components/shared/PrivatePasswordModal'
import { CourseTrilhasSection } from '@/components/trilha/CourseTrilhasSection'
import { RelatedItemsSection } from '@/components/related/RelatedItemsSection'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { answerQuestionBlock, completeLesson, courseKeys, enroll, getCourseBySlug, unenroll } from '@/api/courses'
import { courseHref } from '@/lib/contentLinks'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'

/** Patches one lesson's `completed` flag (and the course progress counters) in the cached course detail. */
function patchLessonCompleted(queryClient, queryKey, lessonId, completed) {
  queryClient.setQueryData(queryKey, (current) => {
    if (!current) return current
    let changed = false
    const modules = current.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => {
        if (lesson.id !== lessonId || lesson.completed === completed) return lesson
        changed = true
        return { ...lesson, completed }
      }),
    }))
    if (!changed) return current

    const progress = current.progress && {
      ...current.progress,
      completedLessons: current.progress.completedLessons + (completed ? 1 : -1),
      percentage:
        current.progress.totalLessons > 0
          ? Math.round(
            ((current.progress.completedLessons + (completed ? 1 : -1)) / current.progress.totalLessons) * 100,
          )
          : 0,
    }
    return { ...current, modules, progress }
  })
}

/** Adds a correctly-answered QUESTION block id to the cached course detail, idempotently. */
function patchQuestionAnswered(queryClient, queryKey, blockId) {
  queryClient.setQueryData(queryKey, (current) => {
    if (!current || current.answeredQuestionBlockIds?.includes(blockId)) return current
    return {
      ...current,
      answeredQuestionBlockIds: [...(current.answeredQuestionBlockIds ?? []), blockId],
    }
  })
}

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
  const answeredQuestionBlockIds = useMemo(
    () => new Set(detail?.answeredQuestionBlockIds ?? []),
    [detail?.answeredQuestionBlockIds],
  )

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

  /**
   * Fire-and-forget: the caller never awaits this, so clicking "Proxima aula" advances instantly
   * instead of waiting on a round trip. The cache is patched optimistically so the sidebar/progress
   * bar update immediately too; a failure rolls that back and toasts instead of silently reverting
   * on the next unrelated refetch.
   */
  const markLessonComplete = (lessonId) => {
    const queryKey = courseKeys.bySlug(nickname, slug)
    patchLessonCompleted(queryClient, queryKey, lessonId, true)
    completeLesson(lessonId).catch((error) => {
      patchLessonCompleted(queryClient, queryKey, lessonId, false)
      toast.error(errorMessage(error, 'Nao foi possivel marcar a licao como concluida.'))
    })
  }

  /** Persists a correct answer as soon as it happens - independent of "Concluir aula", which only
   *  re-checks that this is already done instead of triggering it. A wrong pick is never sent. */
  const answerQuestion = (blockId, alternativeId) => {
    answerQuestionBlock(blockId, alternativeId)
      .then((result) => {
        if (result.correct) {
          patchQuestionAnswered(queryClient, courseKeys.bySlug(nickname, slug), blockId)
        }
      })
      .catch((error) => toast.error(errorMessage(error, 'Nao foi possivel registrar a resposta.')))
  }

  if (courseQuery.isPending) return <CourseLandingSkeleton />

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
              {!detail.isOwner && detail.progress && (
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
              onCompleteLesson={markLessonComplete}
              canTrackProgress={isAuthenticated && !detail.isOwner}
              answeredQuestionBlockIds={answeredQuestionBlockIds}
              onAnswerQuestion={answerQuestion}
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

      {detail.canViewContent && (
        <ChatWidget kind="course" contentId={course.id} raised={Boolean(activeLesson)} />
      )}

      <PrivatePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        kind="course"
        contentId={course.id}
        contentName={course.name}
        onUnlocked={() => {
          setPasswordOpen(false)
          toast.success('Acesso liberado!')
          queryClient.invalidateQueries({ queryKey: courseKeys.bySlug(nickname, slug) })
        }}
      />
    </>
  )
}

export function Landing({
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
          school={course.school}
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
            <FeatureToggleButton
              kind="course"
              contentId={course.id}
              featured={course.featured}
              onChanged={onSavedChange}
            />
            <BlockToggleButton
              kind="course"
              item={course}
              onSuccess={onSavedChange}
            />
            {isOwner ? (
              <Link to={`${courseHref(course)}/edit`} className="btn-secondary">
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

        {/* Blocked warning for owner */}
        {isOwner && course.blockedByAdmin && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-semibold text-red-400">Conteúdo bloqueado por administrador</h4>
                <p className="mt-1 text-sm text-slate-300">
                  Este curso foi bloqueado por um administrador e não está visível ao público. Entre em contato com a
                  equipe para mais informações.
                </p>
              </div>
              <Link
                to="/mensagens/admin"
                className="btn-secondary flex items-center gap-2 whitespace-nowrap text-sm"
              >
                <Mail size={16} />
                Falar com admin
              </Link>
            </div>
          </div>
        )}

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

      {!isOwner && detail.progress && (
        <div className="space-y-3">
          <ProgressBar
            completed={detail.progress.completedLessons}
            total={detail.progress.totalLessons}
            percentage={detail.progress.percentage}
            ariaLabel="Progresso no curso"
          />
          {detail.progress.percentage >= 100 && <CertificateButton kind="course" content={course} />}
        </div>
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
            />
          </div>
        )}
      </section>

      <CourseTrilhasSection contentId={course.id} kind="course" />

      <RelatedItemsSection kind="course" contentId={course.id} />

      {detail.canViewContent && <CommentThread kind="course" contentId={course.id} isOwner={isOwner} />}
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

export function LessonView({
  course,
  lesson,
  lessons,
  activeIndex,
  onSelectLesson,
  onBackToLanding,
  sidebarOpen,
  onToggleSidebar,
  onCompleteLesson,
  canTrackProgress,
  answeredQuestionBlockIds,
  onAnswerQuestion,
}) {
  // Blocks are now loaded with the course - no additional API call needed!
  const blocks = lesson.blocks || []

  const previous = activeIndex > 0 ? lessons[activeIndex - 1] : null
  const next = activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : null

  // A lesson with QUESTION blocks cannot be completed until every one of them has been answered
  // correctly - the backend enforces this too (see ProgressService#markComplete), this is just
  // what keeps the button itself from ever attempting a completion that would be rejected.
  const pendingQuestionBlockIds = canTrackProgress
    ? blocks
      .filter((block) => block.type === 'question' && !answeredQuestionBlockIds?.has(block.id))
      .map((block) => block.id)
    : []
  const hasPendingQuestions = pendingQuestionBlockIds.length > 0

  const scrollToFirstPending = () => {
    document.getElementById(`block-${pendingQuestionBlockIds[0]}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Advancing always navigates immediately; marking the lesson complete (if this course tracks
  // progress) happens in the background and never blocks that navigation. Pending questions are
  // the one thing that does block it: advance() simply isn't wired to the button in that case.
  const advance = () => {
    if (canTrackProgress && !lesson.completed) onCompleteLesson(lesson.id)
    if (next) onSelectLesson(next.id)
    else onBackToLanding()
  }

  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6">
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

          {canTrackProgress && lesson.completed && (
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-green-400">
              <CheckCircle2 size={16} /> Licao concluida
            </span>
          )}
        </header>

        {blocks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-500">
            Esta licao ainda nao tem conteudo.
          </p>
        ) : (
          <BlockList
            blocks={blocks}
            answeredQuestionBlockIds={answeredQuestionBlockIds}
            onAnswerQuestion={onAnswerQuestion}
          />
        )}
      </article>

      {/* Fixed to the viewport (not just the end of the article) so advancing never requires
        scrolling down to find it. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-900/95 backdrop-blur">
        {hasPendingQuestions && (
          <button
            type="button"
            onClick={scrollToFirstPending}
            className="block w-full border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-300 underline-offset-2 hover:underline sm:px-6"
          >
            {pendingQuestionBlockIds.length === 1
              ? 'Responda a questao pendente desta aula para continuar'
              : `Responda as ${pendingQuestionBlockIds.length} questoes pendentes desta aula para continuar`}
          </button>
        )}
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => previous && onSelectLesson(previous.id)}
            disabled={!previous}
            className={cn('btn-ghost min-w-0 text-left', !previous && 'invisible')}
          >
            <ChevronLeft size={16} />
            <span className="min-w-0 truncate">{previous?.title}</span>
          </button>
          <Button onClick={advance} className="min-w-0" disabled={hasPendingQuestions}>
            <span className="min-w-0 truncate">{next ? 'Proxima aula' : 'Concluir curso'}</span>
            {next ? <ChevronRight size={16} /> : <CheckCircle2 size={16} />}
          </Button>
        </div>
      </nav>
    </>
  )
}
