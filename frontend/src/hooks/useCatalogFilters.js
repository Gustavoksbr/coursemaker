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
      // Start from whatever is already in the URL (functional form, so this always sees the
      // latest params even if called twice in one tick) and only touch the keys this hook owns -
      // an unrelated param a page might have added (e.g. `tab` on the search page) must survive.
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          params.delete('q')
          params.delete('author')
          params.delete('visibility')
          params.delete('category')
          params.delete('sort')
          params.delete('page')
          if (next.q) params.set('q', next.q)
          if (next.author) params.set('author', next.author)
          if (next.visibility) params.set('visibility', next.visibility)
          next.categories.forEach((category) => params.append('category', category))
          if (next.sort && next.sort !== EMPTY_FILTERS.sort) params.set('sort', next.sort)
          if (next.page > 0) params.set('page', String(next.page))
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return [filters, setFilters]
}
