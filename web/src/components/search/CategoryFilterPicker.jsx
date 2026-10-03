import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { LIMITS } from '@/lib/constants'
import { cn } from '@/lib/cn'

/**
 * Category filter as a type-to-narrow dropdown instead of a wall of always-visible chips - with
 * enough categories (or long enough ones), that wall eats the whole filter bar. The user types a
 * few letters, sees only the categories that contain them, and clicks to toggle.
 */
export function CategoryFilterPicker({ selected, options, onToggle, className }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const matches = options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
          }}
          maxLength={LIMITS.CATEGORY}
          placeholder="Categoria..."
          aria-label="Buscar categoria para filtrar"
          className="input w-40 pr-7"
        />
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500"
        />
      </div>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-56 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">Nenhuma categoria disponivel ainda.</p>
          ) : matches.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">Nenhuma categoria com "{query}".</p>
          ) : (
            matches.map((category) => {
              const active = selected.includes(category)
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onToggle(category)}
                  aria-pressed={active}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm',
                    active ? 'bg-brand-500/15 text-brand-300' : 'text-slate-300 hover:bg-slate-700',
                  )}
                >
                  <span className="min-w-0 truncate">{category}</span>
                  {active && <Check size={13} className="shrink-0" />}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
