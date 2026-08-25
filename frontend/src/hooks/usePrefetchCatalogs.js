import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { EMPTY_FILTERS } from '@/components/search/CatalogFilters'
import { useAuth } from '@/context/AuthContext'
import {
  courseKeys,
  lastAccessedCourse,
  listCourses,
  myCompletedCourses,
  myInProgressCourses,
} from '@/api/courses'
import { postKeys, listPosts } from '@/api/posts'
import {
  listTrilhas,
  myCompletedTrilhas,
  myFollowedTrilhas,
  trilhaKeys,
} from '@/api/trilhas'
import { search, searchKeys, searchUsers, userKeys } from '@/api/users'
import { libraryKeys, listFolders } from '@/api/library'
import { PAGE_SIZE } from '@/lib/constants'

// Matches the "Principais" tab's and the homepage's own preview size, so the prefetched query
// key is the exact one those screens request.
const PREVIEW_SIZE = 6

/**
 * Warms the react-query cache for the default (no filter, page 0) course/post/trilha/people lists,
 * the "Principais" unified-search preview, and (when logged in) the Biblioteca screen's sections,
 * as soon as the app boots. That way the first visit to any of those screens renders instantly
 * instead of showing a skeleton/spinner while the network round-trip happens.
 *
 * Fire-and-forget: a failed prefetch just means that screen falls back to its normal loading
 * state, nothing here is awaited or surfaced to the user.
 */
export function usePrefetchCatalogs() {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    const catalogQuery = { ...EMPTY_FILTERS, size: PAGE_SIZE }
    queryClient.prefetchQuery({ queryKey: courseKeys.list(catalogQuery), queryFn: () => listCourses(catalogQuery) })
    queryClient.prefetchQuery({ queryKey: postKeys.list(catalogQuery), queryFn: () => listPosts(catalogQuery) })
    queryClient.prefetchQuery({ queryKey: trilhaKeys.list(catalogQuery), queryFn: () => listTrilhas(catalogQuery) })

    const peopleQuery = { q: '', page: 0, size: PAGE_SIZE }
    queryClient.prefetchQuery({ queryKey: userKeys.search(peopleQuery), queryFn: () => searchUsers(peopleQuery) })

    queryClient.prefetchQuery({
      queryKey: searchKeys.unified('', PREVIEW_SIZE),
      queryFn: () => search('', PREVIEW_SIZE),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    // Prefetched without an area filter - the library screen itself always requests the current
    // area's variant, so this only warms the cache for a visitor who has not picked one yet.
    queryClient.prefetchQuery({ queryKey: courseKeys.lastAccessed(), queryFn: () => lastAccessedCourse() })
    queryClient.prefetchQuery({ queryKey: courseKeys.inProgress(), queryFn: () => myInProgressCourses() })
    queryClient.prefetchQuery({ queryKey: courseKeys.completed(), queryFn: () => myCompletedCourses() })
    queryClient.prefetchQuery({ queryKey: trilhaKeys.completed(), queryFn: () => myCompletedTrilhas() })
    queryClient.prefetchQuery({ queryKey: trilhaKeys.following(), queryFn: () => myFollowedTrilhas() })
    queryClient.prefetchQuery({ queryKey: libraryKeys.folders(), queryFn: () => listFolders() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])
}
