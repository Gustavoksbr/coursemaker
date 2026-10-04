import { useState } from 'react'
import { BookOpen, CheckCircle2, ChevronDown, CirclePlay, ClipboardList } from 'lucide-react'
import { lessonActivityCounts, lessonKind } from '@/lib/lessonActivities'
import { cn } from '@/lib/cn'

const KIND_ICON = { reading: BookOpen, video: CirclePlay, activity: ClipboardList }
const KIND_LABEL = { reading: 'Leitura', video: 'Video', activity: 'Atividade' }

/**
 * Read-only curriculum navigation for the course viewer: modules collapse, the active lesson is
 * highlighted, and completed lessons get a green check.
 *
 * Each lesson's icon is automatic (see `lessonKind`): reading, video, or - amber, and winning over
 * the others - activity when it holds a question or a code exercise. With `showProgress`, an
 * activity lesson also shows how many of its activities are done ("0/2").
 */
export function CurriculumNav({
  modules,
  activeLessonId,
  onSelectLesson,
  answeredQuestionBlockIds,
  passedExerciseBlockIds,
  showProgress = false,
}) {
  // Everything starts expanded; the module holding the active lesson must never be hidden.
  const [collapsed, setCollapsed] = useState(() => new Set())

  const toggle = (moduleId) => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  if (!modules?.length) {
    return <p className="px-4 py-6 text-sm text-slate-500">Este curso ainda nao tem modulos.</p>
  }

  return (
    <nav aria-label="Conteudo do curso" className="space-y-1">
      {modules.map((module, moduleIndex) => {
        const isCollapsed = collapsed.has(module.id)
        const completedCount = module.lessons.filter((lesson) => lesson.completed).length

        return (
          <div key={module.id}>
            <button
              type="button"
              onClick={() => toggle(module.id)}
              aria-expanded={!isCollapsed}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-slate-800"
            >
              <ChevronDown
                size={16}
                className={cn('shrink-0 text-slate-500 transition-transform', isCollapsed && '-rotate-90')}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-200">
                  {moduleIndex + 1}. {module.title}
                </span>
                <span className="text-xs text-slate-500">
                  {completedCount}/{module.lessons.length} concluida(s)
                </span>
              </span>
            </button>

            {!isCollapsed && (
              <ul className="ml-5 space-y-0.5 border-l border-slate-700 pl-2">
                {module.lessons.map((lesson) => {
                  const active = lesson.id === activeLessonId
                  const kind = lessonKind(lesson.blocks)
                  const KindIcon = KIND_ICON[kind]
                  const counts =
                    showProgress && kind === 'activity'
                      ? lessonActivityCounts(lesson, answeredQuestionBlockIds, passedExerciseBlockIds)
                      : null
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        onClick={() => onSelectLesson(lesson.id)}
                        aria-current={active ? 'true' : undefined}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                          active
                            ? 'bg-brand-500/10 font-medium text-brand-300'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                        )}
                      >
                        <KindIcon
                          size={15}
                          aria-label={KIND_LABEL[kind]}
                          className={cn('shrink-0', kind === 'activity' ? 'text-amber-400' : 'text-slate-500')}
                        />
                        <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                        {lesson.completed ? (
                          <CheckCircle2 size={15} className="shrink-0 text-green-400" aria-label="Concluida" />
                        ) : (
                          counts && (
                            <span
                              title="atividades feitas nesta aula"
                              className="shrink-0 text-xs tabular-nums text-slate-500"
                            >
                              {counts.done}/{counts.total}
                            </span>
                          )
                        )}
                      </button>
                    </li>
                  )
                })}
                {module.lessons.length === 0 && (
                  <li className="px-3 py-2 text-xs text-slate-600">Sem licoes neste modulo.</li>
                )}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}

/** Flattens the curriculum into lesson order, for previous/next navigation. */
export function flattenLessons(modules) {
  return (modules ?? []).flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title })),
  )
}
