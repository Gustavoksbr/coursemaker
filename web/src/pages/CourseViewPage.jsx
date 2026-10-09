import { useEffect, useMemo, useState } from 'react'
import { OpenMessagesButton } from '@/components/messages/MessagesModal'
import { Link, useParams, useSearchParams } from 'react-router-dom'
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
import { CourseSidebar } from '@/components/course/CourseSidebar'
import { SidebarDrawer } from '@/components/course/SidebarDrawer'
import { CourseRail } from '@/components/course/CourseRail'
import { EditCourseButton } from '@/components/course/EditCourseButton'
import { CertificateButton } from '@/components/shared/CertificateButton'
import { BlockToggleButton } from '@/components/shared/BlockToggleButton'
import { PrivatePasswordModal } from '@/components/shared/PrivatePasswordModal'
import { ConfirmModal } from '@/components/ui/Modal'
import { PageMeta } from '@/components/layout/PageMeta'
import { CourseTrilhasSection } from '@/components/trilha/CourseTrilhasSection'
import { RelatedItemsSection } from '@/components/related/RelatedItemsSection'
import { useAuth } from '@/context/AuthContext'
import { useAuthModal } from '@/context/AuthModalContext'
import { useToast } from '@/context/ToastContext'
import { answerQuestionBlock, completeLesson, courseKeys, enroll, getCourseBySlug, unenroll } from '@/api/courses'
import { libraryKeys } from '@/api/library'
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

/** Adds a solved CODE_EXERCISE block id to the cached course detail, idempotently. */
function patchExercisePassed(queryClient, queryKey, blockId) {
  queryClient.setQueryData(queryKey, (current) => {
    if (!current || current.passedExerciseBlockIds?.includes(blockId)) return current
    return {
      ...current,
      passedExerciseBlockIds: [...(current.passedExerciseBlockIds ?? []), blockId],
    }
  })
}

const SIDEBAR_PREFERENCE_KEY = 'coursemaker:lesson-sidebar-open'

function readSidebarPreference() {
  try {
    return localStorage.getItem(SIDEBAR_PREFERENCE_KEY) !== '0'
  } catch {
    return true
  }
}

