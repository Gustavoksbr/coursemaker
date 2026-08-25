import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { areaKeys, listAreas } from '@/api/areas'

/**
 * Wraps every `/:areaSlug/...` route. A slug that matches no known area (typo'd URL, or an area
 * that got deleted) sends the visitor home instead of rendering a page scoped to nothing - once
 * the area list has actually loaded, so this never fires while it's still in flight.
 */
export function AreaScopeGuard() {
  const { areaSlug } = useParams()
  const { data: areas } = useQuery({ queryKey: areaKeys.list(), queryFn: listAreas })

  if (areas && !areas.some((area) => area.slug === areaSlug)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
