import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Spinner({ className, size = 20 }) {
  return <Loader2 size={size} className={cn('animate-spin text-brand-400', className)} />
}

export function PageLoader({ label = 'Carregando...' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-400">
      <Spinner size={28} />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ErrorState({ title = 'Algo deu errado', message, onRetry }) {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="text-amber-400" size={28} />
      <div>
        <p className="font-semibold text-slate-200">{title}</p>
        {message && <p className="mt-1 max-w-md text-sm text-slate-400">{message}</p>}
      </div>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, message, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700 px-6 py-12 text-center',
        className,
      )}
    >
      {Icon && <Icon className="text-slate-600" size={32} />}
      <div>
        <p className="font-semibold text-slate-300">{title}</p>
        {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      </div>
      {action}
    </div>
  )
}

/** Placeholder card matching CourseCard's footprint, so lists do not jump when data arrives. */
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
      <div className="aspect-video animate-pulse bg-slate-700/60" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-700/60" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-700/40" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-700/40" />
      </div>
    </div>
  )
}

export function CardSkeletonGrid({ count = 6 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  )
}
