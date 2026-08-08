import { useState } from 'react'
import { CheckCircle2, ChevronDown, Circle, PlayCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Read-only curriculum navigation for the course viewer: modules collapse, the active lesson is
 * highlighted, and completed lessons get a green check when progress tracking is on.
 */
export function CurriculumNav({ modules, activeLessonId, onSelectLesson, progressEnabled }) {
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
                  {progressEnabled
                    ? `${completedCount}/${module.lessons.length} concluida(s)`
                    : `${module.lessons.length} licao(oes)`}
                </span>
              </span>
            </button>

            {!isCollapsed && (
              <ul className="ml-5 space-y-0.5 border-l border-slate-700 pl-2">
                {module.lessons.map((lesson) => {
                  const active = lesson.id === activeLessonId
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
                        {progressEnabled ? (
                          lesson.completed ? (
                            <CheckCircle2 size={15} className="shrink-0 text-green-400" />
                          ) : (
                            <Circle size={15} className="shrink-0 text-slate-600" />
                          )
                        ) : (
                          <PlayCircle
                            size={15}
                            className={cn('shrink-0', active ? 'text-brand-400' : 'text-slate-600')}
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
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
