import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { areaKeys, listAreas } from '@/api/areas'

const STORAGE_KEY = 'coursemaker.libraryAreaSlug'

function getStoredSlug() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function setStoredSlug(slug) {
  try {
    if (slug) localStorage.setItem(STORAGE_KEY, slug)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable: the preference simply will not survive a reload */
  }
}

const AreaContext = createContext(null)

/**
 * Holds the area the user last looked at *in their library*, persisted so the choice survives a
 * reload. This is the one place where separating areas genuinely helps - keeping philosophy and
 * programming courses apart in your own shelf. Public discovery is deliberately NOT area-scoped:
 * there, area is one filter among others (see `useCatalogFilters`).
 */
export function AreaProvider({ children }) {
  const [librarySlug, setLibrarySlugState] = useState(getStoredSlug)

  const setLibrarySlug = useCallback((slug) => {
    setLibrarySlugState(slug)
    setStoredSlug(slug)
  }, [])

  const value = useMemo(() => ({ librarySlug, setLibrarySlug }), [librarySlug, setLibrarySlug])

  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>
}

/**
 * The library's area filter: the full area list, the currently selected one (null = "all areas"),
 * and a setter. Selecting an area that no longer exists degrades to "all".
 */
export function useLibraryArea() {
  const context = useContext(AreaContext)
  if (!context) {
    throw new Error('useLibraryArea precisa estar dentro de <AreaProvider>')
  }
  const { librarySlug, setLibrarySlug } = context
  const { data: areas } = useQuery({ queryKey: areaKeys.list(), queryFn: listAreas })

  const area = librarySlug ? (areas?.find((candidate) => candidate.slug === librarySlug) ?? null) : null

  return { area, areas: areas ?? [], setLibrarySlug }
}
