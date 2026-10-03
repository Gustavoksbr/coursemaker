import { useEffect, useState } from 'react'
import { useCatalogList } from '@/hooks/useCatalogList'
import { useDebounce } from '@/hooks/useDebounce'

/**
 * `useCatalogList` plus a debounced search input that writes into the URL's `q` - what each
 * standalone catalogue page (courses/posts/trilhas) needs, since each owns its own search bar.
 * The search page's tabs use `useCatalogList` directly instead: they share one search bar at the
 * page level, so they must not also debounce/write `q` themselves (see SearchPage.jsx).
 */
export function useCatalogQuery({ filters, setFilters, listFn, queryKeyFn, extraFilters }) {
  const [term, setTerm] = useState(filters.q)
  const debouncedTerm = useDebounce(term, 300)

  useEffect(() => {
    if (debouncedTerm !== filters.q) {
      setFilters({ ...filters, q: debouncedTerm, page: 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm])

  const list = useCatalogList({ filters, listFn, queryKeyFn, extraFilters })
  return { term, setTerm, ...list }
}
