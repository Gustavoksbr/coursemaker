import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Mail, Pencil, Save, X } from 'lucide-react'
import { CoursePreview } from '@/components/course/CoursePreview'
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
import { useCourseSettingsDraft } from '@/hooks/useCourseSettingsDraft'
import { useCurriculumDraft } from '@/hooks/useCurriculumDraft'
import { useRelatedItemsDraft } from '@/hooks/useRelatedItemsDraft'
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard'
import { useToast } from '@/context/ToastContext'
import { courseKeys, getCourseBySlug } from '@/api/courses'
import { errorMessage } from '@/lib/api'
import { courseHref } from '@/lib/contentLinks'

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

  return (
    <CourseEditorContent
      detail={detail}
      courseQueryKey={courseQueryKey}
      onDeleted={() => navigate('/pesquisar?tab=cursos')}
    />
  )
}

/**
 * Split out from `CourseEditorPage` so `useCurriculumDraft` only ever mounts once `detail` (and
 * therefore its one-time seed) is actually loaded - calling it before that would seed an empty
 * draft that never gets a second chance, since a reducer's lazy init only runs on mount.
 */
function CourseEditorContent({ detail, courseQueryKey, onDeleted }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const [studentsOpen, setStudentsOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const course = detail.summary
  const curriculumDraft = useCurriculumDraft(course.id, detail.modules)
  const relatedDraft = useRelatedItemsDraft('course', course.id)
  const settingsDraft = useCourseSettingsDraft(course, detail.landingDescription, courseQueryKey)
  const isDirty = curriculumDraft.isDirty || relatedDraft.isDirty || settingsDraft.isDirty
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

  // Curriculum, related items and settings are independent drafts on this page, so one failing
  // should not block the others from committing - each gets its own outcome/toast.
  const handleSave = async () => {
    const [curriculumResult, relatedResult, settingsResult] = await Promise.allSettled([
      curriculumDraft.flush(),
      relatedDraft.flush(),
      settingsDraft.flush(),
    ])

    if (curriculumResult.status === 'fulfilled') {
      const { lessonIdRemap } = curriculumResult.value
      // The active lesson may have been a just-created (temp-id) one; follow it to its real id so
      // the editor does not appear to have deselected the lesson the user was just looking at.
      if (activeLessonId && lessonIdRemap[activeLessonId]) {
        selectLesson(lessonIdRemap[activeLessonId])
      }
      // The public course page (and this editor's own initial load) share this exact query key -
      // without invalidating it here, navigating to the course page right after saving would show
      // whatever was cached from before this save, not what was just published.
      queryClient.invalidateQueries({ queryKey: courseQueryKey })
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

    if (settingsResult.status === 'rejected') {
      const error = settingsResult.reason
      const label = error.draftStepLabel
      toast.error(errorMessage(error, label ? `Nao foi possivel salvar ${label}.` : 'Nao foi possivel salvar as configuracoes.'))
    }

    if (curriculumResult.status === 'fulfilled' && relatedResult.status === 'fulfilled' && settingsResult.status === 'fulfilled') {
      toast.success('Alteracoes salvas.')
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <header className="sticky top-16 z-30 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-slate-100">{course.name}</h1>
            <p className="truncate text-xs text-slate-500">
              {courseHref(course)}
            </p>
          </div>

          <ContentBadges
            status={course.status}
            visibility={course.visibility}
            featured={course.featured}
            blockedByAdmin={course.blockedByAdmin}
            school={course.school}
          />

          <Button
            onClick={handleSave}
            disabled={!isDirty}
            loading={curriculumDraft.isFlushing || relatedDraft.isFlushing || settingsDraft.isFlushing}
            title={isDirty ? undefined : 'Faca uma alteracao para poder salvar'}
          >
            <Save size={16} /> Salvar alteracoes
          </Button>

          <button type="button" onClick={() => setPreviewOpen(true)} className="btn-secondary text-xs">
            <Eye size={14} /> Pre-visualizar
          </button>

          {/* Navigating away while dirty is already intercepted by useUnsavedChangesGuard's
              blocker below, which shows the confirm prompt - so this only needs to ask for the
              destination, not duplicate that confirmation logic. */}
          <button
            type="button"
            onClick={() => navigate(courseHref(course))}
            className="btn-ghost text-xs"
          >
            <X size={14} /> Cancelar alteracoes
          </button>
        </header>

        {/* Blocked warning */}
        {course.blockedByAdmin && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-semibold text-red-400">⚠️ Conteúdo bloqueado por administrador</h4>
                <p className="mt-1 text-sm text-slate-300">
                  Este curso foi bloqueado e não está visível ao público. Entre em contato com a equipe para mais
                  informações.
                </p>
              </div>
              <Link to="/mensagens/admin" className="btn-secondary flex items-center gap-2 whitespace-nowrap text-sm">
                <Mail size={16} />
                Falar com admin
              </Link>
            </div>
          </div>
        )}

        <CourseSettingsPanel
          course={course}
          draft={settingsDraft}
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
                  draft={curriculumDraft.blocksDraftFor(activeLesson.id)}
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

      {previewOpen && (
        <CoursePreview
          course={{ ...course, ...settingsDraft.form }}
          landingDescription={settingsDraft.form.landingDescription}
          modules={curriculumDraft.modules}
          curriculumDraft={curriculumDraft}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  )
}
