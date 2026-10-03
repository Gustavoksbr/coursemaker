import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Prev/next arrow pagination - no page-number jump list, just "Pagina X de Y" and two arrows. */
export function Pagination({ page, totalPages, onChange, className }) {
  if (totalPages <= 1) return null

  return (
    <nav className={cn('flex items-center justify-center gap-4', className)} aria-label="Paginacao">
      <button
        type="button"
        className="btn-ghost px-2"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        aria-label="Pagina anterior"
      >
        <ChevronLeft size={16} /> Anterior
      </button>

      <span className="text-sm text-slate-400">
        Pagina {page + 1} de {totalPages}
      </span>

      <button
        type="button"
        className="btn-ghost px-2"
        disabled={page >= totalPages - 1}
        onClick={() => onChange(page + 1)}
        aria-label="Proxima pagina"
      >
        Proxima <ChevronRight size={16} />
      </button>
    </nav>
  )
}
