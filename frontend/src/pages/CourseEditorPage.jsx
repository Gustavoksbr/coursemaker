import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Pencil, Save } from 'lucide-react'
import { CourseSettingsPanel } from '@/components/course/CourseSettingsPanel'
import { CurriculumEditor } from '@/components/course/CurriculumEditor'
import { StudentsModal } from '@/components/course/StudentsModal'
import { BlockListEditor } from '@/components/blocks/BlockListEditor'
import { TrilhaHighlightsPanel } from '@/components/trilha/TrilhaHighlightsPanel'
import { RelatedItemsEditor } from '@/components/related/RelatedItemsEditor'
import { Button } from '@/components/ui/Button'
import { ContentBadges } from '@/components/ui/Badge'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { UnsavedChangesPrompt } from '@/components/ui/UnsavedChangesPrompt'
import { useCurriculumDraft } from '@/hooks/useCurriculumDraft'
import { useRelatedItemsDraft } from '@/hooks/useRelatedItemsDraft'
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard'
import { useToast } from '@/context/ToastContext'
import { courseKeys, getCourseBySlug } from '@/api/courses'
import { errorMessage } from '@/lib/api'

export default function CourseEditorPage() {
  const { nickname, slug } = useParams()
  const navigate = useNavigate()

  const courseQueryKey = courseKeys.bySlug(nickname, slug)
  const { data: detail, isPending, isError, error, refetch } = useQuery({
    queryKey: courseQueryKey,
    queryFn: () => getCourseBySlug(nickname, slug),
  })

  if (isPending) return <PageLoader label="Carregando editor..." />

  if (isError) {
    return (
      <ErrorState
        title="Nao foi possivel abrir o editor"
        message={errorMessage(error, 'Este curso nao existe ou nao esta acessivel.')}
        onRetry={refetch}
      />
    )
  }

  // Only the owner edits. The API enforces it too; this just avoids a wall of 403s.
  if (!detail.isOwner) {
    return <Navigate to={`/courses/${nickname}/${slug}`} replace />
  }

  return <CourseEditorContent detail={detail} courseQueryKey={courseQueryKey} onDeleted={() => navigate('/cursos')} />
}

/**
 * Split out from `CourseEditorPage` so `useCurriculumDraft` only ever mounts once `detail` (and
 * therefore its one-time seed) is actually loaded - calling it before that would seed an empty
 * draft that never gets a second chance, since a reducer's lazy init only runs on mount.
 */
