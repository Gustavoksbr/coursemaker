/** Helpers shared by the course and post endpoints, which mirror each other. */

/** Builds the query string for the catalogue endpoints, dropping empty filters. */
export function listParams({ q, author, visibility, categories, featured, areaIds, schoolId, sort, page, size }) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (author) params.set('author', author)
  if (visibility) params.set('visibility', visibility)
  // Repeated `category`/`area` params: the backend ORs each set together.
  categories?.forEach((category) => params.append('category', category))
  areaIds?.forEach((areaId) => params.append('area', areaId))
  // Single-select, unlike area: content has at most one school.
  if (schoolId) params.set('school', schoolId)
  if (featured) params.set('featured', 'true')
  if (sort) params.set('sort', sort)
  if (page != null) params.set('page', String(page))
  if (size != null) params.set('size', String(size))
  return params
}
