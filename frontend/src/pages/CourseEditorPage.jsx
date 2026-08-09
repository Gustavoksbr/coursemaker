import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Pencil } from 'lucide-react'
import { CourseSettingsPanel } from '@/components/course/CourseSettingsPanel'
import { CurriculumEditor } from '@/components/course/CurriculumEditor'
import { StudentsModal } from '@/components/course/StudentsModal'
import { BlockListEditor } from '@/components/blocks/BlockListEditor'
import { TrilhaHighlightsPanel } from '@/components/trilha/TrilhaHighlightsPanel'
import { RelatedItemsEditor } from '@/components/related/RelatedItemsEditor'
import { ContentBadges } from '@/components/ui/Badge'
import { ErrorState, PageLoader } from '@/components/ui/Feedback'
import { useAuth } from '@/context/AuthContext'
import { blockKeys } from '@/api/shared'
import {
  courseKeys,
  createLessonBlock,
  deleteLessonBlock,
  getCourseBySlug,
  listLessonBlocks,
  reorderLessonBlocks,
  updateLessonBlock,
} from '@/api/courses'
import { errorMessage } from '@/lib/api'

const lessonBlockApi = {
  list: listLessonBlocks,
  create: createLessonBlock,
  update: updateLessonBlock,
  remove: deleteLessonBlock,
  reorder: reorderLessonBlocks,
}

export default function CourseEditorPage() {
  const { nickname, slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [studentsOpen, setStudentsOpen] = useState(false)

  const courseQueryKey = courseKeys.bySlug(nickname, slug)
  const { data: detail, isPending, isError, error, refetch } = useQuery({
    queryKey: courseQueryKey,
    queryFn: () => getCourseBySlug(nickname, slug),
  })

  const activeLessonId = searchParams.get('lesson')

  const selectLesson = (lessonId) => {
    const params = new URLSearchParams(searchParams)
    if (lessonId) params.set('lesson', lessonId)
    else params.delete('lesson')
    setSearchParams(params, { replace: true })
  }

  // Land on the first lesson so the content column is never pointlessly empty.
  useEffect(() => {
    if (!activeLessonId && detail?.modules?.length) {
      const first = detail.modules.flatMap((module) => module.lessons)[0]
      if (first) selectLesson(first.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, activeLessonId])

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

  const course = detail.summary
  const activeLesson = detail.modules
    .flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title })))
    .find((lesson) => lesson.id === activeLessonId)

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
          onDeleted={() => navigate('/cursos')}
          onOpenStudents={() => setStudentsOpen(true)}
        />

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <TrilhaHighlightsPanel courseId={course.id} />
          <RelatedItemsEditor kind="course" contentId={course.id} />
        </div>

        <div className="mt-8 flex gap-6">
          <aside className="hidden w-72 shrink-0 md:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-slate-800">
              <CurriculumEditor
                courseId={course.id}
                modules={detail.modules}
                activeLessonId={activeLessonId}
                onSelectLesson={selectLesson}
                courseQueryKey={courseQueryKey}
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
                  api={lessonBlockApi}
                  queryKey={blockKeys.lesson(activeLesson.id)}
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
    </>
  )
}
