import { Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { LIMITS } from '@/lib/constants'

/**
 * Controlled search input. Debouncing belongs to the caller (`useDebounce`), so the field itself
 * stays instantly responsive while the query lags behind.
 */
export function SearchBar({ value, onChange, placeholder = 'Buscar...', size = 'md', className, autoFocus }) {
  return (
    <div className={cn('relative', className)}>
      <Search
        size={size === 'lg' ? 20 : 16}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
      />
      <input
        type="search"
        role="searchbox"
        value={value}
        autoFocus={autoFocus}
        maxLength={LIMITS.SEARCH_QUERY}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          'input pl-11 pr-11',
          size === 'lg' && 'py-3.5 pl-12 text-base',
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-300"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
