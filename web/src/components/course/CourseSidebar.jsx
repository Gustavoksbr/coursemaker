import { useState } from 'react'
import { BookOpen, CircleCheck, CirclePlay, ClipboardList, ListChecks, SquareTerminal } from 'lucide-react'
import { CurriculumNav } from './CurriculumNav'
import { courseActivitiesByModule } from '@/lib/lessonActivities'
import { cn } from '@/lib/cn'

/**
 * The student's course sidebar: "Aulas" (the curriculum, with automatic lesson icons) and
 * "Atividades" (every question and code exercise of the course, grouped by module, filterable).
 *
 * `showProgress` is false for anonymous viewers and the owner: with no progress to report, a "0/7"
 * would only be misleading, so counters and the pending filter disappear.
 */
export function CourseSidebar({
  modules,
  activeLessonId,
  onSelectLesson,
  onSelectActivity,
  answeredQuestionBlockIds,
  passedExerciseBlockIds,
  showProgress,
}) {
  const [tab, setTab] = useState('lessons')
  const [filter, setFilter] = useState('all')

  const groups = courseActivitiesByModule(modules, answeredQuestionBlockIds, passedExerciseBlockIds)
  const total = groups.reduce((sum, group) => sum + group.items.length, 0)
  const done = groups.reduce((sum, group) => sum + group.items.filter((item) => item.done).length, 0)
  const hasActivities = total > 0

  return (
    <div>
      {hasActivities && (
        <div role="tablist" className="mb-3 flex rounded-lg border border-slate-700 p-0.5 text-sm">
          <TabButton active={tab === 'lessons'} onClick={() => setTab('lessons')}>
            Aulas
          </TabButton>
          <TabButton active={tab === 'activities'} onClick={() => setTab('activities')}>
            Atividades
            {showProgress && (
              <span className="ml-1.5 rounded bg-slate-700/70 px-1.5 text-xs tabular-nums text-slate-300">
                {done}/{total}
              </span>
            )}
          </TabButton>
        </div>
      )}

      {tab === 'lessons' || !hasActivities ? (
        <>
          <CurriculumNav
            modules={modules}
            activeLessonId={activeLessonId}
            onSelectLesson={onSelectLesson}
            answeredQuestionBlockIds={answeredQuestionBlockIds}
            passedExerciseBlockIds={passedExerciseBlockIds}
            showProgress={showProgress}
          />
          <Legend />
        </>
      ) : (
        <ActivitiesList
          groups={groups}
          total={total}
          done={done}
          filter={filter}
          onFilter={setFilter}
          onSelect={onSelectActivity}
          showProgress={showProgress}
        />
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex-1 rounded-md px-3 py-1.5 font-medium transition-colors',
        active ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200',
      )}
    >
      {children}
    </button>
  )
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-800 px-1 pt-3 text-[11px] text-slate-500">
      <span className="inline-flex items-center gap-1">
        <BookOpen size={12} /> Leitura
      </span>
      <span className="inline-flex items-center gap-1">
        <CirclePlay size={12} /> Video
      </span>
      <span className="inline-flex items-center gap-1">
        <ClipboardList size={12} className="text-amber-400" /> Atividade
      </span>
    </div>
  )
}

function ActivitiesList({ groups, total, done, filter, onFilter, onSelect, showProgress }) {
  const pending = total - done
  const visibleGroups = groups
    .map((group) => ({ ...group, items: filter === 'pending' ? group.items.filter((item) => !item.done) : group.items }))
    .filter((group) => group.items.length > 0)

  return (
    <div className="space-y-3">
      {showProgress && (
        <div className="flex gap-1.5 text-xs">
          <FilterChip active={filter === 'all'} onClick={() => onFilter('all')}>
            Todas ({total})
          </FilterChip>
          <FilterChip active={filter === 'pending'} onClick={() => onFilter('pending')}>
            Pendentes ({pending})
          </FilterChip>
        </div>
      )}

      {visibleGroups.length === 0 ? (
        <p className="px-1 py-4 text-sm text-slate-500">Nenhuma atividade pendente. Bom trabalho!</p>
      ) : (
        visibleGroups.map((group) => (
          <div key={group.moduleId}>
            <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group.moduleNumber}. {group.moduleTitle}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.kind === 'exercise' ? SquareTerminal : ListChecks
                return (
                  <li key={item.blockId}>
                    <button
                      type="button"
                      onClick={() => onSelect(item)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-300 hover:bg-slate-800"
                    >
                      <Icon size={15} className={cn('shrink-0', item.kind === 'exercise' ? 'text-sky-400' : 'text-slate-400')} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{item.title}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {item.kind === 'exercise' ? 'Exercicio de codigo' : 'Questao'} · {item.lessonTitle}
                        </span>
                      </span>
                      {showProgress &&
                        (item.done ? (
                          <CircleCheck size={15} className="shrink-0 text-green-400" />
                        ) : (
                          <span title="pendente" className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                        ))}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}

      <p className="px-1 text-xs text-slate-600">Clicar numa atividade abre a aula e rola ate o bloco dela.</p>
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-2.5 py-1 font-medium transition-colors',
        active ? 'border-brand-500 bg-brand-500/10 text-brand-300' : 'border-slate-700 text-slate-400 hover:text-slate-200',
      )}
    >
      {children}
    </button>
  )
}
