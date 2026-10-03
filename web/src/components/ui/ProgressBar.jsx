import { cn } from '@/lib/cn'

/** Visual X / Total, generic enough for lessons, trilha items, or anything else countable. */
export function ProgressBar({
  completed = 0,
  total = 0,
  percentage,
  showLabel = true,
  className,
  unit = { singular: 'licao', plural: 'licoes' },
  ariaLabel = 'Progresso',
}) {
  const percent = percentage ?? (total === 0 ? 0 : Math.round((completed / total) * 100))

  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            {completed} de {total} {total === 1 ? unit.singular : unit.plural}
          </span>
          <span className="font-semibold text-brand-400">{percent}%</span>
        </div>
      )}
      <div
        className={cn('h-1.5 overflow-hidden rounded-full bg-slate-700')}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