export default function CourseViewPage() {
  const { nickname, slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isAuthenticated, user } = useAuth()
  const { openLogin } = useAuthModal()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [confirmUnenrollOpen, setConfirmUnenrollOpen] = useState(false)
  // Set when the "Atividades" tab sends the student to a block; the lesson view scrolls to it once rendered.
  const [scrollTargetBlockId, setScrollTargetBlockId] = useState(null)

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

  const passedExerciseBlockIds = useMemo(
    () => new Set(detail?.passedExerciseBlockIds ?? []),
    [detail?.passedExerciseBlockIds],
  )

  const activeLessonId = searchParams.get('lesson')
  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? null

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
      setConfirmUnenrollOpen(false)
      queryClient.invalidateQueries({ queryKey: courseKeys.bySlug(nickname, slug) })
      // The course leaves "Meus cursos" in the library (and its progress is gone) once unenrolled.
      queryClient.invalidateQueries({ queryKey: libraryKeys.overview })
      toast.success(
        status.enrolled ? 'Matricula confirmada!' : 'Matricula cancelada. Seu progresso neste curso foi apagado.',
      )
    },
    onError: (error) => {
      setConfirmUnenrollOpen(false)
      toast.error(errorMessage(error, 'Nao foi possivel atualizar a matricula.'))
    },
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

  /** Called by the exercise block the first time a submission passes every test. */
  const markExercisePassed = (blockId) => {
    patchExercisePassed(queryClient, courseKeys.bySlug(nickname, slug), blockId)
  }

  const selectActivity = (activity) => {
    setScrollTargetBlockId(activity.blockId)
    selectLesson(activity.lessonId)
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
      openLogin()
      return
    }
    if (detail.requiresPassword) {
      setPasswordOpen(true)
      return
    }
    // Leaving wipes the student's progress (it is how you start a course over): never in one click.
    if (course.enrolledByMe) {
      setConfirmUnenrollOpen(true)
      return
    }
    toggleEnrollment()
  }

  // Progresso (aulas concluidas, barra, menu com os visto) so existe para quem esta matriculado. Quem apenas
  // olha pode ler, responder questoes e enviar exercicios - isso fica salvo e vale ao se matricular -, mas
  // nao marca aulas como concluidas.
  const enrolledStudent = isAuthenticated && !detail.isOwner && course.enrolledByMe

  return (
    <>
      <PageMeta
        title={course.name}
        description={course.description || detail.landingDescription}
        noindex={course.visibility !== 'public' || course.status !== 'available'}
      />
      <CourseViewer
        course={course}
        modules={detail.modules}
        lessons={lessons}
        activeLessonId={activeLessonId}
        onSelectLesson={selectLesson}
        onSelectActivity={selectActivity}
        canViewContent={detail.canViewContent}
        progress={enrolledStudent ? detail.progress : null}
        showProgress={enrolledStudent}
        canTrackProgress={enrolledStudent}
        showEnrollPrompt={!detail.isOwner && !course.enrolledByMe}
        onEnrollClick={handleEnrollClick}
        enrolling={enrolling}
        answeredQuestionBlockIds={answeredQuestionBlockIds}
        passedExerciseBlockIds={passedExerciseBlockIds}
        onAnswerQuestion={answerQuestion}
        onExercisePassed={markExercisePassed}
        onCompleteLesson={markLessonComplete}
        exercisesInteractive={isAuthenticated}
        scrollToBlockId={scrollTargetBlockId}
        onScrolledToBlock={() => setScrollTargetBlockId(null)}
        landing={
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
        }
      />

      {/* Pinned for the owner on every page of the course; on a lesson it opens the editor on that lesson. */}
      {detail.isOwner && (
        <EditCourseButton
          courseHref={courseHref(course)}
          lesson={activeLesson ? { id: activeLesson.id, title: activeLesson.title } : null}
        />
      )}

      {detail.canViewContent && (
        <ChatWidget
          kind="course"
          contentId={course.id}
          lesson={activeLesson ? { id: activeLesson.id, title: activeLesson.title } : null}
          raised={Boolean(activeLesson)}
        />
      )}

      <ConfirmModal
        open={confirmUnenrollOpen}
        onClose={() => setConfirmUnenrollOpen(false)}
        onConfirm={() => toggleEnrollment()}
        loading={enrolling}
        title="Desmatricular-se deste curso?"
        message="Voce vai perder todo o seu progresso neste curso: as aulas concluidas, as questoes respondidas e os exercicios resolvidos. O certificado deixa de estar disponivel e o curso sai de 'Meus cursos' na biblioteca. Se voce se matricular de novo, recomeca do zero. Isso nao pode ser desfeito."
        confirmLabel="Desmatricular e apagar progresso"
      />

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
              <OpenMessagesButton nickname="admin"
                className="btn-secondary flex items-center gap-2 whitespace-nowrap text-sm"
              >
                <Mail size={16} />
                Falar com admin
              </OpenMessagesButton>
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
              answeredQuestionBlockIds={new Set(detail.answeredQuestionBlockIds ?? [])}
              passedExerciseBlockIds={new Set(detail.passedExerciseBlockIds ?? [])}
              showProgress={Boolean(currentUser) && !isOwner}
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

const isActivity = (block) => block.type === 'question' || block.type === 'code_exercise'

/** The sentence on the amber bar above "Concluir curso" while something still stands in the way. */
function finishCourseText(activities, lessonsToMark) {
  const parts = []
  if (activities > 0) {
    parts.push(activities === 1 ? '1 atividade pendente' : `${activities} atividades pendentes`)
  }
  if (lessonsToMark > 0) {
    parts.push(lessonsToMark === 1 ? '1 aula sem marcar como concluida' : `${lessonsToMark} aulas sem marcar como concluidas`)
  }
  return `Para concluir o curso ainda faltam: ${parts.join(' e ')}`
}

/**
 * O visualizador de curso: menu de aulas (faixa minimizada sempre a mostra, barra completa em telas
 * largas, gaveta em telas estreitas) + a aula aberta, ou `landing` quando nenhuma esta aberta.
 * E o MESMO componente da pagina do curso e da pre-visualizacao do editor, entao as duas sempre
 * se comportam igual. Quem usa decide a origem dos dados e o que conta como progresso.
 *
 * `stickyTop`/`stickyHeight` dizem onde o menu gruda: abaixo da barra de navegacao do site (padrao) ou
 * abaixo do cabecalho da pre-visualizacao.
 */
export function CourseViewer({
  course,
  modules,
  lessons,
  activeLessonId,
  onSelectLesson,
  onSelectActivity,
  canViewContent = true,
  progress = null,
  showProgress = false,
  canTrackProgress = false,
  showEnrollPrompt = false,
  onEnrollClick,
  enrolling = false,
  answeredQuestionBlockIds,
  passedExerciseBlockIds,
  onAnswerQuestion,
  onExercisePassed,
  onCompleteLesson,
  exercisesInteractive = false,
  scrollToBlockId,
  onScrolledToBlock,
  landing,
  stickyTop = 'top-16',
  stickyHeight = 'h-[calc(100vh-4rem)]',
  stickyMaxHeight = 'max-h-[calc(100vh-4rem)]',
}) {
  // Telas largas: a barra fixa pode ser recolhida (lembramos a escolha). Telas estreitas: o mesmo menu
  // abre numa gaveta, pelo botao da faixa minimizada.
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarPreference)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    try {
      localStorage.setItem(SIDEBAR_PREFERENCE_KEY, next ? '1' : '0')
    } catch {
      // Sem armazenamento (janela privada etc.): a barra so nao lembra a escolha.
    }
  }

  const activeIndex = lessons.findIndex((lesson) => lesson.id === activeLessonId)
  const activeLesson = activeIndex >= 0 ? lessons[activeIndex] : null

  const selectLesson = (lessonId) => {
    setDrawerOpen(false)
    onSelectLesson(lessonId)
  }
  const selectActivity = (activity) => {
    setDrawerOpen(false)
    onSelectActivity?.(activity)
  }

  const hasSidebar = canViewContent && modules.length > 0
  const sidebarBody = (
    <>
      {progress && (
        <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/60 p-3">
          <ProgressBar
            completed={progress.completedLessons}
            total={progress.totalLessons}
            percentage={progress.percentage}
            ariaLabel="Progresso no curso"
          />
        </div>
      )}
      <CourseSidebar
        modules={modules}
        activeLessonId={activeLessonId}
        onSelectLesson={selectLesson}
        onSelectActivity={selectActivity}
        answeredQuestionBlockIds={answeredQuestionBlockIds}
        passedExerciseBlockIds={passedExerciseBlockIds}
        showProgress={showProgress}
      />
    </>
  )

  return (
    <div className="flex flex-1">
      {/* Minimizado: faixa de icones sempre a mostra (em telas largas so quando o menu esta recolhido). */}
      {hasSidebar && (
        <div className={cn('sticky shrink-0 self-start', stickyTop, stickyHeight, sidebarOpen && 'md:hidden')}>
          <CourseRail
            modules={modules}
            activeLessonId={activeLessonId}
            onSelectLesson={selectLesson}
            onExpand={toggleSidebar}
            onExpandDrawer={() => setDrawerOpen(true)}
            showProgress={showProgress}
          />
        </div>
      )}
      {/* Maximizado em telas largas: barra completa ao lado. Em telas estreitas vira a gaveta abaixo. */}
      {hasSidebar && sidebarOpen && (
        <aside className="hidden w-72 shrink-0 border-r border-slate-800 md:block">
          <div className={cn('sticky overflow-y-auto p-3', stickyTop, stickyMaxHeight)}>{sidebarBody}</div>
        </aside>
      )}
      {hasSidebar && (
        <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          {sidebarBody}
        </SidebarDrawer>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {activeLesson ? (
          <LessonView
            course={course}
            lesson={activeLesson}
            lessons={lessons}
            activeIndex={activeIndex}
            onSelectLesson={selectLesson}
            onGoToActivity={selectActivity}
            onBackToLanding={() => selectLesson(null)}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={toggleSidebar}
            onCompleteLesson={onCompleteLesson}
            canTrackProgress={canTrackProgress}
            showEnrollPrompt={showEnrollPrompt}
            onEnrollClick={onEnrollClick}
            enrolling={enrolling}
            answeredQuestionBlockIds={answeredQuestionBlockIds}
            onAnswerQuestion={onAnswerQuestion}
            passedExerciseBlockIds={passedExerciseBlockIds}
            onExercisePassed={onExercisePassed}
            exercisesInteractive={exercisesInteractive}
            scrollToBlockId={scrollToBlockId}
            onScrolledToBlock={onScrolledToBlock}
          />
        ) : (
          // Num container em coluna, um filho com margem automatica (a pagina inicial usa mx-auto) deixa
          // de esticar e passa a medir o proprio conteudo: a imagem alargava a tela. Este wrapper estica.
          <div className="w-full min-w-0">{landing}</div>
        )}
      </div>
    </div>
  )
}

export function LessonView({
  course,
  lesson,
  lessons,
  activeIndex,
  onSelectLesson,
  onGoToActivity,
  onBackToLanding,
  sidebarOpen,
  onToggleSidebar,
  onCompleteLesson,
  canTrackProgress,
  showEnrollPrompt = false,
  onEnrollClick,
  enrolling = false,
  answeredQuestionBlockIds,
  onAnswerQuestion,
  passedExerciseBlockIds,
  onExercisePassed,
  exercisesInteractive,
  scrollToBlockId,
  onScrolledToBlock,
}) {
  // Blocks are now loaded with the course - no additional API call needed!
  const blocks = lesson.blocks || []

  const previous = activeIndex > 0 ? lessons[activeIndex - 1] : null
  const next = activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : null

  // A lesson with QUESTION or CODE_EXERCISE blocks cannot be marked complete until every one of
  // them is done (answered correctly / solved) - the backend enforces this too (see
  // ProgressService#markComplete). Moving between lessons is never blocked by it: the sidebar lets
  // the student go anywhere, so "Proxima aula" must not be the one door that stays shut.
  const isPending = (block) =>
    (block.type === 'question' && !answeredQuestionBlockIds?.has(block.id)) ||
    (block.type === 'code_exercise' && !passedExerciseBlockIds?.has(block.id))
  const pendingBlocks = canTrackProgress ? blocks.filter(isPending) : []
  const hasPendingActivities = pendingBlocks.length > 0

  // Finishing the course is the one gate that stays, and it looks at the whole course, every time:
  // all activities done, and every other lesson marked as concluded (this one is marked by the click).
  const coursePending = canTrackProgress
    ? lessons.flatMap((item) =>
      (item.blocks || []).filter((block) => isActivity(block) && isPending(block))
        .map((block) => ({ blockId: block.id, lessonId: item.id })))
    : []
  const lessonsToMark = canTrackProgress
    ? lessons.filter(
      (item) => item.id !== lesson.id && !item.completed
        && !(item.blocks || []).some((block) => isActivity(block) && isPending(block)),
    )
    : []
  const cannotFinishCourse = !next && (coursePending.length > 0 || lessonsToMark.length > 0)

  const goToFirstMissing = () => {
    if (coursePending.length > 0) {
      const target = coursePending[0]
      if (target.lessonId === lesson.id) {
        document.getElementById(`block-${target.blockId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        onGoToActivity?.(target)
      }
    } else if (lessonsToMark.length > 0) {
      onSelectLesson(lessonsToMark[0].id)
    }
  }

  // Arriving from the "Atividades" tab: wait for the lesson's blocks to be in the DOM, then bring
  // the chosen one into view.
  useEffect(() => {
    if (!scrollToBlockId) return undefined
    const timer = setTimeout(() => {
      document.getElementById(`block-${scrollToBlockId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      onScrolledToBlock?.()
    }, 250)
    return () => clearTimeout(timer)
  }, [scrollToBlockId, lesson.id, onScrolledToBlock])

  // Advancing always navigates immediately; marking the lesson complete (if this course tracks
  // progress) happens in the background and never blocks that navigation. A lesson that still has
  // pending activities is simply left unmarked - the student can come back to it from the sidebar.
  const advance = () => {
    if (canTrackProgress && !lesson.completed && !hasPendingActivities) onCompleteLesson(lesson.id)
    if (next) onSelectLesson(next.id)
    else onBackToLanding()
  }

  return (
    <>
      <article className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 pb-10 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="btn-ghost hidden px-2 md:inline-flex"
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
          {canTrackProgress && !lesson.completed && (
            <button
              type="button"
              className="btn-secondary mt-4"
              onClick={() => onCompleteLesson(lesson.id)}
              disabled={hasPendingActivities}
              title={hasPendingActivities ? 'Resolva as atividades desta aula para poder conclui-la' : undefined}
            >
              <CheckCircle2 size={16} /> Marcar como concluida
            </button>
          )}
          {showEnrollPrompt && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-300">
              <p className="flex min-w-0 flex-1 basis-60 items-start gap-2">
                <Lock size={16} className="mt-0.5 shrink-0 text-slate-500" />
                <span>
                  Matricule-se para marcar aulas como concluidas e acompanhar seu progresso. O que voce responder
                  ou resolver aqui ja fica salvo e vale quando se matricular.
                </span>
              </p>
              <Button variant="secondary" size="sm" onClick={onEnrollClick} loading={enrolling}>
                <UserPlus size={14} /> Matricular-se
              </Button>
            </div>
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
            passedExerciseBlockIds={passedExerciseBlockIds}
            onExercisePassed={onExercisePassed}
            exercisesInteractive={exercisesInteractive}
          />
        )}
      </article>

      {/* Sticks to the bottom of the viewport while the lesson is on screen (so advancing never
        requires scrolling down to find it) and rests above the page footer at the end. */}
      <nav className="sticky bottom-0 z-30 border-t border-slate-800 bg-slate-900/95 backdrop-blur">
        {cannotFinishCourse && (
          <button
            type="button"
            onClick={goToFirstMissing}
            className="block w-full border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs font-medium text-amber-300 underline-offset-2 hover:underline sm:px-6"
          >
            {finishCourseText(coursePending.length, lessonsToMark.length)}
          </button>
        )}
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 py-3 pl-4 pr-20 sm:px-6">
          {/* Celular: so a seta (o titulo da aula anterior fica no nome acessivel); a partir de sm, com o titulo. */}
          <button
            type="button"
            onClick={() => previous && onSelectLesson(previous.id)}
            disabled={!previous}
            aria-label={previous ? `Aula anterior: ${previous.title}` : undefined}
            className={cn('btn-ghost min-w-0 text-left', !previous && 'invisible')}
          >
            <ChevronLeft size={16} className="shrink-0" />
            <span className="hidden min-w-0 truncate sm:inline">{previous?.title}</span>
          </button>
          {/* O texto do botao principal nunca e cortado: quem encolhe e o titulo da aula anterior. */}
          <Button onClick={advance} className="shrink-0 whitespace-nowrap" disabled={cannotFinishCourse}>
            <span>{next ? 'Proxima aula' : canTrackProgress ? 'Concluir curso' : 'Voltar ao curso'}</span>
            {next ? <ChevronRight size={16} /> : canTrackProgress ? <CheckCircle2 size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>
      </nav>
    </>
  )
}
