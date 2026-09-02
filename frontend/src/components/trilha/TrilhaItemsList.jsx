import { useState } from 'react'
import { CheckCircle2, ChevronDown, Circle, GraduationCap, MessageSquare, Newspaper } from 'lucide-react'
import { MaybeLink } from '@/components/ui/MaybeLink'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { courseHref, postHref } from '@/lib/contentLinks'
import { cn } from '@/lib/cn'

/**
 * Read-only, ordered view of a trilha's structure: steps (Alura-style numbered stages) each
 * holding their own items, plus whatever sits directly under the trilha with no step.
 * `manuallyCompleted` and `courseProgress` are shown side by side, never merged: marking a trilha
 * item done is independent of how far the underlying course's own lessons are.
 */
export function TrilhaItemsList({ structure, canTrackProgress, onToggleComplete }) {
  const steps = structure?.steps ?? []
  const ungroupedItems = structure?.ungroupedItems ?? []

  if (steps.length === 0 && ungroupedItems.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-500">
        Esta trilha ainda nao tem cursos ou posts.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {ungroupedItems.length > 0 && (
        <ItemRows items={ungroupedItems} canTrackProgress={canTrackProgress} onToggleComplete={onToggleComplete} />
      )}

      {steps.map((step, index) => (
        <TrilhaStep
          key={step.id}
          step={step}
          index={index}
          canTrackProgress={canTrackProgress}
          onToggleComplete={onToggleComplete}
        />
      ))}
    </div>
  )
}

function TrilhaStep({ step, index, canTrackProgress, onToggleComplete }) {
  const [collapsed, setCollapsed] = useState(false)
  const completedCount = step.items.filter((item) => item.manuallyCompleted).length

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700">
      <button
        type="button"
        onClick={() => setCollapsed((current) => !current)}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-3 bg-slate-800/60 px-4 py-3 text-left hover:bg-slate-800"
      >
        <ChevronDown size={16} className={cn('shrink-0 text-slate-500 transition-transform', collapsed && '-rotate-90')} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-200">
            {index + 1} - {step.title}
          </p>
          {step.description && <p className="mt-0.5 truncate text-xs text-slate-500">{step.description}</p>}
        </div>
        {canTrackProgress && (
          <span className="shrink-0 text-xs text-slate-500">
            {completedCount}/{step.items.length}
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="space-y-2 p-3">
          {step.items.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-slate-600">Sem itens nesta etapa.</p>
          ) : (
            <ItemRows items={step.items} canTrackProgress={canTrackProgress} onToggleComplete={onToggleComplete} />
          )}
        </div>
      )}
    </div>
  )
}

function ItemRows({ items, canTrackProgress, onToggleComplete }) {
  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <TrilhaItemRow key={item.id} item={item} index={index} canTrackProgress={canTrackProgress} onToggleComplete={onToggleComplete} />
      ))}
    </ol>
  )
}

function TrilhaItemRow({ item, index, canTrackProgress, onToggleComplete }) {
  const content = item.course ?? item.post
  const href = item.course ? courseHref(content) : postHref(content)

  return (
    <li className="rounded-xl border border-slate-700 bg-slate-800/40 p-3">
      <div className="flex items-center gap-3">
        <span className="w-6 shrink-0 text-center text-sm font-semibold text-slate-500">{index + 1}</span>

        {canTrackProgress && (
          <button
            type="button"
            onClick={() => onToggleComplete(item)}
            aria-label={item.manuallyCompleted ? 'Desmarcar como concluido' : 'Marcar como concluido'}
            className="shrink-0"
          >
            {item.manuallyCompleted ? (
              <CheckCircle2 size={20} className="text-green-400" />
            ) : (
              <Circle size={20} className="text-slate-600 hover:text-slate-400" />
            )}
          </button>
        )}

        <MaybeLink to={href} className="shrink-0">
          <Thumbnail src={content.thumbnailUrl} alt={content.name ?? content.title} className="h-14 w-24 rounded-lg" />
        </MaybeLink>

        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            {item.course ? <GraduationCap size={11} /> : <Newspaper size={11} />}
            {item.course ? 'Curso' : 'Post'}
          </span>
          <MaybeLink
            to={href}
            className={cn(
              'block truncate font-medium text-slate-100 hover:text-brand-400',
              item.manuallyCompleted && 'text-slate-400 line-through decoration-slate-600',
            )}
          >
            {content.name ?? content.title}
          </MaybeLink>
          {item.courseProgress && (
            <ProgressBar
              className="mt-1.5 max-w-xs"
              completed={item.courseProgress.completedLessons}
              total={item.courseProgress.totalLessons}
              percentage={item.courseProgress.percentage}
              showLabel
            />
          )}
        </div>
      </div>

      {item.note && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
          <MessageSquare size={13} className="mt-0.5 shrink-0 text-slate-500" />
          <span className="whitespace-pre-wrap">{item.note}</span>
        </p>
      )}
    </li>
  )
}
