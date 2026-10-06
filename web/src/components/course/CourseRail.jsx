import { CheckCircle2, PanelLeftOpen } from 'lucide-react'
import { KIND_ICON, KIND_LABEL } from './CurriculumNav'
import { lessonKind } from '@/lib/lessonActivities'
import { cn } from '@/lib/cn'

/**
 * Menu das aulas minimizado: uma faixa estreita, sempre a mostra, com um icone por aula (o tipo da
 * aula, ou o "visto" verde quando concluida). A aula aberta fica destacada e o nome aparece ao passar
 * o mouse. O botao do topo maximiza o menu: em telas largas a barra completa volta ao lado, em telas
 * estreitas ela abre por cima do conteudo.
 */
export function CourseRail({ modules, activeLessonId, onSelectLesson, onExpand, onExpandDrawer, showProgress }) {
  return (
    <nav aria-label="Aulas (menu minimizado)" className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-slate-800 py-3">
      <button
        type="button"
        onClick={onExpandDrawer}
        className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 md:hidden"
        aria-label="Maximizar menu das aulas"
      >
        <PanelLeftOpen size={18} />
      </button>
      <button
        type="button"
        onClick={onExpand}
        className="hidden rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 md:block"
        aria-label="Maximizar menu das aulas"
      >
        <PanelLeftOpen size={18} />
      </button>

      <div className="mt-1 flex w-full flex-col items-center gap-0.5 overflow-y-auto">
        {modules.map((module, moduleIndex) => (
          <div key={module.id} className="flex w-full flex-col items-center gap-0.5">
            {moduleIndex > 0 && <span className="my-1 h-px w-6 bg-slate-800" aria-hidden="true" />}
            {module.lessons.map((lesson) => {
              const kind = lessonKind(lesson.blocks)
              const Icon = KIND_ICON[kind]
              const active = lesson.id === activeLessonId
              const done = showProgress && lesson.completed
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => onSelectLesson(lesson.id)}
                  title={`${lesson.title} (${KIND_LABEL[kind]}${done ? ', concluida' : ''})`}
                  aria-label={lesson.title}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'rounded-lg p-2 transition-colors',
                    active ? 'bg-brand-500/15 text-brand-300' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200',
                  )}
                >
                  {done ? (
                    <CheckCircle2 size={16} className="text-green-400" />
                  ) : (
                    <Icon size={16} className={kind === 'activity' && !active ? 'text-amber-400' : undefined} />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </nav>
  )
}
