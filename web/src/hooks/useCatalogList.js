import { useQuery } from '@tanstack/react-query'
import { areaKeys, listAreas } from '@/api/areas'
import { listSchools, schoolKeys } from '@/api/schools'
import { PAGE_SIZE } from '@/lib/constants'

/**
 * The data-fetching core shared by every catalogue listing: the main paginated query plus a
 * second, wider "category pool" query (deliberately without the category filter) so the category
 * picker keeps offering categories that would broaden the result set, not just the ones that
 * survived the current filter already narrowing things down.
 *
 * Pure data logic, no URL/input state - `filters` is whatever the caller already resolved (from
 * `useCatalogFilters` or otherwise). See `useCatalogQuery` for the version that also owns a
 * debounced search input, used by the three standalone catalogue pages.
 */
export function useCatalogList({ filters, listFn, queryKeyFn, extraFilters = {} }) {
  // Filters carry area *slugs* (readable URLs); the API takes ids. The area list is tiny and
  // globally cached, so resolving here costs nothing.
  const { data: areas } = useQuery({ queryKey: areaKeys.list(), queryFn: listAreas })
  const areaIds = (filters.areas ?? [])
    .map((slug) => areas?.find((area) => area.slug === slug)?.id)
    .filter(Boolean)

  // Schools are just as small and globally cached; resolving the slug here costs nothing either.
  const { data: schools } = useQuery({ queryKey: schoolKeys.list(), queryFn: listSchools })
  const schoolId = filters.school ? schools?.find((school) => school.slug === filters.school)?.id : undefined

  const query = { ...filters, areaIds, schoolId, ...extraFilters, size: PAGE_SIZE }
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeyFn(query),
    queryFn: () => listFn(query),
    placeholderData: (previous) => previous,
  })

  const categoryPoolQuery = {
    q: filters.q,
    author: filters.author,
    visibility: filters.visibility,
    areaIds,
    schoolId,
    ...extraFilters,
    sort: 'recent',
    page: 0,
    size: 100,
  }
  const { data: categoryPool } = useQuery({
    queryKey: queryKeyFn(categoryPoolQuery),
    queryFn: () => listFn(categoryPoolQuery),
    staleTime: 60_000,
  })
  const availableCategories = [
    ...new Set(categoryPool?.items.flatMap((item) => item.categories ?? []) ?? []),
  ]

  return { data, isPending, isError, error, refetch, availableCategories }
}
