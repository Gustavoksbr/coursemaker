import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Builds a compact page list: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(current, totalPages) {
  const pages = new Set([0, totalPages - 1, current])
  for (let offset = 1; offset <= 1; offset++) {
    if (current - offset >= 0) pages.add(current - offset)
    if (current + offset < totalPages) pages.add(current + offset)
  }
  return [...pages].sort((a, b) => a - b)
}

export function Pagination({ page, totalPages, onChange, className }) {
  if (totalPages <= 1) return null

  const pages = pageWindow(page, totalPages)

  return (
    <nav className={cn('flex items-center justify-center gap-1', className)} aria-label="Paginacao">
      <button
        type="button"
        className="btn-ghost px-2"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        aria-label="Pagina anterior"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((candidate, index) => {
        const previous = pages[index - 1]
        const gap = previous != null && candidate - previous > 1
        return (
          <span key={candidate} className="flex items-center gap-1">
            {gap && <span className="px-1 text-slate-600">…</span>}
            <button
              type="button"
              onClick={() => onChange(candidate)}
              aria-current={candidate === page ? 'page' : undefined}
              className={cn(
                'min-w-9 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                candidate === page
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-300 hover:bg-slate-800',
              )}
            >
              {candidate + 1}
            </button>
          </span>
        )
      })}

      <button
        type="button"
        className="btn-ghost px-2"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
        aria-label="Proxima pagina"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}
