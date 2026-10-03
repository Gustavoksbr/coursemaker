import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, X } from 'lucide-react'
import { Select } from '@/components/ui/Field'
import { CategoryFilterPicker } from './CategoryFilterPicker'
import { areaKeys, listAreas } from '@/api/areas'
import { listSchools, schoolKeys } from '@/api/schools'
import { LIMITS, SORT_OPTIONS, VISIBILITY } from '@/lib/constants'
import { cn } from '@/lib/cn'

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
  const { data: areas } = useQuery({ queryKey: areaKeys.list(), queryFn: listAreas })
  const selectedAreas = filters.areas ?? []
  const { data: schools } = useQuery({ queryKey: schoolKeys.list(), queryFn: listSchools })

  const toggleCategory = (category) => {
    const selected = filters.categories.includes(category)
      ? filters.categories.filter((item) => item !== category)
      : [...filters.categories, category]
    onChange({ ...filters, categories: selected, page: 0 })
  }

  const toggleArea = (slug) => {
    const selected = selectedAreas.includes(slug)
      ? selectedAreas.filter((item) => item !== slug)
      : [...selectedAreas, slug]
    onChange({ ...filters, areas: selected, page: 0 })
  }

  const hasActiveFilters =
    filters.author ||
    filters.visibility ||
    filters.categories.length > 0 ||
    selectedAreas.length > 0 ||
    filters.school ||
    filters.sort !== 'recent'

  return (
    <div className="space-y-3">
      {/* Areas are a short, admin-curated list, so plain toggle chips beat a dropdown here -
          the whole taxonomy stays visible, which is the point of demoting area to a filter. */}
      {areas?.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {areas.map((area) => {
            const active = selectedAreas.includes(area.slug)
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => toggleArea(area.slug)}
                aria-pressed={active}
                className={cn(
                  'badge border transition-colors',
                  active
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:text-slate-100',
                )}
              >
                {area.name}
              </button>
            )
          })}
        </div>
      )}

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

        {schools?.length > 0 && (
          <Select
            value={filters.school ?? ''}
            onChange={(event) => onChange({ ...filters, school: event.target.value, page: 0 })}
            aria-label="Filtrar por escola"
            className="w-44"
          >
            <option value="">Todas as escolas</option>
            {schools.map((school) => (
              <option key={school.id} value={school.slug}>
                {school.name}
              </option>
            ))}
          </Select>
        )}

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
              onChange({
                ...filters,
                author: '',
                visibility: '',
                categories: [],
                areas: [],
                school: '',
                sort: 'recent',
                page: 0,
              })
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
  areas: [],
  school: '',
  sort: 'recent',
  page: 0,
}
