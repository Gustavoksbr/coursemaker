import { SlidersHorizontal, X } from 'lucide-react'
import { Select } from '@/components/ui/Field'
import { CategoryFilterPicker } from './CategoryFilterPicker'
import { LIMITS, SORT_OPTIONS, VISIBILITY } from '@/lib/constants'

/**
 * Filter bar shared by /cursos and /posts.
 *
 * Categories are picked through a type-to-narrow dropdown (see CategoryFilterPicker) rather than
 * rendered as a wall of always-visible chips: with enough categories, or long ones, that wall would
 * eat the whole filter bar. Only the categories actually selected stay visible, as removable chips
 * below the main row.
 *
 * `availableCategories` comes from whatever is on the current results page - there is no endpoint
 * that enumerates every category, so this keeps the options relevant to what is actually reachable.
 */
export function CatalogFilters({ filters, onChange, availableCategories = [] }) {
  const options = [...new Set([...filters.categories, ...availableCategories])].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )

  const toggleCategory = (category) => {
    const selected = filters.categories.includes(category)
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category]
    onChange({ ...filters, categories: selected, page: 0 })
  }

  const hasActiveFilters =
    filters.author || filters.visibility || filters.categories.length > 0 || filters.sort !== 'recent'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-400">
          <SlidersHorizontal size={15} /> Filtros
        </span>

        <input
          type="text"
          value={filters.author}
          maxLength={LIMITS.AUTHOR_FILTER}
          onChange={(event) => onChange({ ...filters, author: event.target.value, page: 0 })}
          placeholder="Autor (nickname)"
          aria-label="Filtrar por autor"
          className="input w-44"
        />

        <Select
          value={filters.visibility}
          onChange={(event) => onChange({ ...filters, visibility: event.target.value, page: 0 })}
          aria-label="Filtrar por visibilidade"
          className="w-40"
        >
          <option value="">Todas visibilidades</option>
          <option value={VISIBILITY.PUBLIC}>Publicos</option>
          <option value={VISIBILITY.PRIVATE}>Privados</option>
        </Select>

        <Select
          value={filters.sort}
          onChange={(event) => onChange({ ...filters, sort: event.target.value, page: 0 })}
          aria-label="Ordenar"
          className="w-44"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <CategoryFilterPicker selected={filters.categories} options={options} onToggle={toggleCategory} />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() =>
              onChange({ ...filters, author: '', visibility: '', categories: [], sort: 'recent', page: 0 })
            }
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
          >
            <X size={13} /> Limpar
          </button>
        )}
      </div>

      {filters.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className="badge max-w-full break-all bg-brand-500 text-white hover:bg-brand-600"
            >
              <span className="truncate">{category}</span>
              <X size={12} className="shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export const EMPTY_FILTERS = {
  q: '',
  author: '',
  visibility: '',
  categories: [],
  sort: 'recent',
  page: 0,
}