function CourseEditorContent({ detail, courseQueryKey, onDeleted }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const [studentsOpen, setStudentsOpen] = useState(false)

  const course = detail.summary
  const curriculumDraft = useCurriculumDraft(course.id, detail.modules)
  const relatedDraft = useRelatedItemsDraft('course', course.id)
  const isDirty = curriculumDraft.isDirty || relatedDraft.isDirty
  const blocker = useUnsavedChangesGuard(isDirty)

  const activeLessonId = searchParams.get('lesson')

  const selectLesson = (lessonId) => {
    const params = new URLSearchParams(searchParams)
    if (lessonId) params.set('lesson', lessonId)
    else params.delete('lesson')
    setSearchParams(params, { replace: true })
  }

  // Land on the first lesson so the content column is never pointlessly empty.
  useEffect(() => {
    if (!activeLessonId && curriculumDraft.modules.length) {
      const first = curriculumDraft.modules.flatMap((module) => module.lessons)[0]
      if (first) selectLesson(first.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculumDraft.modules, activeLessonId])

  const activeLesson = curriculumDraft.modules
    .flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title })))
    .find((lesson) => lesson.id === activeLessonId)

  // Curriculum and related items are independent drafts on this page, so one failing should not
  // block the other from committing - each gets its own outcome/toast.
  const handleSave = async () => {
    const [curriculumResult, relatedResult] = await Promise.allSettled([curriculumDraft.flush(), relatedDraft.flush()])

    if (curriculumResult.status === 'fulfilled') {
      const { lessonIdRemap } = curriculumResult.value
      // The active lesson may have been a just-created (temp-id) one; follow it to its real id so
      // the editor does not appear to have deselected the lesson the user was just looking at.
      if (activeLessonId && lessonIdRemap[activeLessonId]) {
        selectLesson(lessonIdRemap[activeLessonId])
      }
    } else {
      const error = curriculumResult.reason
      if (activeLessonId && error.lessonIdRemap?.[activeLessonId]) {
        selectLesson(error.lessonIdRemap[activeLessonId])
      }
      const label = error.draftStepLabel
      toast.error(errorMessage(error, label ? `Nao foi possivel salvar ${label}.` : 'Nao foi possivel salvar o curriculo.'))
    }

    if (relatedResult.status === 'rejected') {
      const error = relatedResult.reason
      const label = error.draftStepLabel
      toast.error(errorMessage(error, label ? `Nao foi possivel salvar ${label}.` : 'Nao foi possivel salvar os relacionados.'))
    }

    if (curriculumResult.status === 'fulfilled' && relatedResult.status === 'fulfilled') {
      toast.success('Alteracoes salvas.')
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <header className="mb-6 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-slate-100">{course.name}</h1>
            <p className="truncate text-xs text-slate-500">
              /courses/{course.owner.nickname}/{course.slug}
            </p>
          </div>

          <ContentBadges
            status={course.status}
            visibility={course.visibility}
            featured={course.featured}
          />

          {isDirty && (
            <Button onClick={handleSave} loading={curriculumDraft.isFlushing || relatedDraft.isFlushing}>
              <Save size={16} /> Salvar alteracoes
            </Button>
          )}

          <Link
            to={`/courses/${course.owner.nickname}/${course.slug}`}
            className="btn-secondary text-xs"
          >
            <ExternalLink size={14} /> Ver como aluno
          </Link>
        </header>

        <CourseSettingsPanel
          course={course}
          landingDescription={detail.landingDescription}
          courseQueryKey={courseQueryKey}
          onDeleted={onDeleted}
          onOpenStudents={() => setStudentsOpen(true)}
        />

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <TrilhaHighlightsPanel courseId={course.id} />
          <RelatedItemsEditor kind="course" contentId={course.id} draft={relatedDraft} />
        </div>

        <div className="mt-8 flex gap-6">
          <aside className="hidden w-72 shrink-0 md:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-slate-800">
              <CurriculumEditor
                draft={curriculumDraft}
                activeLessonId={activeLessonId}
                onSelectLesson={selectLesson}
              />
            </div>
          </aside>

          <section className="min-w-0 flex-1">
            {activeLesson ? (
              <div className="mx-auto max-w-3xl">
                <div className="mb-5 border-b border-slate-800 pb-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {activeLesson.moduleTitle}
                  </p>
                  <h2 className="mt-1 break-words text-xl font-bold text-slate-100">{activeLesson.title}</h2>
                </div>

                <BlockListEditor
                  key={activeLesson.id}
                  parentId={activeLesson.id}
                  api={curriculumDraft.blocksApiFor(activeLesson.id)}
                  queryKey={curriculumDraft.blockQueryKeyFor(activeLesson.id)}
                  emptyMessage="Adicione texto, codigo, imagens ou videos a esta licao."
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 p-10 text-center">
                <Pencil className="text-slate-700" size={32} />
                <div>
                  <p className="font-semibold text-slate-300">Nenhuma licao selecionada</p>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    Crie um modulo e uma licao no painel de curriculo para comecar a montar o
                    conteudo.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Below md the curriculum sidebar has nowhere sensible to go; point people at a wider
            viewport rather than shipping a cramped layout. */}
        <p className="mt-6 text-center text-xs text-slate-500 md:hidden">
          O curriculo funciona melhor em telas maiores. Use um monitor mais largo para navegar
          entre modulos e licoes.
        </p>
      </div>

      <StudentsModal open={studentsOpen} onClose={() => setStudentsOpen(false)} course={course} />
      <UnsavedChangesPrompt blocker={blocker} />
    </>
  )
}
