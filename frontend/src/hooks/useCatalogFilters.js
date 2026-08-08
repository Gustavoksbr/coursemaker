import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EMPTY_FILTERS } from '@/components/search/CatalogFilters'

/**
 * Keeps the catalogue filters in the URL, so a filtered listing can be shared, bookmarked and
 * navigated back to.
 */
export function useCatalogFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') ?? '',
      author: searchParams.get('author') ?? '',
      visibility: searchParams.get('visibility') ?? '',
      categories: searchParams.getAll('category'),
      sort: searchParams.get('sort') ?? EMPTY_FILTERS.sort,
      page: Math.max(0, Number(searchParams.get('page') ?? 0) || 0),
    }),
    [searchParams],
  )

  const setFilters = useCallback(
    (next) => {
      const params = new URLSearchParams()
      if (next.q) params.set('q', next.q)
      if (next.author) params.set('author', next.author)
      if (next.visibility) params.set('visibility', next.visibility)
      next.categories.forEach((category) => params.append('category', category))
      if (next.sort && next.sort !== EMPTY_FILTERS.sort) params.set('sort', next.sort)
      if (next.page > 0) params.set('page', String(next.page))
      setSearchParams(params, { replace: true })
    },
    [setSearchParams],
  )

  return [filters, setFilters]
}
