import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { areaKeys, listAreas } from '@/api/areas'

const STORAGE_KEY = 'coursemaker.areaSlug'

function getStoredSlug() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function setStoredSlug(slug) {
  try {
    localStorage.setItem(STORAGE_KEY, slug)
  } catch {
    /* storage unavailable: the preference simply will not survive a reload */
  }
}

const AreaContext = createContext(null)

/**
 * Tracks the "preferred" area (persisted to localStorage) that pages without an `:areaSlug` in
 * their own route - the homepage, /users/:nickname, /mensagens - fall back to (e.g. to preselect
 * an area when creating content from there). Area-scoped pages instead resolve their area from
 * the URL itself; see `useCurrentArea`.
 */
export function AreaProvider({ children }) {
  const [preferredSlug, setPreferredSlugState] = useState(getStoredSlug)

  const setPreferredSlug = useCallback((slug) => {
    setPreferredSlugState(slug)
    setStoredSlug(slug)
  }, [])

  const value = useMemo(() => ({ preferredSlug, setPreferredSlug }), [preferredSlug, setPreferredSlug])

  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>
}

/**
 * Resolves "the area the user is in right now": the `:areaSlug` route param when the current page
 * is area-scoped, otherwise the persisted preference, otherwise the first area alphabetically -
 * the same fallback `AreaSelect` uses so a brand new visitor never sits on an empty selection.
 */
export function useCurrentArea() {
  const context = useContext(AreaContext)
  if (!context) {
    throw new Error('useCurrentArea precisa estar dentro de <AreaProvider>')
  }
  const { preferredSlug, setPreferredSlug } = context
  const { areaSlug } = useParams()

  const { data: areas } = useQuery({ queryKey: areaKeys.list(), queryFn: listAreas })

  const slug = areaSlug ?? preferredSlug
  const area = (areas?.find((candidate) => candidate.slug === slug) ?? areas?.[0]) || null

  // Whatever area a scoped page resolves to becomes the new preference, so switching areas while
  // browsing "sticks" for pages that have no area of their own (home, creating content from there).
  useEffect(() => {
    if (areaSlug && area && preferredSlug !== area.slug) {
      setPreferredSlug(area.slug)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaSlug, area?.slug])

  return { area, areas, setPreferredSlug }
}
